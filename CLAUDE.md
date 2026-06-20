# 传家宝 · 项目状态（先读我）

> 每个开发窗口 AI 的入口，自动加载。**先读完这一页再动手。**
> 这里只放速览和指针；细节去 Obsidian `项目/传家宝` 翻，别一上来全读。
> 更新：2026-06-20

---

## 一句话

传家宝是用**结构化访谈**帮人把一生记录下来、整理成有温度的人生故事交付物的产品。
不是"卡片+录音工具"——那是已经要甩掉的旧形态。

**北极星（MVP 主线）：一次结构化访谈 → 转写 → AI 整理成章节故事 → 出一份交付物。**
先把这一条跑通、能收钱，其余访谈类型和价格漏斗都往这根脊梁上挂。

---

## ⚠️ 当前阶段：重写，不是改造

定论（2026-06-20 当当拍板要"大改"）：老代码是无状态单页录音卡，掰成新产品比重写还累。
做法是**搭干净新骨架 + 移植下面四样"器官"**，前端整套新做。**不要religiously 清空，也不要在 card.html 上叠**。

必须移植、别重造的四样：

| 器官 | 在哪 | 说明 |
|---|---|---|
| 问题库（自己版/长辈版/爬山版） | Obsidian `项目/传家宝/01_问题库` | 核心 IP，直接搬，别自己编 |
| AI 提示词（采访/追问/整理章节/家族基因） | 旧 `server.js`（路由 2/3/5） | 已对 cici 真实案例验证出活，尤其"禁止问心情/感觉、只问人事地物时间"那条铁律 |
| 转写+LLM 管道 | 旧 `server.js` | qwen-audio-turbo 转写 + qwen-plus 整理，跑通过 |
| 部署/OSS/pm2/边缘代理 | 见下「服务器」+ Obsidian 部署交接 | 基建照用 |

---

## 代码 / 技术栈

| 项 | 值 |
|---|---|
| 本地仓库 | `/Users/dang/Desktop/传家宝`（2026-06-20 从废纸篓抢救出来，git 历史完整） |
| GitHub | `https://github.com/dangxiaoshi/heirloom-tool.git`，`main` 已与本地同步 |
| 后端 | Node + Express，单文件 `server.js`，端口 3001 |
| 前端 | 纯 HTML，无框架、无构建（card/interview/tool.html + self-explorer/） |
| AI | 阿里 DashScope：`qwen-audio-turbo` 转写、`qwen-plus` 整理（同一个 `DASHSCOPE_API_KEY`） |
| 存储 | 音频→OSS 或本地 `data/audio`；文字稿/联系人→JSONL（`data/*.jsonl`） |
| 现有 API | `/api/health` `/api/transcribe` `/api/interview-start` `/api/interview-turn` `/api/interview-next` `/api/generate` `/api/contact` `/api/export` |

## 服务器和入口

| 项 | 信息 |
|---|---|
| ECS | 8.136.133.196（与金钱剪刀同一台） |
| SSH | `ssh -i ~/.ssh/money_scissors_ecs root@8.136.133.196` |
| 线上 | pm2 `heirloom` 跑 3001；`edge-proxy`(80) 把 `/heirloom/*` 和 `/api/*` 转到 3001，其余转金钱剪刀 3000 |
| HTTPS 入口 | 旧的是 Cloudflare quick tunnel 临时域名（重启即变），正式方向是 `chuanjiabao.vip` 备案后绑 |
| 线上目录 | `/opt/heirloom`，靠 rsync 从本地同步（不是 git pull） |

---

## 商业模型（决定要做成什么，背景看 Obsidian `00_产品策略/传家宝商业策略_冷爱咨询整理`）

- 两条路线：银发市场（9.9→980→2-3万）/ 自我探索市场（8800→2-3万），**一套后端、不同前端价格**
- 8800 标准课 = **7-10 次结构化访谈**：家谱图 / 罗曼史 / 时光轴 / 重点人物 / 优势测试(大五人格) / 创伤与死亡 / 爱的希望
- 付费主体 = 老人自己 或 自我探索者本人（**不是"子女买给父母"**，那个分离市场难成交）
- 避坑：不放八字等元素，保持严肃科学感；199 是尴尬价位别用

---

## 基本规则（铁律）

- **不能把"页面能打开/接口 200/本地模拟成功"当完成**。要真账号、真音频、真浏览器、真交付物验收。
- 一次改 3 个以上文件，先列清单等当当确认。
- 移动/重命名/删除文件前先说明；**禁止删用户文件**除非当当明说"删掉这个"。
- 部署只走 本地→服务器 一条路（rsync），禁止直接改服务器文件；动 `.env`/密钥/数据前先说明。
- `.env` 里有 `DASHSCOPE_API_KEY`，已 gitignore，**永远不要提交或外发**。
- 同一时间只做 `feature_list.json` 里一个 `in_progress` 任务，别同时开多个坑。

## 已知易错点 / 债

- 旧 `/api/export` 没鉴权，正式公开前必须加 token。
- 服务器当前没配 OSS key，音频走本地兜底；接 OSS 见 Obsidian 部署交接。
- multer 1.x 有安全告警，重写时直接上 2.x 或换方案。
- 旧 quick tunnel 临时域名会变，别写死在代码里。

---

## 开工流程（每轮 AI 照走）

1. 读本页 → 跑 `./init.sh` → 看 `progress.md` → 看 `feature_list.json` → `git log --oneline -5`
2. 只挑一个未完成任务（优先 `in_progress`，没有就挑最高优先级 `not_started`），太大先拆小
3. 写代码 → 跑验证（至少 `node --check server.js`，能跑就真起服务点一遍）
4. 收尾：更新 `progress.md` + `feature_list.json`（没 evidence 不准标 done），留下下一轮能接的现场
5. 重要进展同时 append 到 Obsidian `项目/传家宝/06_迭代日志/开发日记.md`

> 维护规则：每次有进展先更新本页"当前阶段"和 `progress.md`，让这页永远是最新现状的单一入口。
