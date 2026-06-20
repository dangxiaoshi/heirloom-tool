# 传家宝 · 进度交接 / 晨报

> 给「下一轮 AI / 当当回来验收」看的干净交接，不是流水账（日记在 Obsidian `06_迭代日志/开发日记.md`）。
> 每轮 agent 收尾必须更新这一页。配套：规则看 CLAUDE.md，任务状态看 feature_list.json，开工前先跑 ./init.sh。

---

## 最后更新

- 时间：2026-06-20
- 更新人：Claude（抢救代码 + 搭 harness 四件套）

## 现在是什么状态（一句话）

代码已从废纸篓救回到 `/Users/dang/Desktop/传家宝`，GitHub 已同步，harness 四件套已建好。
**还没开始重写**——下一步是当当确认 MVP 主线，然后从 `new-skeleton` 任务开干。

## 上一轮做了什么（2026-06-20）

1. **抢救代码**：真正的本地仓库原本在废纸篓 `/.Trash/Projects/heirloom-tool`（差点被 macOS 自动清空），已搬到 `/Users/dang/Desktop/传家宝`，git 历史完整。
2. **推 GitHub**：原本本地领先 GitHub 2 笔（`b944a48` 部署版、`596d88f` 自己版升级），已 `git push`，`main` 现与远端同步。确认只跟踪 `.env.example`，无密钥泄露。
3. **搭 harness 四件套**：`CLAUDE.md` / `init.sh` / `feature_list.json` / `progress.md`，已把"重写策略 + 要移植的四样器官 + 商业模型 + MVP 主线"写进去。

## 关键结论（重写决策）

- **重写，不是改造**：旧代码是无状态单页录音卡，掰成新产品比重写还累。
- 但**不清空**：移植四样器官——问题库(Obsidian)、AI 提示词、转写+LLM 管道、部署基建。
- **MVP 脊梁**：一次结构化访谈 → 转写 → AI 整理成章节 → 出一份交付物。先通这条再挂其余。

## 下一轮从哪接（按顺序）

1. ⏳ **等当当**：确认 MVP 主线（任务 `mvp-spine-confirm`）——选哪种访谈打头、交付物是网页还是 PDF、先做哪条市场前端。
2. 当当确认后：把 `new-skeleton` 转 `in_progress`，搭新工程骨架（先决定是否保持 Node+Express 单文件结构）。
3. 之后按 feature_list 的 blockedBy 顺序推进：导题库 → 移植管道 → 跑通一种访谈 → 交付物 → 部署。

## ⚠️ 风险 / 没验证的

- 还没跟线上 `/opt/heirloom` 做过 diff，**不确定本地(5/29)和服务器是否完全一致**。重写前可对一次账（线上是真身）。
- 旧 `/api/export` 无鉴权、服务器没配 OSS key、multer 1.x 有告警——重写时一并解决（已登记任务）。
- 旧 HTTPS 是 Cloudflare quick tunnel 临时域名，重启即变，别依赖。

## 健康状态

- 本地：`./init.sh` 跑一遍看（重写阶段 server 可能没起，正常）
- 线上：pm2 `heirloom` 端口 3001；公网入口依赖 tunnel/edge-proxy，需登服务器确认当前域名
