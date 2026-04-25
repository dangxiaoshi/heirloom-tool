# Heirloom Tool 1.0 项目结构建议

## 目标

1. 面向手机浏览器，完成抽卡提问、录音、上传、转写、留存。
2. 前后端都在一个仓库里，但代码按职责分层，避免继续堆在 `server.js` 和多个独立 HTML 里。
3. 先做 1.0 可上线版本，不一开始就过度微服务化。

## 技术约束

- 转录：阿里云语音能力
- 后端：Node.js
- 数据库：MySQL
- 部署：Docker

## 推荐形态

推荐使用“单仓库 + 前后端分目录 + 共享类型/配置”的结构：

```text
heirloom-tool/
  apps/
    web/                    # 前端，移动端 H5
      src/
        app/
          router/
          pages/
            home/
            onboarding/
            interview/
            transcript/
            memory/
          components/
            ui/
            card/
            recorder/
            transcript/
          hooks/
          services/         # 调后端 API
          stores/           # 会话、录音状态、当前卡片
          styles/
          types/
        public/
      package.json

    api/                    # 后端 API
      src/
        index.ts            # HTTP 入口
        app.ts              # express app 装配
        routes/
          health.route.ts
          session.route.ts
          recording.route.ts
          transcript.route.ts
          memory.route.ts
        controllers/
        services/
          interview/
          storage/
          transcription/
          memory/
        repositories/
        middleware/
        utils/
        config/
        db/
      package.json

  packages/
    shared/
      src/
        types/
        constants/
        prompts/
        schemas/
      package.json

  infra/
    docker/
    railway/

  docs/
    architecture-v1.md

  package.json
  pnpm-workspace.yaml
  Dockerfile
  railway.json
```

## 为什么这样拆

### `apps/web`

- 只负责用户交互。
- 核心页面建议固定为：
  - 首页：产品介绍、开始采访
  - 建档页：长辈姓名、关系、采访主题
  - 抽卡页：展示当前问题卡片
  - 录音页：录音、重录、上传中状态
  - 转写确认页：展示文字稿，允许用户确认
  - 留存页：查看本次采访记录

### `apps/api`

- 只负责业务 API。
- 重点不是“转录本身”，而是把“上传音频 -> 云存储 -> 异步/同步转写 -> 返回文本 -> 落库”这个链路做稳。

### `packages/shared`

- 放前后端都要用的东西。
- 比如：
  - TypeScript 类型：`InterviewSession`、`RecordingJob`、`TranscriptSegment`
  - 输入校验 schema：zod
  - 采访模块常量：童年、婚姻、迁徙、职业、家风
  - Prompt 模板

## 后端职责拆分

### 1. `session`

负责一次采访会话的生命周期。

- 创建采访会话
- 记录当前采访模块
- 保存提问历史
- 保存每轮回答摘要

建议数据模型：

```text
InterviewSession
- id
- elderName
- relation
- topic
- status            # active/completed
- startedAt
- completedAt
```

### 2. `recording`

负责音频文件本身。

- 接收浏览器上传
- 做格式和大小校验
- 上传到云对象存储
- 返回可追踪的 recording id

建议数据模型：

```text
Recording
- id
- sessionId
- questionId
- storageKey
- mimeType
- durationMs
- status            # uploaded/transcribing/done/failed
- createdAt
```

### 3. `transcription`

负责和云端转写服务交互。

- 从对象存储 URL 或二进制发给转写服务
- 获取文字稿
- 做基础清洗
- 回写 transcript

建议数据模型：

```text
Transcript
- id
- recordingId
- text
- language
- provider          # dashscope-paraformer / openai
- status
- createdAt
```

### 4. `memory`

负责留存和后续可读内容。

- 把问题、音频、文字稿绑定在一起
- 生成“家族记忆片段”
- 后续可以再扩展为“章节整理”“家风标签”“传家册生成”

建议数据模型：

```text
MemoryItem
- id
- sessionId
- question
- transcript
- summary
- audioUrl
- createdAt
```

## 推荐 API 设计

1. `POST /api/sessions`
创建采访会话。

2. `GET /api/sessions/:id`
读取采访会话详情。

3. `POST /api/sessions/:id/questions/next`
获取当前下一张问题卡。

4. `POST /api/recordings`
上传音频，创建 recording 记录。

5. `POST /api/recordings/:id/transcribe`
触发转写。

6. `GET /api/recordings/:id/transcript`
轮询转写结果。

7. `POST /api/memory-items`
保存一轮采访结果。

8. `GET /api/sessions/:id/memory-items`
查看本次采访留存。

## 1.0 最小数据流

```text
手机浏览器录音
-> 上传到 API
-> API 存到云对象存储
-> API 调转写服务
-> API 保存 transcript
-> API 返回文字稿给前端
-> 前端确认并保存为 memory item
```

1.0 建议优先走“同步转写”，因为实现快。

如果单段音频较长或云厂商接口响应慢，再切成：

```text
上传 -> 返回 recordingId -> 异步转写 -> 前端轮询 transcript
```

## 云端建议

### 对象存储

音频不要长期放本地磁盘。`uploads/` 只适合本地开发。

生产建议使用：

- 阿里云 OSS
- Cloudflare R2
- AWS S3

### 转写服务

既然你要用 DashScope Paraformer，建议把转写能力固定抽象成 provider：

```text
services/transcription/
  transcription.service.ts
  providers/
    dashscope-asr.provider.ts
```

业务层只认 `transcription.service`，不要在路由里直接调用云厂商接口。

### 数据库

1.0 直接上 MySQL。

原因：

- 会话、问题、转写稿、记忆片段是结构化数据
- 后面做后台管理、统计、导出都方便
- 和 Node.js、Prisma / Sequelize 的组合成熟
- Docker 本地联调简单

## 前端页面结构建议

### 页面

- `/` 首页
- `/start` 建立采访
- `/interview/:sessionId` 抽卡与录音
- `/review/:recordingId` 查看和确认文字稿
- `/memory/:sessionId` 浏览本次采访成果

### 组件

```text
components/
  card/
    QuestionCard.tsx
    ModuleCard.tsx
  recorder/
    RecorderButton.tsx
    RecorderTimer.tsx
    Waveform.tsx
    UploadState.tsx
  transcript/
    TranscriptPanel.tsx
    TranscriptEditor.tsx
  ui/
    Button.tsx
    Sheet.tsx
    Toast.tsx
```

### 前端状态

把状态分成三类：

- UI 状态：录音中、上传中、失败提示
- 会话状态：当前 session、当前卡片、当前轮次
- 服务端数据：录音记录、文字稿、memory items

不要把所有状态都塞在一个页面脚本里。

## 你当前仓库的迁移建议

当前仓库：

- `index.html`
- `card.html`
- `interview.html`
- `tool.html`
- `server.js`

建议迁移为：

```text
apps/web     <- 承接所有 html 交互
apps/api     <- 承接 server.js 里的接口和 AI 调用
packages/shared <- 承接 prompts / 类型 / 常量
```

### `server.js` 至少要拆出的模块

- `routes/transcript.route.ts`
- `routes/interview.route.ts`
- `services/transcription/dashscope.provider.ts`
- `services/interview/question.service.ts`
- `services/memory/memory.service.ts`

## 1.0 不要一开始做的事

- 不要拆成多个独立部署服务
- 不要先上消息队列
- 不要先做复杂权限系统
- 不要先做家谱图谱引擎
- 不要把“摘要、润色、章节生成、封面生成”全放进第一版主链路

先把主链路跑通：

`抽卡 -> 录音 -> 上传 -> 转写 -> 确认 -> 留存`

## 推荐技术栈

### 前端

- React + Vite
- TypeScript
- TanStack Query
- Zustand
- Tailwind 或 CSS Modules

### 后端

- Node.js + Express
- TypeScript
- Zod
- Prisma
- MySQL
- 对象存储 SDK

### 部署

- API 单独打包成 Docker 镜像
- MySQL 用独立容器或云数据库
- 音频文件不要存容器本地磁盘，存 OSS

推荐增加：

```text
infra/
  docker/
    api.Dockerfile
    docker-compose.yml
```

本地开发建议：

```yaml
services:
  api:
    build:
      context: .
      dockerfile: infra/docker/api.Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - mysql

  mysql:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: heirloom
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql

volumes:
  mysql-data:
```

## 1.0 里程碑

### M1 原型重构

- 建 monorepo 目录
- 前端迁到 `apps/web`
- 后端迁到 `apps/api`
- 跑通本地开发

### M2 采访链路

- 创建 session
- 抽卡提问
- 浏览器录音
- 上传音频
- 获取转写稿

### M3 留存链路

- 保存 transcript
- 保存 memory item
- 展示本次采访结果页

### M4 上线准备

- OSS/S3
- MySQL
- 环境变量管理
- 错误监控
- 基础埋点

## 一句话结论

你这个项目 1.0 最适合做成“单仓库的前后端分层单体应用”：

- 前端负责移动端采访体验
- 后端负责录音上传、OSS 存储、阿里云转写、留存
- 共享包负责类型、schema、prompt

先把结构拉开，再逐步把你现在的 `server.js + 多个 html` 平滑迁进去。

## 按你当前约束收敛后的建议

### 推荐目录

```text
heirloom-tool/
  apps/
    web/
    api/
      src/
        routes/
        controllers/
        services/
          transcription/
            transcription.service.ts
            providers/
              dashscope-asr.provider.ts
          storage/
            oss.service.ts
          memory/
          interview/
        repositories/
        db/
          prisma/
            schema.prisma
  packages/
    shared/
  infra/
    docker/
      api.Dockerfile
      docker-compose.yml
```

### 建议环境变量

```text
PORT=3000
NODE_ENV=production

DATABASE_URL=mysql://root:root@mysql:3306/heirloom

ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_OSS_BUCKET=
ALIYUN_OSS_REGION=

ALIBABA_CLOUD_SECURITY_TOKEN=
DASHSCOPE_API_KEY=
DASHSCOPE_API_ENDPOINT=https://dashscope.aliyuncs.com
DASHSCOPE_ASR_MODEL=paraformer-v2
```

### 1.0 最稳的后端链路

```text
浏览器录音
-> Node API 接收音频
-> 上传到阿里云 OSS
-> 调阿里云语音转写
-> 转写文本写入 MySQL
-> 返回 transcript 给前端
-> 前端确认后保存 memory item
```

### 设计原则

- Docker 容器无状态：本地磁盘只做临时文件
- MySQL 只存结构化元数据，不存大音频
- OSS 存原始音频
- 转写 provider 独立封装，避免以后换服务时重写路由
