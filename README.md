# Heirloom Tool

传家宝 1.0 项目骨架，面向移动端采访长辈、录音上传、DashScope Paraformer 异步转写与家族记忆留存。

## 目录

```text
apps/
  web/        React + Vite 移动端前端
  api/        Node.js + Express + Prisma + MySQL 后端
packages/
  shared/     前后端共享类型、常量、prompt
infra/
  docker/     Dockerfile 与 docker-compose
legacy/       旧版原型页面与单文件服务端
```

## 开发

```bash
pnpm install
pnpm dev:web
pnpm dev:api
```

## 转录方案

项目当前默认按 `bokegao.pdf` 的流程走 DashScope 文件转写：

- 本地录音先上传到项目 OSS 做留存。
- 同时上传到 DashScope 文件管理 OSS，转成 `oss://...` 内部地址供 ASR 使用。
- 通过 `paraformer-v2` 异步提交转写任务，默认开启 `zh,en`、去口语助词、说话人分离。
- 轮询任务完成后下载 `transcription_url` 对应的 JSON 结果。

运行 API 前至少需要配置：

```bash
DASHSCOPE_API_KEY=...
ALIYUN_ACCESS_KEY_ID=...
ALIYUN_ACCESS_KEY_SECRET=...
ALIYUN_OSS_BUCKET=...
ALIYUN_OSS_REGION=...
DATABASE_URL=...
```

## 设计说明

详细架构见 [docs/architecture-v1.md](./docs/architecture-v1.md)。
