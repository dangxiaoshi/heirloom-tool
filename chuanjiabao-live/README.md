# chuanjiabao-live — 线上站点快照

这是 **chuanjiabao.vip 线上实际运行版本**的完整独立快照，便于单独翻阅、对照、接着往下写。

- 来源：ECS `8.136.133.196:/opt/heirloom`（线上真身，不是过时本地版）
- 抓取时间：2026-06-22
- 已排除：`.env`(密钥)、`node_modules`、`data`、`uploads`、部署备份、`apps/`(零散未用 TS)

## 内容
| 文件 | 说明 |
|---|---|
| `index.html` | 线上 6/21 新版首页 |
| `interview.html` | 访谈页（6/6 更新） |
| `happiness-curve.html` | 幸福曲线页（内嵌主视觉） |
| `memory-options.html` | 「下一步」选择页 |
| `card.html` / `tool.html` | 录音卡 / 工具页 |
| `self-explorer/` | 自我探索者入口 |
| `server.js` | 后端（Express，端口 3001） |
| `assets/传家宝首页主视觉.png` | 首页主视觉 |

> ⚠️ 这是**只读快照**，不是部署源。真正的部署仍走仓库根目录 → rsync 到 `/opt/heirloom`。
> 改线上不要改这里，改根目录的文件。这份只为留底和方便后续写作梳理。
