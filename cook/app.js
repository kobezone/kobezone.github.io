const baseUrl = new URL('./', import.meta.url);
const BLURB = {
  vegetable_dish: '家常蔬菜',
  meat_dish: '下饭荤菜',
  aquatic: '鱼虾蟹贝',
  breakfast: '早晨第一餐',
  staple: '饭面饼粥',
  soup: '汤羹',
  drink: '茶饮特调',
  dessert: '收尾小点',
  'semi-finished': '冷冻与速食',
  condiment: '酱汁底料',
};

const app = document.querySelector('#app');
const searchInput = document.querySelector('#q');
const clearButton = document.querySelector('#clear');
const themeButton = document.querySelector('#theme');
const randomButton = document.querySelector('#random');
const snap = document.querySelector('#snap');

let catalog = null;
const recipeCache = new Map();
let renderToken = 0;
let lastScrollKey = '';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseRoute() {
  let raw = location.hash.replace(/^#/, '');
  if (raw === '/' || raw === '') raw = '';
  const params = new URLSearchParams(raw);
  return {
    r: params.get('r') || '',
    c: params.get('c') || '',
    q: params.get('q') || '',
  };
}

function buildHash({ r = '', c = '', q = '' } = {}) {
  const params = new URLSearchParams();
  if (r) params.set('r', r);
  if (c) params.set('c', c);
  if (q.trim()) params.set('q', q);
  const text = params.toString();
  return text ? `#${text}` : '#/';
}

function navigate(route, mode = 'push') {
  const hash = buildHash(route);
  const current = location.hash || '#/';
  if (current === hash) {
    render();
    return;
  }
  if (mode === 'replace') {
    history.replaceState(null, '', hash);
    render();
  } else {
    location.hash = hash;
  }
}

function categoryName(id) {
  return catalog?.categories.find((category) => category.id === id)?.name || id;
}

function filteredRecipes(route) {
  const parts = route.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return catalog.recipes.filter((recipe) => {
    if (route.c && recipe.category !== route.c) return false;
    if (!parts.length) return true;
    const name = recipe.title.toLowerCase().replace(/\s+/g, '');
    return parts.every((part) => name.includes(part.replace(/\s+/g, '')));
  });
}

function stars(count) {
  const n = Number(count) || 0;
  const on = '★'.repeat(Math.min(5, n));
  const off = '☆'.repeat(Math.max(0, 5 - Math.min(5, n)));
  const label = n ? `难度 ${n} 星，满分 5 星` : '未标难度';
  return `<span class="stars" aria-label="${label}"><span class="on">${on}</span><span class="off">${off}</span></span>`;
}

function recipeHref(recipe, route) {
  return buildHash({ r: recipe.id, c: recipe.category, q: route.q });
}

function chips(route) {
  const allOn = route.c ? '' : ' on';
  const items = catalog.categories.map((category) => {
    const on = category.id === route.c ? ' on' : '';
    return `<a class="chip${on}" href="${esc(buildHash({ c: category.id, q: route.q }))}">${esc(category.name)}</a>`;
  }).join('');
  return `<nav class="chips" aria-label="菜谱分类"><a class="chip${allOn}" href="${esc(buildHash({ q: route.q }))}">全部</a>${items}</nav>`;
}

function dishList(recipes, route) {
  if (!recipes.length) {
    if (!route.q.trim()) return '<p class="status">这个分类里还没有菜。</p>';
    const back = route.c
      ? `<a href="${esc(buildHash({ c: route.c }))}">看该分类全部</a>`
      : `<a href="#/">回首页</a>`;
    return `<p class="status">没有菜名包含「${esc(route.q.trim())}」。${back}</p>`;
  }
  const rows = recipes.map((recipe) => {
    const kcal = recipe.kcal ? `<span>${esc(recipe.kcal)}</span>` : '';
    const cat = route.c ? '' : `<span>${esc(categoryName(recipe.category))}</span>`;
    return `<li><a href="${esc(recipeHref(recipe, route))}"><span class="name">${esc(recipe.title)}</span><span class="dish-meta">${stars(recipe.difficulty)}${kcal}${cat}</span></a></li>`;
  }).join('');
  return `<ul class="dish-list">${rows}</ul>`;
}

function paintHome(route) {
  const cards = catalog.categories.map((category) => {
    const blurb = BLURB[category.id] || '';
    return `<a class="cat-card" href="${esc(buildHash({ c: category.id }))}"><span><strong>${esc(category.name)}</strong>${blurb ? `<small>${esc(blurb)}</small>` : ''}</span><span>${category.count} 道</span></a>`;
  }).join('');
  app.innerHTML = `
    <section class="hero">
      <h1>今天吃什么</h1>
      <p>按分类翻菜谱，或随机挑一道。字号偏大，方便在灶台边看。</p>
      <button class="primary" type="button" id="hero-random">随机一道菜</button>
    </section>
    <div class="cat-grid">${cards}</div>`;
  document.querySelector('#hero-random').addEventListener('click', pickRandom);
  document.title = '做饭指南';
}

function paintList(route) {
  const recipes = filteredRecipes(route);
  const total = route.c
    ? catalog.recipes.filter((recipe) => recipe.category === route.c).length
    : catalog.recipes.length;
  let heading = '全部菜谱';
  let detail = `${recipes.length} 道`;
  if (route.c && route.q.trim()) {
    heading = categoryName(route.c);
    detail = `含「${route.q.trim()}」· ${recipes.length} / ${total} 道`;
  } else if (route.c) {
    heading = categoryName(route.c);
    detail = `${recipes.length} 道`;
  } else if (route.q.trim()) {
    heading = `搜索「${route.q.trim()}」`;
    detail = `${recipes.length} 道`;
  }
  app.innerHTML = `
    ${chips(route)}
    <header class="list-head"><h1>${esc(heading)}</h1><p>${esc(detail)}</p></header>
    ${dishList(recipes, route)}`;
  document.title = `${heading} · 做饭指南`;
}

function bindChecks(root) {
  for (const list of root.querySelectorAll('.section-steps > ol')) {
    const start = Number(list.getAttribute('start') || '1');
    if (start > 1) list.style.counterReset = `step ${start - 1}`;
  }
  const items = root.querySelectorAll('.section-ingredients > ul > li, .section-ingredients > ol > li, .section-steps > ol > li');
  for (const item of items) {
    item.tabIndex = 0;
    item.setAttribute('role', 'checkbox');
    item.setAttribute('aria-checked', 'false');
    const toggle = () => {
      const done = !item.classList.contains('done');
      item.classList.toggle('done', done);
      item.setAttribute('aria-checked', done ? 'true' : 'false');
    };
    item.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      toggle();
    });
    item.addEventListener('keydown', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      toggle();
    });
  }
}

async function loadRecipe(id) {
  if (id.includes('..') || id.startsWith('/')) throw new Error('bad id');
  if (recipeCache.has(id)) return recipeCache.get(id);
  const url = new URL(`data/recipes/${id.split('/').map(encodeURIComponent).join('/')}.json`, baseUrl);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  recipeCache.set(id, data);
  return data;
}

function paintRecipe(data, route) {
  const backCategory = data.category || route.c;
  const backHref = buildHash({ c: backCategory, q: route.q });
  const backLabel = categoryName(backCategory);
  const kcal = data.kcal ? `<span class="pill">${esc(data.kcal)}</span>` : '';
  app.innerHTML = `
    <p class="back"><a href="${esc(backHref)}">← ${esc(backLabel)}</a></p>
    <header class="recipe-head">
      <h1>${esc(data.heading || data.title)}</h1>
      <div class="recipe-kicker">
        <a class="pill" href="${esc(buildHash({ c: backCategory }))}">${esc(backLabel)}</a>
        ${stars(data.difficulty)}
        ${kcal}
      </div>
    </header>
    <p class="hint">食材和步骤可以点按打勾，方便边做边看。</p>
    <article class="recipe">${data.html || ''}</article>
    <p class="source-row"><a href="${esc(data.sourceUrl)}" target="_blank" rel="noopener noreferrer">在 GitHub 查看原文</a></p>`;
  bindChecks(app);
  const title = data.title || data.heading || '菜谱';
  document.title = `${title} · 做饭指南`;
}

function pickRandom() {
  if (!catalog) return;
  const route = parseRoute();
  const pool = filteredRecipes({ ...route, r: '' });
  const source = pool.length ? pool : catalog.recipes;
  const choices = source.filter((recipe) => recipe.id !== route.r);
  const list = choices.length ? choices : source;
  if (!list.length) return;
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const recipe = list[buffer[0] % list.length];
  navigate({ r: recipe.id, c: recipe.category, q: route.q });
}

function syncChrome(route) {
  if (document.activeElement !== searchInput && searchInput.value !== route.q) {
    searchInput.value = route.q;
  }
  clearButton.hidden = !searchInput.value;
}

function updateThemeButton() {
  const theme = document.documentElement.dataset.theme || 'system';
  const label = theme === 'dark' ? '深色' : theme === 'light' ? '浅色' : '自动';
  themeButton.textContent = label;
  themeButton.setAttribute('aria-label', `外观：${label}。点按切换`);
}

async function render() {
  const token = ++renderToken;
  const route = parseRoute();
  syncChrome(route);
  const scrollKey = `${route.r}|${route.c}`;
  if (scrollKey !== lastScrollKey) {
    lastScrollKey = scrollKey;
    window.scrollTo(0, 0);
  }
  if (!catalog) return;
  if (route.r) {
    app.innerHTML = '<p class="status">正在打开菜谱…</p>';
    try {
      const data = await loadRecipe(route.r);
      if (token !== renderToken) return;
      paintRecipe(data, route);
    } catch {
      if (token !== renderToken) return;
      app.innerHTML = `<p class="status">没有找到这道菜。</p><p><a href="#/">回首页</a></p>`;
      document.title = '未找到 · 做饭指南';
    }
    return;
  }
  if (!route.c && !route.q.trim()) paintHome(route);
  else paintList(route);
}

function fillSnapshot() {
  const source = catalog.source || {};
  const commit = source.commit || '';
  const short = commit.slice(0, 7);
  const when = catalog.generatedAt
    ? new Date(catalog.generatedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const commitLink = commit
    ? `<a href="https://github.com/Anduin2017/HowToCook/commit/${esc(commit)}">${esc(short)}</a>`
    : '';
  snap.innerHTML = `数据快照 ${commitLink}${when ? ` · ${esc(when)}` : ''} · 共 ${catalog.recipes.length} 道`;
}

searchInput.addEventListener('input', () => {
  const route = parseRoute();
  clearButton.hidden = !searchInput.value;
  navigate({ c: route.c, q: searchInput.value }, 'replace');
});

document.querySelector('#search').addEventListener('submit', (event) => {
  event.preventDefault();
  searchInput.blur();
});

clearButton.addEventListener('click', () => {
  const route = parseRoute();
  searchInput.value = '';
  navigate({ c: route.c, q: '' }, 'replace');
  searchInput.focus();
});

randomButton.addEventListener('click', pickRandom);

themeButton.addEventListener('click', () => {
  const order = ['system', 'dark', 'light'];
  const current = document.documentElement.dataset.theme || 'system';
  const next = order[(order.indexOf(current) + 1) % order.length];
  try {
    if (next === 'system') localStorage.removeItem('cook-theme');
    else localStorage.setItem('cook-theme', next);
  } catch (error) {}
  if (next === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = next;
  updateThemeButton();
});

window.addEventListener('hashchange', render);
updateThemeButton();

const indexResponse = await fetch(new URL('data/index.json', baseUrl));
if (!indexResponse.ok) {
  app.innerHTML = '<p class="status">菜谱索引加载失败。</p>';
} else {
  catalog = await indexResponse.json();
  fillSnapshot();
  render();
}
