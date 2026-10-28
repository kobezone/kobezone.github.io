"use strict";

/**
 * FALLBACK_SITES 必须与 sites.json 的 sites 数组一致。
 * 线上以 sites.json 为准；用 file:// 打开时浏览器读不到旁边的 JSON，就用这里的副本。
 */
const FALLBACK_SITES = [
  {
    "id": "laotoule",
    "name": "老头乐",
    "desc": "休闲小游戏合集",
    "url": "/laotoule/",
    "icon": "🎮",
    "color": "#f08c00"
  },
  {
    "id": "filee",
    "name": "Filee",
    "desc": "文档与界面原型",
    "url": "/filee/",
    "icon": "📑",
    "color": "#4c6ef5"
  },
  {
    "id": "cook",
    "name": "做饭指南",
    "desc": "HowToCook 静态菜谱",
    "url": "/cook/",
    "icon": "🍳",
    "color": "#2f9e44"
  },
  {
    "id": "blog",
    "name": "JUN的博客",
    "desc": "博客首页",
    "url": "https://kobezone.github.io/",
    "icon": "📖",
    "color": "#1c7ed6"
  },
  {
    "id": "about",
    "name": "关于我",
    "desc": "博客关于页",
    "url": "/about/",
    "icon": "👋",
    "color": "#ae3ec9"
  },
  {
    "id": "photos",
    "name": "相册",
    "desc": "照片页",
    "url": "/photos/",
    "icon": "🖼️",
    "color": "#e64980"
  },
  {
    "id": "laotoule-cf",
    "name": "老头乐镜像",
    "desc": "Cloudflare，大陆访问更快",
    "url": "https://laotoule.pages.dev/",
    "icon": "☁️",
    "color": "#0b7285"
  }
];

const STORAGE_KEY = "kobezone-nav-v1";
const ENGINES = {
  baidu: { name: "百度", url: "https://www.baidu.com/s?wd=" },
  bing: { name: "必应", url: "https://www.bing.com/search?q=" },
  google: { name: "Google", url: "https://www.google.com/search?q=" }
};
const APPEARANCE_LABEL = { auto: "自动", light: "浅色", dark: "深色" };
const THEME_COLOR = { morning: "#f3ddcf", day: "#d7e6f2", dusk: "#e4c9c4", night: "#070b14" };
const TINTS = ["#f08c00", "#4c6ef5", "#2f9e44", "#1c7ed6", "#ae3ec9", "#e64980", "#0b7285", "#e67700", "#5f3dc4", "#0ca678"];
const EMOJIS = ["⭐", "🔖", "🐱", "🎵", "📺", "📰", "💼", "🛒", "✈️", "🏠", "💡", "🔧", "📌", "🎯", "📚", "🌟"];

let defaults = [];
let state = blankState();
let editMode = false;
let drag = null;
let formEditingId = null;
let confirmResolver = null;
let dialogReturn = null;
let toastTimer = 0;
let pendingScrollId = "";
let clockKey = "";

function $(id) {
  return document.getElementById(id);
}

function blankState() {
  return {
    version: 1,
    engine: "baidu",
    appearance: "auto",
    hiddenSiteIds: [],
    siteOrder: [],
    favorites: []
  };
}

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function sanitizeIcon(icon) {
  const text = String(icon || "").trim();
  if (!text || text.length > 16) return "";
  if (/[<>]/.test(text) || /^https?:/i.test(text)) return "";
  return text;
}

function sanitizeColor(color) {
  const text = String(color || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : "";
}

function isSafeUrl(url) {
  if (typeof url !== "string") return false;
  const text = url.trim();
  if (!text || text.length > 2000 || /\s/.test(text)) return false;
  if (text.startsWith("/") && !text.startsWith("//") && !text.startsWith("/\\")) return true;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function normalizeUserUrl(input) {
  let text = String(input || "").trim();
  if (!text || text.length > 2000 || /\s/.test(text)) return "";
  if (text.startsWith("/") && !text.startsWith("//") && !text.startsWith("/\\")) return text;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = "https://" + text;
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.href;
  } catch (error) {
    return "";
  }
}

function normalizeSites(data) {
  const list = Array.isArray(data) ? data : data && Array.isArray(data.sites) ? data.sites : [];
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const id = String(raw.id || "").trim().slice(0, 64);
    const name = String(raw.name || "").trim().slice(0, 40);
    const url = String(raw.url || "").trim();
    if (!id || !name || !isSafeUrl(url) || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id: id,
      name: name,
      desc: String(raw.desc || "").trim().slice(0, 80),
      url: url,
      icon: sanitizeIcon(raw.icon),
      color: sanitizeColor(raw.color)
    });
  }
  return out;
}

function normalizeFavorites(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const name = String(raw.name || "").trim().slice(0, 40);
    const url = normalizeUserUrl(raw.url);
    if (!name || !url) continue;
    let id = String(raw.id || "").trim().slice(0, 80);
    if (!id || seen.has(id)) id = uid();
    seen.add(id);
    out.push({ id: id, name: name, url: url, icon: sanitizeIcon(raw.icon) });
    if (out.length >= 300) break;
  }
  return out;
}

function uniqueStrings(list, limit) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    if (typeof item !== "string") continue;
    const text = item.trim().slice(0, 80);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeState(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const looks = data.version === 1 || Array.isArray(data.favorites) || Array.isArray(data.hiddenSiteIds) || Array.isArray(data.siteOrder);
  if (!looks) return null;
  return {
    version: 1,
    engine: ENGINES[data.engine] ? data.engine : "baidu",
    appearance: ["auto", "light", "dark"].includes(data.appearance) ? data.appearance : "auto",
    hiddenSiteIds: uniqueStrings(data.hiddenSiteIds, 100),
    siteOrder: uniqueStrings(data.siteOrder, 100),
    favorites: normalizeFavorites(data.favorites)
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankState();
    return normalizeState(JSON.parse(raw)) || blankState();
  } catch (error) {
    return blankState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    toast("无法保存，浏览器可能禁用了本地存储");
  }
}

function colorFor(id) {
  let hash = 0;
  const text = String(id || "");
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

function orderedDefaults(list, order) {
  const map = new Map(list.map((site) => [site.id, site]));
  const seen = new Set();
  const out = [];
  const sequence = order && order.length ? order : list.map((site) => site.id);
  for (const id of sequence) {
    const site = map.get(id);
    if (!site || seen.has(id)) continue;
    seen.add(id);
    out.push(site);
  }
  for (const site of list) {
    if (!seen.has(site.id)) out.push(site);
  }
  return out;
}

function siteSignature(list) {
  return JSON.stringify(list.map((site) => [site.id, site.name, site.desc, site.url, site.icon, site.color]));
}

function resolvedTheme(date) {
  if (state.appearance === "light") return "day";
  if (state.appearance === "dark") return "night";
  const hour = date.getHours();
  if (hour < 5 || hour >= 21) return "night";
  if (hour < 11) return "morning";
  if (hour < 17) return "day";
  return "dusk";
}

function greeting(date) {
  const hour = date.getHours();
  if (hour < 5) return "夜深了";
  if (hour < 11) return "早上好";
  if (hour < 13) return "中午好";
  if (hour < 18) return "下午好";
  if (hour < 22) return "晚上好";
  return "夜深了";
}

function formatDate(date) {
  const weeks = ["日", "一", "二", "三", "四", "五", "六"];
  return date.getFullYear() + "年" + (date.getMonth() + 1) + "月" + date.getDate() + "日 星期" + weeks[date.getDay()];
}

function formatClock(date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return hour + ":" + minute;
}

function paintChrome(date) {
  const now = date || new Date();
  const theme = resolvedTheme(now);
  const key = [now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), theme, state.appearance].join("-");
  document.documentElement.dataset.theme = theme;
  const themeColor = $("theme-color");
  if (themeColor) themeColor.setAttribute("content", THEME_COLOR[theme]);
  if (key === clockKey) return;
  clockKey = key;
  $("clock").textContent = formatClock(now);
  $("date").textContent = formatDate(now);
  $("greet").textContent = greeting(now);
}

function syncControls() {
  $("engine").value = state.engine;
  const themeButton = $("btn-theme");
  themeButton.textContent = APPEARANCE_LABEL[state.appearance];
  themeButton.title = "外观：" + APPEARANCE_LABEL[state.appearance] + (state.appearance === "auto" ? "（按时间切换清晨、白天、黄昏、夜晚）" : "");
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("show"), 2400);
}

function faviconSrc(url) {
  const normalized = normalizeUserUrl(url);
  if (!normalized || normalized.startsWith("/")) return "";
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.origin + "/favicon.ico";
  } catch (error) {
    return "";
  }
}

function fillPlate(plate, item) {
  const tint = item.color || colorFor(item.id || item.name);
  plate.style.setProperty("--tint", tint);
  plate.textContent = "";
  plate.classList.remove("letter");
  if (item.icon) {
    plate.textContent = item.icon;
    return;
  }
  const src = faviconSrc(item.url);
  if (!src) {
    plate.textContent = (item.name || "·").slice(0, 1);
    plate.classList.add("letter");
    return;
  }
  const img = document.createElement("img");
  img.alt = "";
  img.draggable = false;
  img.referrerPolicy = "no-referrer";
  img.decoding = "async";
  img.src = src;
  img.addEventListener("error", () => {
    img.remove();
    plate.textContent = (item.name || "·").slice(0, 1);
    plate.classList.add("letter");
  });
  plate.appendChild(img);
}

function createTile(item, options) {
  const el = document.createElement(editMode ? "div" : "a");
  el.className = "tile" + (options.hidden ? " is-hidden" : "");
  el.dataset.id = item.id;
  el.dataset.group = options.group;
  const tip = [item.desc, item.url].filter(Boolean).join(" · ");
  if (tip) el.title = tip;
  if (!editMode) {
    el.href = item.url;
  } else {
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", item.name + "，拖动可排序");
  }

  const plate = document.createElement("span");
  plate.className = "plate";
  plate.setAttribute("aria-hidden", "true");
  fillPlate(plate, item);

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = item.name;
  el.append(plate, name);

  if (options.hidden) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "已隐藏";
    el.appendChild(badge);
  }

  if (editMode) {
    const actions = document.createElement("span");
    actions.className = "tile-actions";
    if (options.group === "site") {
      const hide = document.createElement("button");
      hide.type = "button";
      hide.textContent = options.hidden ? "显示" : "隐藏";
      hide.setAttribute("aria-label", (options.hidden ? "显示" : "隐藏") + item.name);
      hide.addEventListener("click", () => toggleHidden(item.id));
      actions.appendChild(hide);
    } else {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "编辑";
      edit.setAttribute("aria-label", "编辑" + item.name);
      edit.addEventListener("click", () => openForm(item));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "danger-text";
      remove.textContent = "删除";
      remove.setAttribute("aria-label", "删除" + item.name);
      remove.addEventListener("click", () => deleteFavorite(item));
      actions.append(edit, remove);
    }
    actions.addEventListener("pointerdown", (event) => event.stopPropagation());
    el.appendChild(actions);
  }
  return el;
}

function createAddTile() {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "tile add-tile";
  el.setAttribute("aria-label", "添加网站");
  const plate = document.createElement("span");
  plate.className = "plate";
  plate.textContent = "+";
  plate.setAttribute("aria-hidden", "true");
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = "添加";
  el.append(plate, name);
  el.addEventListener("click", () => openForm(null));
  return el;
}

function render() {
  document.body.classList.toggle("editing", editMode);
  $("editbar").hidden = !editMode;
  const editButton = $("btn-edit");
  editButton.textContent = editMode ? "完成" : "编辑";
  editButton.setAttribute("aria-pressed", editMode ? "true" : "false");
  editButton.classList.toggle("primary", editMode);
  editButton.classList.toggle("ghost", !editMode);

  const siteGrid = $("site-grid");
  siteGrid.replaceChildren();
  const hidden = new Set(state.hiddenSiteIds);
  let shownSites = 0;
  for (const site of orderedDefaults(defaults, state.siteOrder)) {
    const isHidden = hidden.has(site.id);
    if (isHidden && !editMode) continue;
    shownSites += 1;
    siteGrid.appendChild(createTile(site, { group: "site", hidden: isHidden }));
  }
  if (!shownSites) {
    const note = document.createElement("div");
    note.className = "empty-note";
    const text = document.createElement("p");
    text.textContent = "本站入口都已隐藏。";
    const restore = document.createElement("button");
    restore.type = "button";
    restore.className = "ghost";
    restore.textContent = "恢复默认";
    restore.addEventListener("click", onReset);
    note.append(text, restore);
    siteGrid.appendChild(note);
  }

  const favGrid = $("fav-grid");
  favGrid.replaceChildren();
  $("fav-hint").textContent = state.favorites.length ? "" : "还没有收藏。点加号，把常去的网站放在这里。";
  for (const item of state.favorites) {
    favGrid.appendChild(createTile(item, { group: "fav", hidden: false }));
  }
  favGrid.appendChild(createAddTile());

  if (pendingScrollId) {
    const target = favGrid.querySelector('[data-id="' + CSS.escape(pendingScrollId) + '"]');
    pendingScrollId = "";
    if (target) target.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function setEditMode(on) {
  drag = null;
  editMode = on;
  render();
}

function toggleHidden(id) {
  const site = defaults.find((item) => item.id === id);
  const name = site ? site.name : "这项";
  const hidden = new Set(state.hiddenSiteIds);
  if (hidden.has(id)) {
    hidden.delete(id);
    toast("已显示「" + name + "」");
  } else {
    hidden.add(id);
    toast("已隐藏「" + name + "」");
  }
  state.hiddenSiteIds = [...hidden];
  saveState();
  render();
}

function openOverlay() {
  $("overlay").hidden = false;
  document.body.classList.add("modal-open");
}

function closeOverlay() {
  $("overlay").hidden = true;
  document.body.classList.remove("modal-open");
  $("panel-form").hidden = false;
  $("panel-confirm").hidden = true;
  $("dlg").setAttribute("aria-labelledby", "dlg-title");
  const back = dialogReturn;
  dialogReturn = null;
  if (back && typeof back.focus === "function") back.focus();
}

function updateFormPreview() {
  const typed = $("f-name").value.trim();
  const name = typed || "新网站";
  const icon = sanitizeIcon($("f-icon").value);
  const url = $("f-url").value.trim();
  $("form-preview-name").textContent = name;
  const plate = $("form-preview");
  if (!icon && !typed) {
    plate.textContent = "+";
    plate.classList.remove("letter");
    plate.classList.add("is-empty");
  } else {
    plate.classList.remove("is-empty");
    fillPlate(plate, {
      id: formEditingId || name,
      name: name,
      icon: icon,
      url: url,
      color: ""
    });
  }
  for (const button of $("emoji-picks").querySelectorAll("button")) {
    button.setAttribute("aria-pressed", button.textContent === icon ? "true" : "false");
  }
}

function openForm(existing) {
  dialogReturn = document.activeElement;
  formEditingId = existing ? existing.id : null;
  $("panel-form").hidden = false;
  $("panel-confirm").hidden = true;
  $("dlg").setAttribute("aria-labelledby", "dlg-title");
  $("dlg-title").textContent = existing ? "编辑收藏" : "添加网站";
  $("f-name").value = existing ? existing.name : "";
  $("f-url").value = existing ? existing.url : "";
  $("f-icon").value = existing ? existing.icon : "";
  $("form-error").textContent = "";
  $("btn-delete-form").hidden = !existing;
  updateFormPreview();
  openOverlay();
  $("f-name").focus();
}

function onSaveForm(event) {
  event.preventDefault();
  const name = $("f-name").value.trim();
  const url = normalizeUserUrl($("f-url").value);
  const icon = sanitizeIcon($("f-icon").value);
  if (!name) {
    $("form-error").textContent = "请填写名称";
    $("f-name").focus();
    return;
  }
  if (!url) {
    $("form-error").textContent = "请填写有效网址，例如 https://example.com";
    $("f-url").focus();
    return;
  }
  if (formEditingId) {
    const item = state.favorites.find((fav) => fav.id === formEditingId);
    if (item) {
      item.name = name.slice(0, 40);
      item.url = url;
      item.icon = icon;
    }
    toast("已保存");
  } else {
    const item = { id: uid(), name: name.slice(0, 40), url: url, icon: icon };
    state.favorites.push(item);
    pendingScrollId = item.id;
    toast("已添加");
  }
  formEditingId = null;
  saveState();
  closeOverlay();
  render();
}

async function deleteFavorite(item) {
  const ok = await askConfirm({
    title: "删除收藏",
    text: "确定删除「" + item.name + "」？只会影响这台浏览器。",
    okText: "删除",
    danger: true
  });
  if (!ok) return;
  state.favorites = state.favorites.filter((fav) => fav.id !== item.id);
  saveState();
  render();
  toast("已删除");
}

async function onDeleteEditing() {
  const item = state.favorites.find((fav) => fav.id === formEditingId);
  if (!item) return;
  const ok = await askConfirm({
    title: "删除收藏",
    text: "确定删除「" + item.name + "」？只会影响这台浏览器。",
    okText: "删除",
    danger: true
  });
  if (!ok) {
    openForm(item);
    return;
  }
  state.favorites = state.favorites.filter((fav) => fav.id !== item.id);
  formEditingId = null;
  saveState();
  render();
  toast("已删除");
}

function askConfirm(options) {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    if ($("overlay").hidden) dialogReturn = document.activeElement;
    $("panel-form").hidden = true;
    $("panel-confirm").hidden = false;
    $("confirm-title").textContent = options.title;
    $("confirm-text").textContent = options.text;
    $("dlg").setAttribute("aria-labelledby", "confirm-title");
    const ok = $("confirm-ok");
    ok.textContent = options.okText || "确定";
    ok.classList.toggle("danger", !!options.danger);
    ok.classList.toggle("primary", !options.danger);
    openOverlay();
    ok.focus();
  });
}

function settleConfirm(value) {
  const resolve = confirmResolver;
  confirmResolver = null;
  closeOverlay();
  if (resolve) resolve(value);
}

async function onReset() {
  const ok = await askConfirm({
    title: "恢复默认本站入口",
    text: "本站图标会全部重新显示，并回到默认顺序。你的收藏不会被清空。",
    okText: "恢复",
    danger: false
  });
  if (!ok) return;
  state.hiddenSiteIds = [];
  state.siteOrder = [];
  saveState();
  render();
  toast("已恢复本站入口");
}

function exportData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    engine: state.engine,
    appearance: state.appearance,
    hiddenSiteIds: state.hiddenSiteIds,
    siteOrder: orderedDefaults(defaults, state.siteOrder).map((site) => site.id),
    favorites: state.favorites
  };
  const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json" });
  const link = document.createElement("a");
  const href = URL.createObjectURL(blob);
  link.href = href;
  link.download = "kobezone-nav.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  toast("已导出");
}

async function onImportFile(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file) return;
  let data = null;
  try {
    data = JSON.parse(await file.text());
  } catch (error) {
    toast("这个文件不是有效的 JSON");
    return;
  }
  const next = normalizeState(data);
  if (!next) {
    toast("没认出导航数据，请使用本页导出的文件");
    return;
  }
  const ok = await askConfirm({
    title: "导入数据",
    text: "将用文件里的收藏、排序、隐藏和搜索引擎覆盖当前内容。",
    okText: "导入",
    danger: false
  });
  if (!ok) return;
  state = next;
  saveState();
  clockKey = "";
  syncControls();
  paintChrome();
  render();
  toast("已导入");
}

function searchDestination(query) {
  const text = query.trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) {
    try {
      const parsed = new URL(text);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
    } catch (error) {
      /* 当成关键词搜索 */
    }
  }
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(text)) return "https://" + text;
  const engine = ENGINES[state.engine] || ENGINES.baidu;
  return engine.url + encodeURIComponent(text);
}

function onSearch(event) {
  event.preventDefault();
  const target = searchDestination($("q").value);
  if (!target) {
    $("q").focus();
    return;
  }
  window.location.href = target;
}

function cycleAppearance() {
  const order = ["auto", "light", "dark"];
  const index = order.indexOf(state.appearance);
  state.appearance = order[(index + 1) % order.length];
  saveState();
  clockKey = "";
  syncControls();
  paintChrome();
}

function onPointerDown(event) {
  if (!editMode || (event.button !== undefined && event.button !== 0)) return;
  const tile = event.target.closest(".tile");
  if (!tile || !tile.dataset.id || event.target.closest("button")) return;
  const rect = tile.getBoundingClientRect();
  drag = {
    id: tile.dataset.id,
    group: tile.dataset.group,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    active: false,
    tile: tile,
    placeholder: null
  };
  tile.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.active) {
    if (Math.hypot(dx, dy) < 8) return;
    beginDrag();
  }
  event.preventDefault();
  drag.tile.style.left = event.clientX - drag.offsetX + "px";
  drag.tile.style.top = event.clientY - drag.offsetY + "px";
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  if (!hit) return;
  const over = hit.closest(".tile");
  const placeholder = drag.placeholder;
  if (over && over.dataset.group === drag.group && over.dataset.id && over !== drag.tile) {
    const rect = over.getBoundingClientRect();
    const placeAfter = event.clientX > rect.left + rect.width / 2;
    if (placeAfter) {
      if (over.nextElementSibling !== placeholder) over.after(placeholder);
    } else if (over.previousElementSibling !== placeholder) {
      over.before(placeholder);
    }
    return;
  }
  const add = hit.closest(".add-tile");
  if (add && drag.group === "fav" && add.previousElementSibling !== placeholder) add.before(placeholder);
}

function beginDrag() {
  const tile = drag.tile;
  const rect = tile.getBoundingClientRect();
  const placeholder = document.createElement("div");
  placeholder.className = "placeholder";
  placeholder.style.width = rect.width + "px";
  placeholder.style.height = rect.height + "px";
  tile.before(placeholder);
  drag.placeholder = placeholder;
  drag.active = true;
  tile.classList.add("is-dragging");
  tile.style.width = rect.width + "px";
  tile.style.height = rect.height + "px";
}

function onPointerUp(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const current = drag;
  drag = null;
  if (current.tile.hasPointerCapture && current.tile.hasPointerCapture(event.pointerId)) {
    current.tile.releasePointerCapture(event.pointerId);
  }
  if (!current.active) return;
  const grid = current.group === "site" ? $("site-grid") : $("fav-grid");
  const ids = [];
  for (const child of grid.children) {
    if (child === current.placeholder) ids.push(current.id);
    else if (child.dataset && child.dataset.id && child !== current.tile) ids.push(child.dataset.id);
  }
  if (current.group === "site") {
    state.siteOrder = ids.concat(defaults.map((site) => site.id).filter((id) => !ids.includes(id)));
  } else if (ids.length === state.favorites.length) {
    const map = new Map(state.favorites.map((item) => [item.id, item]));
    const next = ids.map((id) => map.get(id)).filter(Boolean);
    if (next.length === state.favorites.length) state.favorites = next;
  }
  saveState();
  render();
}

async function loadRemoteDefaults() {
  try {
    const response = await fetch("sites.json", { cache: "no-cache" });
    if (!response.ok) return;
    const sites = normalizeSites(await response.json());
    if (!sites.length || siteSignature(sites) === siteSignature(defaults)) return;
    if (drag) return;
    defaults = sites;
    render();
  } catch (error) {
    /* file:// 或离线时继续使用 FALLBACK_SITES */
  }
}

function bind() {
  $("btn-edit").addEventListener("click", () => setEditMode(!editMode));
  $("btn-done").addEventListener("click", () => setEditMode(false));
  $("btn-theme").addEventListener("click", cycleAppearance);
  $("btn-add").addEventListener("click", () => openForm(null));
  $("btn-export").addEventListener("click", exportData);
  $("btn-import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", onImportFile);
  $("btn-reset").addEventListener("click", onReset);
  $("search").addEventListener("submit", onSearch);
  $("engine").addEventListener("change", () => {
    state.engine = ENGINES[$("engine").value] ? $("engine").value : "baidu";
    saveState();
  });
  $("panel-form").addEventListener("submit", onSaveForm);
  $("btn-cancel-form").addEventListener("click", () => {
    formEditingId = null;
    closeOverlay();
  });
  $("btn-delete-form").addEventListener("click", onDeleteEditing);
  $("confirm-ok").addEventListener("click", () => settleConfirm(true));
  $("confirm-cancel").addEventListener("click", () => settleConfirm(false));
  $("overlay").addEventListener("click", (event) => {
    if (event.target !== $("overlay")) return;
    if (confirmResolver) settleConfirm(false);
    else {
      formEditingId = null;
      closeOverlay();
    }
  });
  $("f-name").addEventListener("input", updateFormPreview);
  $("f-url").addEventListener("input", updateFormPreview);
  $("f-icon").addEventListener("input", updateFormPreview);
  const picks = $("emoji-picks");
  for (const emoji of EMOJIS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = emoji;
    button.setAttribute("aria-label", "使用图标 " + emoji);
    button.addEventListener("click", () => {
      $("f-icon").value = $("f-icon").value === emoji ? "" : emoji;
      updateFormPreview();
    });
    picks.appendChild(button);
  }
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove, { passive: false });
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("overlay").hidden) {
      if (confirmResolver) settleConfirm(false);
      else {
        formEditingId = null;
        closeOverlay();
      }
      return;
    }
    if (editMode) setEditMode(false);
  });
  $("overlay").addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const nodes = [...$("overlay").querySelectorAll("button, input, select, textarea, a")].filter((el) => !el.hidden && el.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function init() {
  defaults = normalizeSites(FALLBACK_SITES);
  state = loadState();
  bind();
  syncControls();
  paintChrome();
  render();
  window.setInterval(() => paintChrome(), 1000);
  loadRemoteDefaults();
}

init();
