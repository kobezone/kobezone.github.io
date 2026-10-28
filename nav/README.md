# 导航页

地址：[https://kobezone.github.io/nav/](https://kobezone.github.io/nav/)

这是一个类似 iTab 的静态起始页。「本站」列出本仓库里的功能入口，「我的收藏」由访客自己添加，只存在这台浏览器的 localStorage 里。

## 如何加一个新的本站入口

编辑 `sites.json` 的 `sites` 数组，追加一项，例如：

```json
{
  "id": "demo",
  "name": "示例",
  "desc": "一句话说明",
  "url": "/demo/",
  "icon": "✨",
  "color": "#f08c00"
}
```

然后把**同一项**同步到 `app.js` 顶部的 `FALLBACK_SITES`。线上页面读 `sites.json`；直接双击打开 `index.html` 时，浏览器不允许再去读旁边的 JSON，会用这份内置列表。

`id` 用英文，发布后不要改。`url` 写站内路径（如 `/demo/`）或完整的 `http(s)` 地址。`icon` 是 emoji，`color` 是图标底色（`#` 加 6 位十六进制，可省略）。

本站入口在页面上可以隐藏、可以拖拽排序，不能删除。隐藏后点「恢复默认本站入口」会重新显示并回到默认顺序，不会清掉「我的收藏」。

`/jun/` 没有独立首页（只有图片和一篇旧文 `jun/ui`），所以没有放进默认列表。

## 本地预览

在仓库根目录执行：

```bash
python3 -m http.server 8765
```

打开 http://127.0.0.1:8765/nav/
