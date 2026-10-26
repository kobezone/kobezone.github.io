#!/usr/bin/env node
/**
 * Pull HowToCook dishes markdown and write cook/data for the static site.
 * Recipe prose is left intact (Unlicense). Images stay on the upstream commit.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const REPO_URL = 'https://github.com/Anduin2017/HowToCook.git';
const CATEGORY_NAMES = new Map([
  ['vegetable_dish', '素菜'],
  ['meat_dish', '荤菜'],
  ['aquatic', '水产'],
  ['breakfast', '早餐'],
  ['staple', '主食'],
  ['soup', '汤'],
  ['drink', '饮品'],
  ['dessert', '甜点'],
  ['semi-finished', '半成品加工'],
  ['condiment', '调料'],
]);

const here = path.dirname(fileURLToPath(import.meta.url));
const cookRoot = path.resolve(here, '..');
const dataDir = path.join(cookRoot, 'data');
const cacheDir = path.join(cookRoot, '.cache', 'HowToCook');

function git(args, cwd) {
  execFileSync('git', args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
}

function gitOut(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

async function walkMarkdown(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkMarkdown(full)));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

function resolveRepoPath(fromFile, href) {
  const raw = href.trim();
  if (!raw || /^(https?:|mailto:|data:|javascript:|#)/i.test(raw)) {
    return { kind: 'special', href: raw };
  }
  const hashAt = raw.indexOf('#');
  const beforeHash = hashAt >= 0 ? raw.slice(0, hashAt) : raw;
  const hash = hashAt >= 0 ? raw.slice(hashAt) : '';
  let pathname = beforeHash.split('?')[0];
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return { kind: 'bad' };
  }
  if (path.posix.isAbsolute(pathname)) return { kind: 'bad' };
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), pathname));
  if (resolved === '..' || resolved.startsWith('../')) return { kind: 'bad' };
  return { kind: 'repo', path: resolved, hash };
}

function githubUrl(commit, repoPath, mode) {
  const encoded = repoPath.split('/').map(encodeURIComponent).join('/');
  const host = mode === 'raw' ? 'https://raw.githubusercontent.com' : 'https://github.com';
  const middle = mode === 'raw' ? commit : `blob/${commit}`;
  return `${host}/Anduin2017/HowToCook/${middle}/${encoded}`;
}

function parseMeta(markdown) {
  const headingMatch = markdown.match(/^#\s+(.+)$/m);
  const heading = headingMatch ? headingMatch[1].trim() : '未命名';
  const title = heading.replace(/的做法$/, '').trim() || heading;
  const difficultyMatch = markdown.match(/预估烹饪难度：\s*([★☆]+)/);
  const difficulty = difficultyMatch ? (difficultyMatch[1].match(/★/g) || []).length : 0;
  const kcalMatch = markdown.match(/预估卡路里：\s*([^\n]+)/);
  const kcal = kcalMatch ? kcalMatch[1].trim() : '';
  return { heading, title, difficulty, kcal };
}

function normalizeListIndent(markdown) {
  // HowToCook nests notes under numbered steps with only two spaces.
  // CommonMark needs four spaces to keep that list inside the step.
  let fence = false;
  return markdown.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      return line;
    }
    if (!fence && /^  ([-*+]|\d+\.) /.test(line)) return `  ${line}`;
    return line;
  }).join('\n');
}

function stripBoilerplate(markdown) {
  let body = markdown.replace(/<!--[\s\S]*?-->/g, '');
  body = body.replace(/^#\s+[^\n]+\n?/, '');
  body = body.replace(/^\s*预估烹饪难度：[^\n]*\n?/m, '');
  body = body.replace(/^\s*预估卡路里：[^\n]*\n?/m, '');
  body = body.replace(
    /^[-*]?\s*如果您遵循本指南的制作流程而发现有问题或可以改进的流程，请提出 Issue 或 Pull request 。\s*$/gm,
    '',
  );
  return normalizeListIndent(body.trim());
}

function sectionKey(headingText) {
  const text = headingText.replace(/\s+/g, '');
  if (text.includes('原料') || text.includes('工具')) return 'ingredients';
  if (text.includes('计算')) return 'calc';
  if (text.includes('操作')) return 'steps';
  if (text.includes('附加')) return 'extra';
  return 'misc';
}

function wrapSections(html) {
  const pieces = html.split(/(?=<h2\b)/);
  const buckets = { intro: '', ingredients: '', calc: '', steps: '', extra: '', misc: [] };
  for (const piece of pieces) {
    if (!piece.trim()) continue;
    if (!piece.startsWith('<h2')) {
      buckets.intro += piece;
      continue;
    }
    const headingMatch = piece.match(/^<h2\b[^>]*>([\s\S]*?)<\/h2>/);
    const text = headingMatch ? headingMatch[1].replace(/<[^>]+>/g, '') : '';
    const key = sectionKey(text);
    const section = `<section class="section-${key}">${piece}</section>`;
    if (key === 'misc') buckets.misc.push(section);
    else buckets[key] = section;
  }
  const intro = buckets.intro.trim() ? `<div class="section-intro">${buckets.intro}</div>` : '';
  const side = [buckets.ingredients, buckets.calc].filter(Boolean).join('');
  return `${intro}<div class="cook-grid"><div class="cook-side">${side}</div>${buckets.steps}</div>${buckets.extra}${buckets.misc.join('')}`;
}

function createRenderer(commit, recipeIds, mdRepoPath) {
  const renderer = new marked.Renderer();
  renderer.html = ({ text }) => escapeHtml(text);
  renderer.image = function (token) {
    const alt = token.tokens
      ? this.parser.parseInline(token.tokens, this.parser.textRenderer)
      : (token.text || '');
    const resolved = resolveRepoPath(mdRepoPath, token.href || '');
    let src = '';
    if (resolved.kind === 'special' && /^https?:/i.test(resolved.href)) src = resolved.href;
    else if (resolved.kind === 'repo') src = githubUrl(commit, resolved.path, 'raw');
    if (!src) return escapeHtml(alt);
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${title} loading="lazy">`;
  };
  renderer.link = function (token) {
    const text = this.parser.parseInline(token.tokens);
    const resolved = resolveRepoPath(mdRepoPath, token.href || '');
    let href = token.href || '';
    let external = false;
    if (resolved.kind === 'special') {
      href = resolved.href;
      external = /^https?:/i.test(href);
      if (/^(javascript|data|vbscript):/i.test(href)) return text;
    } else if (resolved.kind === 'repo') {
      if (resolved.path.endsWith('.md')) {
        const id = resolved.path.replace(/^dishes\//, '').replace(/\.md$/, '');
        if (recipeIds.has(id)) href = `#r=${encodeURIComponent(id)}`;
        else href = githubUrl(commit, resolved.path, 'blob') + resolved.hash;
      } else {
        href = githubUrl(commit, resolved.path, 'blob') + resolved.hash;
      }
      external = href.startsWith('http');
    } else {
      return text;
    }
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
    const extra = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtml(href)}"${title}${extra}>${text}</a>`;
  };
  return renderer;
}

function renderRecipe(markdown, commit, recipeIds, mdRepoPath) {
  const html = marked.parse(stripBoilerplate(markdown), {
    gfm: true,
    renderer: createRenderer(commit, recipeIds, mdRepoPath),
  });
  return wrapSections(html).replace(/<p>\s*<\/p>/g, '');
}

async function cloneUpstream() {
  await rm(cacheDir, { recursive: true, force: true });
  await mkdir(path.dirname(cacheDir), { recursive: true });
  console.log('Cloning HowToCook dishes markdown…');
  git(
    ['clone', '--depth', '1', '--filter=blob:none', '--sparse', REPO_URL, cacheDir],
    cookRoot,
  );
  const ref = process.env.UPSTREAM_REF?.trim();
  if (ref) {
    console.log(`Fetching ${ref}…`);
    git(['fetch', '--depth', '1', 'origin', ref], cacheDir);
    git(['checkout', '--detach', 'FETCH_HEAD'], cacheDir);
  }
  git(['sparse-checkout', 'set', '--no-cone', 'dishes/**/*.md'], cacheDir);
  return gitOut(['rev-parse', 'HEAD'], cacheDir);
}

function assertBuild(index, recipes) {
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const required = [
    'vegetable_dish',
    'meat_dish',
    'aquatic',
    'breakfast',
    'staple',
    'soup',
    'drink',
    'dessert',
    'semi-finished',
  ];
  for (const id of required) {
    if (!index.categories.some((category) => category.id === id)) {
      throw new Error(`Missing category ${id}`);
    }
  }
  if (recipes.length < 300) throw new Error(`Too few recipes: ${recipes.length}`);
  if (recipes.some((recipe) => recipe.id.startsWith('template/'))) {
    throw new Error('Template recipe was included');
  }
  const egg = byId.get('vegetable_dish/西红柿炒鸡蛋');
  const greens = byId.get('vegetable_dish/白灼菜心/白灼菜心');
  const cake = byId.get('dessert/魔芋蛋糕/魔芋蛋糕');
  const pork = byId.get('meat_dish/红烧肉/南派红烧肉');
  if (!egg || !greens || !cake || !pork) throw new Error('Expected sample recipes are missing');
  for (const recipe of [egg, greens, cake]) {
    if (!recipe.html.includes('section-ingredients') || !recipe.html.includes('section-steps')) {
      throw new Error(`Sections missing in ${recipe.id}`);
    }
  }
  if (egg.html.includes('如果您遵循本指南的制作流程')) {
    throw new Error('Boilerplate was not removed');
  }
  if (!/去掉西红柿的外表皮<\/p>\s*<ul>/.test(egg.html)) {
    throw new Error('Nested step notes were not kept inside the numbered step');
  }
  if (!greens.html.includes(`raw.githubusercontent.com/Anduin2017/HowToCook/${index.source.commit}`)) {
    throw new Error('Local image was not rewritten to the upstream commit');
  }
  if (greens.html.includes('src="./')) throw new Error('Relative image src left in 白灼菜心');
  const cakeLink = `#r=${encodeURIComponent('dessert/戚风蛋糕/戚风蛋糕')}`;
  if (!cake.html.includes(cakeLink)) throw new Error('Internal recipe link was not rewritten');
  const sugarLink = `#r=${encodeURIComponent('condiment/简易版炒糖色')}`;
  if (!pork.html.includes(sugarLink)) throw new Error('Condiment link was not rewritten');
}

async function main() {
  const commit = await cloneUpstream();
  const dishesDir = path.join(cacheDir, 'dishes');
  const files = await walkMarkdown(dishesDir);
  const recipes = [];
  for (const file of files) {
    const rel = toPosix(path.relative(dishesDir, file));
    if (rel === 'template' || rel.startsWith('template/')) continue;
    const id = rel.replace(/\.md$/, '');
    if (id.split('/').includes('..')) continue;
    const markdown = await readFile(file, 'utf8');
    const meta = parseMeta(markdown);
    recipes.push({
      id,
      title: meta.title,
      heading: meta.heading,
      category: id.split('/')[0],
      difficulty: meta.difficulty,
      kcal: meta.kcal,
      sourceUrl: githubUrl(commit, `dishes/${rel}`, 'blob'),
      markdown,
      mdRepoPath: `dishes/${rel}`,
    });
  }
  const recipeIds = new Set(recipes.map((recipe) => recipe.id));
  for (const recipe of recipes) {
    recipe.html = renderRecipe(recipe.markdown, commit, recipeIds, recipe.mdRepoPath);
    delete recipe.markdown;
    delete recipe.mdRepoPath;
  }
  recipes.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));

  const counts = new Map();
  for (const recipe of recipes) counts.set(recipe.category, (counts.get(recipe.category) || 0) + 1);
  const known = [...CATEGORY_NAMES.keys()].filter((id) => counts.has(id));
  const extra = [...counts.keys()].filter((id) => !CATEGORY_NAMES.has(id)).sort();
  const categories = [...known, ...extra].map((id) => ({
    id,
    name: CATEGORY_NAMES.get(id) || id,
    count: counts.get(id),
  }));

  const index = {
    generatedAt: new Date().toISOString(),
    source: {
      project: 'HowToCook',
      repository: 'https://github.com/Anduin2017/HowToCook',
      license: 'Unlicense',
      commit,
      ref: process.env.UPSTREAM_REF?.trim() || 'master',
    },
    categories,
    recipes: recipes.map(({ id, title, category, difficulty, kcal }) => ({
      id,
      title,
      category,
      difficulty,
      kcal,
    })),
  };
  assertBuild(index, recipes);

  const tmpDir = path.join(dataDir, '.recipes-tmp');
  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir, { recursive: true });
  for (const recipe of recipes) {
    const file = path.join(tmpDir, ...recipe.id.split('/')) + '.json';
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(recipe));
  }
  const finalDir = path.join(dataDir, 'recipes');
  await rm(finalDir, { recursive: true, force: true });
  await rename(tmpDir, finalDir);
  await writeFile(path.join(dataDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);

  const summary = categories.map((category) => `${category.name} ${category.count}`).join('，');
  console.log(`${recipes.length} recipes @ ${commit.slice(0, 7)}`);
  console.log(summary);
  console.log('Wrote cook/data/index.json and cook/data/recipes/');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
