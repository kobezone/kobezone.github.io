# 做饭指南

纯静态菜谱站，给 GitHub Pages 用。合并到 `master` 后的地址：

https://kobezone.github.io/cook/

按分类浏览、按菜名搜索、打开菜谱详情，也可以随机挑一道。界面是中文，手机上字号偏大，方便在厨房里看。

菜谱正文来自 [Anduin2017/HowToCook](https://github.com/Anduin2017/HowToCook)（[Unlicense](https://unlicense.org/)）。本目录只保留浏览所需的 HTML / CSS / JS 和生成后的 JSON，不放入上游仓库的其他文件。

## 本地预览

在**仓库根目录**启动静态服务（不要用 `file://` 打开，浏览器会拦截 `fetch`）：

```bash
python3 -m http.server 8765
```

打开 http://127.0.0.1:8765/cook/

## 更新菜谱

脚本会浅克隆上游 `dishes/**/*.md`，转成 HTML，并写到 `data/index.json` 和 `data/recipes/`。图片仍引用该次 commit 的原始文件，不复制到本仓库。

```bash
cd cook
npm install
npm run update
```

默认跟踪上游默认分支。要固定某一次提交：

```bash
UPSTREAM_REF=5fb3140c20b2a713296696dc6fdd3b83ccc617a6 npm run update
```

生成完成后把 `data/` 的变化提交即可。页面底部会显示这次快照的 commit。

`dishes/template/` 是上游的写作模板，不会收进索引。新增的分类目录会自动出现；已知目录使用下面的中文名：

| 目录 | 名称 |
| --- | --- |
| `vegetable_dish` | 素菜 |
| `meat_dish` | 荤菜 |
| `aquatic` | 水产 |
| `breakfast` | 早餐 |
| `staple` | 主食 |
| `soup` | 汤 |
| `drink` | 饮品 |
| `dessert` | 甜点 |
| `semi-finished` | 半成品加工 |
| `condiment` | 调料 |

## 署名

菜谱文字属于 HowToCook 的贡献者，按 Unlicense 使用。请保留页面底部的仓库链接。站点外壳（页面、样式、更新脚本）随本仓库发布。
