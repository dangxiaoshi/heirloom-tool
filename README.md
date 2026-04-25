# Heirloom Tool

传家宝 1.0 项目骨架，面向移动端采访长辈、录音上传、阿里云转写与家族记忆留存。

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

## 设计说明

详细架构见 [docs/architecture-v1.md](./docs/architecture-v1.md)。
