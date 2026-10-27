// Render KnifeLemon/Filee docs into the static filee/ directory.
//
//   FILEE_SRC=/path/to/Filee FILEE_OUT=/path/to/filee node render.mjs
//
// Requires `marked` and `github-slugger` on NODE_PATH (marked@15, github-slugger@2).
// Upstream is a .NET desktop app: this publishes rendered docs, media, and the
// design mockup. It does not copy the C# tree.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import GithubSlugger from 'github-slugger';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const SCRIPT_SOURCE = fs.readFileSync(SCRIPT_PATH, 'utf8');

const SRC = process.env.FILEE_SRC || '/tmp/Filee';
const OUT = process.env.FILEE_OUT || '/workspace/filee';

const COMMIT = 'ccac2a579f24941078bd498d77b2bff2b3c21ba6';
const COMMIT_SHORT = COMMIT.slice(0, 8);
const COMMIT_DATE = '2026-10-28T07:37:00+09:00';
const COMMIT_DATE_TEXT = '2026-10-28 07:37 +0900';
const COMMIT_MESSAGE = 'Merge pull request #617 from KnifeLemon/claude/project-thread-6bzsdd';
const RELEASE_TAG = 'v2.1.0';
const RELEASE_COMMIT = 'e830916e7f02526bff6b7576edc22e51ecf9c126';
const RELEASE_PUBLISHED = '2026-10-24T23:30:48Z';
const UPSTREAM = 'https://github.com/KnifeLemon/Filee';
const ACCESS_CODE = 'HTQGP2E';

const LANGS = {
  'README.md': ['en', 'ltr', 'English'],
  'README.zh-CN.md': ['zh-CN', 'ltr', '简体中文'],
  'README.zh-TW.md': ['zh-TW', 'ltr', '繁體中文'],
  'README.ja.md': ['ja', 'ltr', '日本語'],
  'README.ko.md': ['ko', 'ltr', '한국어'],
  'README.es.md': ['es', 'ltr', 'Español'],
  'README.fr.md': ['fr', 'ltr', 'Français'],
  'README.pl.md': ['pl', 'ltr', 'Polski'],
  'README.hi.md': ['hi', 'ltr', 'हिन्दी'],
  'README.ru.md': ['ru', 'ltr', 'Русский'],
  'README.ar.md': ['ar', 'rtl', 'العربية'],
  'README.pt-BR.md': ['pt-BR', 'ltr', 'Português (Brasil)'],
  'README.pt-PT.md': ['pt-PT', 'ltr', 'Português (Portugal)'],
  'README.th.md': ['th', 'ltr', 'ไทย'],
};

const PROJECT_DOCS = [
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'THIRD-PARTY-NOTICES.md',
];

const TABLER_DIST = '/tmp/filee-build/node_modules/@tabler/icons-webfont';

let slugger = new GithubSlugger();
const renderer = new marked.Renderer();
renderer.heading = function (token) {
  const inner = this.parser.parseInline(token.tokens);
  const id = slugger.slug(token.text);
  return `<h${token.depth} id="${escapeAttr(id)}">${inner}</h${token.depth}>\n`;
};

function renderMarkdown(md) {
  slugger = new GithubSlugger();
  return marked.parse(md, { gfm: true, renderer });
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(value) {
  return escapeAttr(value).replace(/>/g, '&gt;');
}

function decodeAttr(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function dirOf(relFile) {
  const dir = path.posix.dirname(relFile);
  return dir === '.' ? '' : dir;
}

function relLink(fromFile, toFile) {
  const fromDir = path.posix.dirname(fromFile);
  const rel = path.posix.relative(fromDir, toFile);
  return rel === '' ? path.posix.basename(toFile) : rel;
}

function readCss() {
  const candidates = [
    path.join(SCRIPT_DIR, 'site.css'),
    path.join(OUT, 'site.css'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
  }
  throw new Error('site.css not found next to render.mjs or in the output directory');
}

const outputFiles = new Set();
const missing = [];
const githubLinks = [];

function outputTargetFor(upstreamRel) {
  if (upstreamRel.endsWith('.md')) return upstreamRel.slice(0, -3) + '.html';
  return upstreamRel;
}

function shouldVendor(upstreamRel) {
  if (upstreamRel === 'LICENSE') return true;
  if (upstreamRel.startsWith('docs/media/')) return true;
  if (upstreamRel.startsWith('docs/themes/') && upstreamRel.endsWith('.json')) return true;
  if (upstreamRel.endsWith('.txt')) return true;
  return false;
}

function ensureCopied(upstreamRel) {
  if (outputFiles.has(upstreamRel)) return;
  const src = path.join(SRC, upstreamRel);
  if (!fs.existsSync(src) || !fs.statSync(src).isFile()) return;
  const dest = path.join(OUT, upstreamRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  outputFiles.add(upstreamRel);
}

function rewriteUrl(rawUrl, fromFile) {
  const decoded = decodeAttr(rawUrl).trim();
  if (!decoded || decoded.startsWith('#') || decoded.startsWith('//')) return decoded;
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return decoded;

  const hashAt = decoded.indexOf('#');
  const hash = hashAt >= 0 ? decoded.slice(hashAt) : '';
  let pathPart = hashAt >= 0 ? decoded.slice(0, hashAt) : decoded;
  const queryAt = pathPart.indexOf('?');
  let query = '';
  if (queryAt >= 0) {
    query = pathPart.slice(queryAt);
    pathPart = pathPart.slice(0, queryAt);
  }
  if (!pathPart) return decoded;

  const joined = path.posix.normalize(path.posix.join(dirOf(fromFile), pathPart));
  if (joined.startsWith('../') || joined === '..') {
    missing.push(`${fromFile} -> ${decoded}`);
    return decoded;
  }

  const upstreamRel = joined;
  const published = outputTargetFor(upstreamRel);
  if (outputFiles.has(published)) {
    return relLink(fromFile, published) + query + hash;
  }
  if (shouldVendor(upstreamRel)) {
    ensureCopied(upstreamRel);
    if (outputFiles.has(upstreamRel)) {
      return relLink(fromFile, upstreamRel) + query + hash;
    }
  }

  const srcPath = path.join(SRC, upstreamRel);
  if (fs.existsSync(srcPath)) {
    const kind = fs.statSync(srcPath).isDirectory() ? 'tree' : 'blob';
    const url = `${UPSTREAM}/${kind}/${COMMIT}/${upstreamRel.split('/').map(encodeURIComponent).join('/')}${hash}`;
    githubLinks.push(`${fromFile} -> ${upstreamRel}`);
    return url;
  }

  missing.push(`${fromFile} -> ${decoded}`);
  return decoded;
}

function rewriteHtml(html, fromFile) {
  return html.replace(/(\s(?:href|src)\s*=\s*)(["'])([\s\S]*?)\2/gi, (match, pre, quote, value) => {
    const next = rewriteUrl(value, fromFile);
    return pre + quote + escapeAttr(next) + quote;
  });
}

function firstHeading(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (!match) return '';
  return match[1].replace(/`/g, '').trim();
}

function pageShell({ fromFile, lang, dir, title, description, banner, body }) {
  const css = relLink(fromFile, 'site.css');
  const icon = relLink(fromFile, 'favicon.svg');
  const home = relLink(fromFile, 'index.html');
  const english = relLink(fromFile, 'README.html');
  const docs = relLink(fromFile, 'docs.html');
  const mockup = relLink(fromFile, 'docs/design/mockup.html');
  const hosting = relLink(fromFile, 'hosting.html');
  const license = relLink(fromFile, 'LICENSE');
  const notices = relLink(fromFile, 'THIRD-PARTY-NOTICES.html');
  const snapshot = relLink(fromFile, 'snapshot.json');

  const slim = `<p class="slim" dir="ltr">静态快照 · <a href="${UPSTREAM}/tree/${COMMIT}">KnifeLemon/Filee</a> <code>${COMMIT_SHORT}</code> · 文档与界面原型 · 标识 <code>${ACCESS_CODE}</code> 上游未引用，打开页面不用输入 · <a href="${escapeAttr(hosting)}">部署说明</a></p>`;
  const full = `<aside class="notice" dir="ltr">
  <p>Filee 在你自己的电脑上转换文件。本页发布上游仓库里可静态打开的文档、截图和界面原型，地址是 <code>/filee/</code>。</p>
  <dl>
    <dt>来源</dt>
    <dd><a href="${UPSTREAM}">KnifeLemon/Filee</a>，默认分支 <code>main</code>，commit <a href="${UPSTREAM}/commit/${COMMIT}"><code>${COMMIT_SHORT}</code></a>（${COMMIT_DATE_TEXT}）</dd>
    <dt>发行版</dt>
    <dd>最新发行版 <a href="${UPSTREAM}/releases/tag/${RELEASE_TAG}">${RELEASE_TAG}</a>（<code>${RELEASE_COMMIT.slice(0, 7)}</code>）。安装包从 GitHub Releases 下载，本站不托管安装包。</dd>
    <dt>许可证</dt>
    <dd>MIT，© 2026 Myeonggu Kim (KnifeLemon) and Filee contributors。第三方组件见 <a href="${escapeAttr(notices)}">THIRD-PARTY-NOTICES</a>。</dd>
    <dt>标识 ${ACCESS_CODE}</dt>
    <dd>上游 README、配置和构建脚本没有引用 ${ACCESS_CODE}。打开本页不用输入它。该标识记在 <a href="${escapeAttr(hosting)}">部署说明</a> 和 <a href="${escapeAttr(snapshot)}">snapshot.json</a>，供这次部署对照。</dd>
  </dl>
</aside>`;

  const bannerHtml = banner === 'full' ? full : banner === 'slim' ? slim : '';
  const dirAttr = dir === 'rtl' ? ' dir="rtl"' : '';

  return `<!DOCTYPE html>
<html lang="${escapeAttr(lang)}"${dirAttr}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description)}">
<link rel="icon" href="${escapeAttr(icon)}" type="image/svg+xml">
<link rel="stylesheet" href="${escapeAttr(css)}">
</head>
<body>
<a class="skip" href="#content">跳到正文</a>
<div class="wrap">
<header class="top" dir="ltr">
  <a class="brand" href="${escapeAttr(home)}">
    <img src="${escapeAttr(icon)}" alt="" width="28" height="28">
    <span><strong>Filee</strong><small>静态文档 · /filee/</small></span>
  </a>
  <nav aria-label="站点">
    <a href="${escapeAttr(home)}">简体</a>
    <a href="${escapeAttr(english)}">English</a>
    <a href="${escapeAttr(docs)}">文档</a>
    <a href="${escapeAttr(mockup)}">界面原型</a>
    <a href="${escapeAttr(hosting)}">部署说明</a>
    <a href="${UPSTREAM}">上游</a>
    <a href="${UPSTREAM}/releases/latest">下载</a>
  </nav>
</header>
${bannerHtml}
<main class="doc" id="content">
${body}
</main>
<footer class="site-foot" dir="ltr">
  <p>文档文字与截图来自 <a href="${UPSTREAM}/tree/${COMMIT}">KnifeLemon/Filee</a> @ <code>${COMMIT_SHORT}</code>，MIT，© 2026 Myeonggu Kim (KnifeLemon) and Filee contributors。</p>
  <p>本页由 kobezone.github.io 按该快照静态发布。<a href="${escapeAttr(hosting)}">部署说明</a> · <a href="${escapeAttr(license)}">LICENSE</a> · <a href="${escapeAttr(notices)}">第三方声明</a></p>
</footer>
</div>
</body>
</html>
`;
}

function writePage(fromFile, html) {
  const dest = path.join(OUT, fromFile);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  outputFiles.add(fromFile);
}

function listMarkdown() {
  const files = [];
  for (const name of fs.readdirSync(SRC)) {
    if (name.startsWith('README') && name.endsWith('.md')) files.push(name);
  }
  for (const name of PROJECT_DOCS) files.push(name);
  const docsRoot = path.join(SRC, 'docs');
  const stack = ['docs'];
  while (stack.length) {
    const rel = stack.pop();
    for (const entry of fs.readdirSync(path.join(SRC, rel), { withFileTypes: true })) {
      const child = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) stack.push(child);
      else if (entry.name.endsWith('.md')) files.push(child);
    }
  }
  return files.sort();
}

function copyTree(relDir) {
  const srcDir = path.join(SRC, relDir);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = path.posix.join(relDir, path.relative(srcDir, abs).split(path.sep).join('/'));
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) ensureCopied(rel);
    }
  };
  walk(srcDir);
}

function writeFavicon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#3C3489"/>
  <circle cx="16" cy="16" r="11" fill="none" stroke="#E3E1FA" stroke-width="3.5"/>
  <circle cx="16" cy="16" r="3.2" fill="#AFA9EC"/>
</svg>
`;
  fs.writeFileSync(path.join(OUT, 'favicon.svg'), svg);
  outputFiles.add('favicon.svg');
}

function writeIcons() {
  const woff = path.join(TABLER_DIST, 'dist/fonts/tabler-icons.woff2');
  const license = path.join(TABLER_DIST, 'LICENSE');
  if (!fs.existsSync(woff) || !fs.existsSync(license)) {
    throw new Error('Tabler Icons package is missing. Install @tabler/icons-webfont@3 in /tmp/filee-build.');
  }
  const dir = path.join(OUT, 'assets/icons');
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(woff, path.join(dir, 'tabler-icons.woff2'));
  fs.copyFileSync(license, path.join(dir, 'LICENSE'));
  const css = `/* Tabler Icons 3.50.0, MIT, Copyright (c) 2020-2026 Paweł Kuna. See LICENSE. */
@font-face{font-family:"tabler-icons";font-style:normal;font-weight:400;src:url("./tabler-icons.woff2") format("woff2")}
.ti{font-family:"tabler-icons" !important;speak:none;font-style:normal;font-weight:normal;font-variant:normal;text-transform:none;line-height:1;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
.ti-circle-dashed:before{content:"\\ed27"}
.ti-player-play:before{content:"\\ed46"}
.ti-plus:before{content:"\\eb0b"}
.ti-drag-drop:before{content:"\\eb89"}
.ti-arrow-back-up:before{content:"\\eb77"}
.ti-arrows-sort:before{content:"\\eb5a"}
.ti-pencil:before{content:"\\eb04"}
.ti-grip-vertical:before{content:"\\ec01"}
`;
  fs.writeFileSync(path.join(dir, 'tabler-icons.css'), css);
  outputFiles.add('assets/icons/tabler-icons.woff2');
  outputFiles.add('assets/icons/LICENSE');
  outputFiles.add('assets/icons/tabler-icons.css');
}

function writeMockup() {
  const src = path.join(SRC, 'docs/design/mockup.html');
  let html = fs.readFileSync(src, 'utf8');
  const cssLink = 'href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3/dist/tabler-icons.min.css"';
  if (!html.includes(cssLink)) throw new Error('mockup.html icon stylesheet link changed upstream');
  html = html.replace(cssLink, 'href="../../assets/icons/tabler-icons.css"');
  const banner = `<style id="filee-pages-style">
.filee-pages-bar{font-family:system-ui,"Segoe UI","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif;font-size:14px;line-height:1.5;padding:10px 14px;margin:-24px -24px 20px;background:#E3E1FA;color:#1F1E1D}
.filee-pages-bar a{color:#3C3489;font-weight:600}
@media (prefers-color-scheme:dark){.filee-pages-bar{background:#2A2754;color:#F1EFE8}.filee-pages-bar a{color:#CECBF6}}
@media (max-width:860px){#fxed{grid-template-columns:1fr !important}#fxw{margin-inline:auto}body{padding:16px}.filee-pages-bar{margin:-16px -16px 16px}}
</style>
<div class="filee-pages-bar" dir="ltr">界面原型，可拖放圆环上的格式、调整顺序、编辑预设。<a href="../../index.html">返回文档</a> · <a href="../../hosting.html">部署说明</a> · <a href="${UPSTREAM}/blob/${COMMIT}/docs/design/mockup.html">上游源文件</a></div>
`;
  if (!html.includes('<body>')) throw new Error('mockup.html has no body tag');
  html = html.replace('<body>', '<body>\n' + banner);
  writePage('docs/design/mockup.html', html);
}

function writeSnapshot() {
  const snapshot = {
    name: 'Filee',
    source: UPSTREAM,
    defaultBranch: 'main',
    commit: COMMIT,
    commitDate: COMMIT_DATE,
    commitMessage: COMMIT_MESSAGE,
    latestRelease: {
      tag: RELEASE_TAG,
      commit: RELEASE_COMMIT,
      published: RELEASE_PUBLISHED,
    },
    license: 'MIT',
    copyright: '© 2026 Myeonggu Kim (KnifeLemon) and Filee contributors',
    build: {
      kind: 'static-snapshot',
      npmBuild: false,
      spa: false,
      basePath: '/filee/',
      notes: 'Upstream is a .NET desktop app. This directory publishes rendered documentation, screenshots, and the design mockup. In-site URLs are relative so GitHub Pages serves them under /filee/.',
    },
    accessCode: {
      value: ACCESS_CODE,
      usedByUpstream: false,
      howToUse: 'Upstream README, configuration, and build scripts do not reference HTQGP2E. Open /filee/ directly; the page has no prompt. The value is recorded here so this deployment can be matched to the supplied code.',
    },
  };
  fs.writeFileSync(path.join(OUT, 'snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
  outputFiles.add('snapshot.json');
}

function writeHosting() {
  const body = `<h1>部署说明</h1>
<p>这个目录把 <a href="${UPSTREAM}">KnifeLemon/Filee</a> 发布到 GitHub Pages 的 <code>/filee/</code>。</p>
<h2>怎么打开</h2>
<ul>
  <li>线上（合并到 <code>master</code> 之后）：<a href="https://kobezone.github.io/filee/">https://kobezone.github.io/filee/</a></li>
  <li>简体文档：<a href="index.html">index.html</a></li>
  <li>英文文档：<a href="README.html">README.html</a></li>
  <li>全部页面：<a href="docs.html">文档目录</a></li>
  <li>界面原型：<a href="docs/design/mockup.html">docs/design/mockup.html</a>。可以在浏览器里把格式拖到圆环上、调整顺序、编辑预设。</li>
  <li>桌面安装包：<a href="${UPSTREAM}/releases/latest">GitHub Releases</a>。本目录不放 exe、dmg 和压缩包。</li>
</ul>
<h2>本地预览</h2>
<p>在本仓库根目录启动静态服务，然后打开 <a href="http://127.0.0.1:8765/filee/">http://127.0.0.1:8765/filee/</a>。</p>
<pre><code>python3 -m http.server 8765</code></pre>
<h2>来源与版本</h2>
<ul>
  <li>仓库：<a href="${UPSTREAM}">https://github.com/KnifeLemon/Filee</a></li>
  <li>默认分支：<code>main</code></li>
  <li>本次快照：<a href="${UPSTREAM}/commit/${COMMIT}"><code>${COMMIT}</code></a>（${COMMIT_DATE_TEXT}）</li>
  <li>提交说明：${escapeHtml(COMMIT_MESSAGE)}</li>
  <li>最新发行版：<a href="${UPSTREAM}/releases/tag/${RELEASE_TAG}">${RELEASE_TAG}</a>，commit <code>${RELEASE_COMMIT}</code>（${RELEASE_PUBLISHED}）。文档快照取 <code>main</code>，比这个发行版新。</li>
</ul>
<h2>构建方式</h2>
<p>仓库用 .NET 构建桌面程序（<code>Filee.slnx</code>，<code>dotnet run --project src/Filee.App</code>）。根目录没有 <code>package.json</code>，发行附件是各系统安装包。可以在浏览器里直接打开的上游页面是 <code>docs/design/mockup.html</code>。</p>
<p>本目录发布各语言 README 和 <code>docs/</code> 的 HTML、截图、<code>docs/themes</code> 示例、许可证和界面原型。C# 源码、测试和安装脚本留在上游该 commit；文档里指向源码的链接打开 GitHub 上的对应文件。被 README 链接到的 <code>installer/linux/INSTALL.txt</code> 会一并放进本目录。</p>
<h2>子路径 /filee/</h2>
<p>文档页是多页 HTML，站内地址使用相对路径，例如 <code>docs/media/banner-zh-CN.jpg</code> 和 <code>../site.css</code>。页面放在 <code>/filee/</code> 时，浏览器向这个子路径请求资源。这里没有单页应用的路由 base，也没有把资源写成站点根路径 <code>/assets/...</code>。</p>
<h2>标识 ${ACCESS_CODE}</h2>
<p>这次部署收到的口令是 <code>${ACCESS_CODE}</code>。在上游 <code>${COMMIT_SHORT}</code> 的 README、配置和构建脚本里查找过访问码、房间码和构建参数，没有这个值，构建命令也不接收它。</p>
<p>打开 <code>/filee/</code> 直接进入文档，页面上没有输入框。${ACCESS_CODE} 记在本页和 <a href="snapshot.json">snapshot.json</a> 的 <code>accessCode</code> 字段，用来和这次部署对照。</p>
<h2>许可证与署名</h2>
<p>Filee 以 MIT 发布，© 2026 Myeonggu Kim (KnifeLemon) and Filee contributors。许可证全文在 <a href="LICENSE">LICENSE</a>。随附组件见 <a href="THIRD-PARTY-NOTICES.html">THIRD-PARTY-NOTICES</a>。</p>
<p>界面原型的图标来自 Tabler Icons 3.50.0（Paweł Kuna，MIT）。字体和许可证在 <a href="assets/icons/LICENSE">assets/icons/LICENSE</a>。这里只保留原型用到的图标类，字体文件用上游的 <code>tabler-icons.woff2</code>。</p>
<h2>重新生成</h2>
<p>脚本在 <code>tools/render.mjs</code>。准备好上游检出，并安装 <code>marked@15</code> 和 <code>github-slugger@2</code> 后运行：</p>
<pre><code>FILEE_SRC=/path/to/Filee FILEE_OUT=/path/to/filee node filee/tools/render.mjs</code></pre>
<p>本站的 <code>cook/</code> 和 <code>laotoule/</code> 不在这次发布的范围内。</p>
`;
  const html = pageShell({
    fromFile: 'hosting.html',
    lang: 'zh-CN',
    dir: 'ltr',
    title: '部署说明 · Filee',
    description: 'KnifeLemon/Filee 在 kobezone.github.io/filee/ 的静态文档快照、版本和标识 HTQGP2E 的说明。',
    banner: 'none',
    body,
  });
  writePage('hosting.html', html);
}

function writeDocsIndex(pages) {
  const groups = [
    ['语言', pages.filter((page) => page.group === 'lang')],
    ['项目文档', pages.filter((page) => page.group === 'docs')],
    ['社区与版本', pages.filter((page) => page.group === 'project')],
  ];
  const lists = groups.map(([label, items]) => {
    const lis = items.map((item) => `<li><a href="${escapeAttr(item.href)}">${escapeHtml(item.title)}<span>${escapeHtml(item.note)}</span></a></li>`).join('\n');
    return `<h2>${label}</h2>\n<ul class="catalog">\n${lis}\n</ul>`;
  }).join('\n');
  const body = `<h1>文档目录</h1>
<p>快照 <a href="${UPSTREAM}/commit/${COMMIT}"><code>${COMMIT_SHORT}</code></a>。界面原型在 <a href="docs/design/mockup.html">docs/design/mockup.html</a>。</p>
${lists}
<h2>其他文件</h2>
<ul class="catalog">
  <li><a href="hosting.html">部署说明<span>来源、预览、HTQGP2E</span></a></li>
  <li><a href="snapshot.json">snapshot.json<span>机器可读的版本信息</span></a></li>
  <li><a href="LICENSE">LICENSE<span>MIT</span></a></li>
  <li><a href="docs/design/mockup.html">界面原型<span>可拖放的圆环</span></a></li>
</ul>`;
  writePage('docs.html', pageShell({
    fromFile: 'docs.html',
    lang: 'zh-CN',
    dir: 'ltr',
    title: '文档目录 · Filee',
    description: 'Filee 静态文档快照的页面目录。',
    banner: 'slim',
    body,
  }));
}

function assertIncludes(file, needles) {
  const html = fs.readFileSync(path.join(OUT, file), 'utf8');
  for (const needle of needles) {
    if (!html.includes(needle)) throw new Error(`${file} is missing ${needle}`);
  }
}

function checkLocalUrls() {
  const htmlFiles = [...outputFiles].filter((file) => file.endsWith('.html'));
  const ids = new Map();
  const failures = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(OUT, file), 'utf8');
    const found = new Set();
    for (const match of html.matchAll(/\sid="([^"]*)"/g)) found.add(decodeAttr(match[1]));
    ids.set(file, found);
  }
  const filesToScan = [...outputFiles].filter((file) => file.endsWith('.html') || file.endsWith('.css'));
  for (const file of filesToScan) {
    const text = fs.readFileSync(path.join(OUT, file), 'utf8');
    const urls = [];
    if (file.endsWith('.html')) {
      for (const match of text.matchAll(/\s(?:href|src)\s*=\s*"([^"]*)"/g)) urls.push(decodeAttr(match[1]));
    } else {
      for (const match of text.matchAll(/url\(([^)]+)\)/g)) {
        urls.push(match[1].replace(/^['"]|['"]$/g, ''));
      }
    }
    for (const url of urls) {
      if (!url || url.startsWith('#') || url.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(url)) continue;
      const hashAt = url.indexOf('#');
      const hash = hashAt >= 0 ? url.slice(hashAt + 1) : '';
      let pathPart = hashAt >= 0 ? url.slice(0, hashAt) : url;
      const queryAt = pathPart.indexOf('?');
      if (queryAt >= 0) pathPart = pathPart.slice(0, queryAt);
      if (!pathPart) continue;
      const target = path.posix.normalize(path.posix.join(dirOf(file), pathPart));
      const abs = path.join(OUT, target);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        failures.push(`${file} missing ${url}`);
        continue;
      }
      if (hash && target.endsWith('.html')) {
        const decodedHash = decodeURIComponent(hash);
        if (!ids.get(target)?.has(decodedHash)) failures.push(`${file} missing #${decodedHash} in ${target}`);
      }
    }
  }
  return failures;
}

function main() {
  if (!fs.existsSync(path.join(SRC, 'README.md'))) {
    throw new Error(`FILEE_SRC does not look like Filee: ${SRC}`);
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'site.css'), readCss());
  outputFiles.add('site.css');
  writeFavicon();
  writeIcons();
  writeSnapshot();
  ensureCopied('LICENSE');
  copyTree('docs/media');
  copyTree('docs/themes');
  for (const name of fs.readdirSync(path.join(OUT, 'docs/themes'))) {
    if (name.endsWith('.md')) fs.rmSync(path.join(OUT, 'docs/themes', name));
  }
  outputFiles.delete('docs/themes/NOTICE.md');
  writeMockup();

  const catalog = [];
  const markdownFiles = listMarkdown();
  for (const file of markdownFiles) outputFiles.add(outputTargetFor(file));
  outputFiles.add('index.html');
  for (const file of markdownFiles) {
    const markdown = fs.readFileSync(path.join(SRC, file), 'utf8');
    const outFile = outputTargetFor(file);
    const heading = firstHeading(markdown);
    const langInfo = LANGS[file];
    const lang = langInfo ? langInfo[0] : 'en';
    const dir = langInfo ? langInfo[1] : 'ltr';
    const note = langInfo ? langInfo[2] : file;
    const title = heading ? `${heading} · Filee` : (langInfo ? `Filee · ${note}` : `Filee`);
    const description = langInfo
      ? `Filee documentation snapshot (${note}). Desktop file converter by KnifeLemon.`
      : `${heading || file} from KnifeLemon/Filee ${COMMIT_SHORT}.`;
    const banner = file === 'README.zh-CN.md' ? 'full' : 'slim';
    const body = rewriteHtml(renderMarkdown(markdown), outFile);
    const html = pageShell({ fromFile: outFile, lang, dir, title, description, banner, body });
    writePage(outFile, html);
    if (file === 'README.zh-CN.md') {
      writePage('index.html', pageShell({
        fromFile: 'index.html',
        lang, dir, title, description, banner,
        body: rewriteHtml(renderMarkdown(markdown), 'index.html'),
      }));
    }
    const group = file.startsWith('README') ? 'lang' : file.startsWith('docs/') ? 'docs' : 'project';
    catalog.push({ href: outFile, title: heading || note, note, group, file });
  }

  const langOrder = Object.keys(LANGS);
  catalog.sort((a, b) => {
    if (a.group !== b.group) return ['lang', 'docs', 'project'].indexOf(a.group) - ['lang', 'docs', 'project'].indexOf(b.group);
    if (a.group === 'lang') return langOrder.indexOf(a.file) - langOrder.indexOf(b.file);
    return a.href.localeCompare(b.href);
  });

  writeHosting();
  writeDocsIndex(catalog);

  assertIncludes('index.html', ['id="安装"', 'id="命令行"', 'id="开发"', 'docs/media/banner-zh-CN.jpg', ACCESS_CODE]);
  assertIncludes('README.html', ['id="code-signing-policy"', 'id="privacy-policy"', 'docs/media/banner-en.jpg']);
  assertIncludes('docs/ARCHITECTURE.html', ['id="whats-new-slides"', 'id="windows-installer"']);
  assertIncludes('docs/ENGINES.html', ['id="linux-builds-for-older-glibc"']);
  assertIncludes('README.zh-CN.html', ['README.html#code-signing-policy']);

  const failures = checkLocalUrls();
  if (missing.length || failures.length) {
    console.error('Unresolved links:');
    for (const item of missing) console.error('  src ' + item);
    for (const item of failures) console.error('  out ' + item);
    process.exit(1);
  }

  const toolsDir = path.join(OUT, 'tools');
  fs.mkdirSync(toolsDir, { recursive: true });
  fs.writeFileSync(path.join(toolsDir, 'render.mjs'), SCRIPT_SOURCE);
  fs.copyFileSync(path.join(SCRIPT_DIR, 'site.css'), path.join(toolsDir, 'site.css'));

  const bytes = [...outputFiles].reduce((sum, file) => {
    const abs = path.join(OUT, file);
    return sum + (fs.existsSync(abs) ? fs.statSync(abs).size : 0);
  }, 0);
  console.log(`Wrote ${outputFiles.size} files, ${bytes} bytes`);
  console.log(`GitHub links for unpublished sources: ${githubLinks.length}`);
  console.log(`Access code ${ACCESS_CODE} recorded; usedByUpstream=false`);
}

main();
