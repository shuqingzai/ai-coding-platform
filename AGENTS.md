# AGENTS.md

## Rules

- **所有代码注释、文档、AI 回复必须使用简体中文**
- **工作目录只能是当前目录，如需创建临时文件，请使用 `./tmp` 目录**
- **必须使用 `agent-browser` skill 进行测试**，不使用其他测试工具（如 playwright）。测试截图等资源传入 `./tmp/snapshots`，测试完成后必须删除。

## Quick start

- `pnpm dev` — 并行启动 server（`tsx watch`，端口 3001）+ web（Vite，端口 5173）
- `pnpm --filter server dev` / `pnpm --filter web dev` — 单独启动
- 复制 `.env.example` 到 `.env`，填入至少一个 AI 服务商的 API Key（如 `DEEPSEEK_API_KEY=sk-xxx`）
- Node.js ≥22, pnpm

## Architecture

- **pnpm workspace monorepo**: `apps/*` + `packages/*`（见 `pnpm-workspace.yaml`）
- **Server**: Hono 4（非 Express），入口 `apps/server/src/index.ts`，通过 `http.createServer` 手动适配
  - 开发命令：`tsx watch src/index.ts`（支持热重载）
  - 生产启动：`tsx src/index.ts`
- **Web**: React 19 + Vite 8 + Tailwind CSS v4，入口 `apps/web/src/App.tsx`
  - `API_BASE` 为空字符串，所有请求使用相对路径
  - Vite dev server 将 `/api`、`/ws`、`/health` 代理到 `http://localhost:3001`
- **packages/ai/**: AI SDK v6 网关 — 17 个官方 Provider + 自定义 Provider (OpenAI-compatible / Anthropic 协议) + Agent loop
  - `chatAgent()`: `streamText` + 12 tools (read/write/list/bash/grep/edit/glob/webfetch/todowrite/task/question/skill)，maxSteps=20，通过 WebSocket 流式转发
  - `callAI()`: 简单 `generateText()`，供 API 任务模式使用
  - 动态模型拉取：从 Provider API 获取最新模型列表（5 分钟内存缓存）
- **packages/tools/**: 文件 I/O（`fs/promises`，工作区路径保护）+ Shell 白名单（30 个命令，30s 超时）
- **packages/ 下的包均无 package.json**，通过相对路径导入（如 `../../packages/ai/gateway`），不要用 `@workspace/*` 或 `pnpm --filter <pkg>`

## 技术栈

- **AI**: AI SDK v6 (`ai` + 17 个 `@ai-sdk/*` Provider) + `zod` v4
- **Web UI**: React 19 + Vite 8 + Tailwind CSS v4 + **ai-elements** (48 组件) + Shiki (语法高亮) + lucide-react (图标)
- **Server**: Hono 4 + `ws` (WebSocket) + `diff` (IDE Diff) + i18next (国际化)
- **Shell**: 白名单 30 命令，30s 超时；文件 I/O 用 `fs/promises`，有工作区路径保护

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查，返回已配置的 Provider 列表 |
| GET | `/api/providers` | 全部服务商/模型 |
| GET | `/api/providers/:id/models` | 动态拉取指定服务商的最新模型列表 |
| POST | `/api/providers/custom` | 注册自定义服务商 |
| DELETE | `/api/providers/custom/:id` | 删除自定义服务商 |
| GET | `/api/files?path=` | 文件树（目录）或文件内容（文件） |
| POST | `/api/files` | 写入文件 `{ path, content }` |
| POST | `/api/run` | API 任务模式：planner → coder 两步流水线，返回 `{ plan, code }` |
| WS | `/ws/chat` | Agentic Chat 实时对话（见下方协议） |

## WebSocket 协议 (`/ws/chat`)

客户端发送：
```json
{ "type": "chat", "messages": [...], "provider": "deepseek", "model": "deepseek-chat", "apiKey": "sk-..." }
{ "type": "cancel" }
```

服务端返回（流式）：
```json
{ "type": "text-delta", "textDelta": "..." }
{ "type": "tool-call", "toolCallId": "...", "toolName": "writeFile", "args": {...} }
{ "type": "tool-result", "toolCallId": "...", "toolName": "writeFile", "result": "..." }
{ "type": "reasoning", "textDelta": "..." }
{ "type": "finish", "usage": { "promptTokens": 100, "completionTokens": 200 } }
{ "type": "error", "message": "..." }
```

注意：`cancel` 类型仅设置标志位，不会中止运行中的 `streamText()`（无 AbortController）。同一连接同一时间只处理一条消息，重复消息返回 error。

## Shell 白名单

`packages/tools/shell.ts` 中定义，仅首词检查：
`ls cat echo pwd node npm pnpm npx git tsc tsx mkdir touch cp mv rm python python3 tree find which curl grep rg head tail sed awk`

## Docker

```bash
cp .env.example .env && docker compose up -d
```
- Web: nginx 端口 80，代理 `/api/`、`/ws/`、`/health` 到 `server:3001`
- Server: node 端口 3001，`pnpm --filter server start`

## 包配置注意事项

- **无 lint/format/test 脚本**，不要尝试运行它们
- **tsconfig.base.json** 存在，但各子包可能无独立 tsconfig
- **Custom Provider 为内存存储**，重启即丢失
- **`WORKSPACE_ROOT`** 环境变量控制工作区根目录（默认 `./workspace`）