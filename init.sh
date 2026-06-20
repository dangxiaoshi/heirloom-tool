#!/usr/bin/env bash
# 传家宝 · 开工前自检
# 每轮 AI / 当当 开工前先跑一遍，确认环境健康、知道现在该接哪一步。
# 报告式：每项打 ✓/✗ 但不中断，最后给一句总结。
# 只做只读检查（版本、语法、依赖、health），不改任何东西、不部署、不 SSH。

cd "$(dirname "$0")" || exit 1
ROOT="$(pwd)"
ok="✓"; bad="✗"; warn="·"

echo "=================================================="
echo " 传家宝 开工自检   $(date '+%Y-%m-%d %H:%M:%S')"
echo " 仓库根：$ROOT"
echo "=================================================="

# 1) node
if command -v node >/dev/null 2>&1; then
  echo "$ok node $(node --version)"
else
  echo "$bad node 没装，后端检查跳过"
fi

# 2) server.js 语法（坏了别在坏代码上叠）
if [ -f "$ROOT/server.js" ] && command -v node >/dev/null 2>&1; then
  if node --check "$ROOT/server.js" 2>/dev/null; then
    echo "$ok server.js 语法 OK"
  else
    echo "$bad server.js 语法报错 —— 先修语法再开工"
  fi
else
  echo "$warn 没找到 server.js（重写阶段可能还没建，正常）"
fi

# 3) 依赖装了没
if [ -d "$ROOT/node_modules" ]; then
  echo "$ok node_modules 在"
else
  echo "$warn node_modules 不在，开发前先 npm install"
fi

# 4) .env 有没有 DASHSCOPE_API_KEY（不打印值）
if [ -f "$ROOT/.env" ] && grep -q "^DASHSCOPE_API_KEY=" "$ROOT/.env" 2>/dev/null; then
  echo "$ok .env 里有 DASHSCOPE_API_KEY"
else
  echo "$warn .env 缺 DASHSCOPE_API_KEY，转写/AI 会启动即退出"
fi

# 5) git 现状
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch=$(git branch --show-current 2>/dev/null)
  ahead=$(git status -sb 2>/dev/null | head -1)
  dirty=$(git status -s 2>/dev/null | wc -l | tr -d ' ')
  echo "$ok git 分支 $branch（未提交改动 $dirty 个）"
  echo "   $ahead"
else
  echo "$warn 不是 git 仓库"
fi

# 6) 本地 server 在跑吗（只看，不启）
if command -v curl >/dev/null 2>&1; then
  if curl -s -m 2 http://localhost:3001/api/health 2>/dev/null | grep -q '"ok":true'; then
    echo "$ok 本地 3001 health OK（server 正在跑）"
  else
    echo "$warn 本地 3001 没响应（要测就先 npm start）"
  fi
fi

echo "--------------------------------------------------"
echo " 下一步看 feature_list.json 里 in_progress 的任务；"
echo " 没有 in_progress 就挑最高优先级 not_started。"
echo " 交接现状看 progress.md。"
echo "=================================================="
