# AI Coding Platform

基于 AI SDK v6 的全功能 AI 编程平台，支持多 AI 服务商接入、Agentic Coding、WebIDE 和 API 协议兼容。

## 特性

- **多 AI 服务商支持**: 18 个官方 Provider (OpenAI、Anthropic、Google AI、Vertex AI、Mistral、Cohere、AWS Bedrock、Azure OpenAI、DeepSeek、Groq、xAI Grok、Together AI、Perplexity、Fireworks AI、DeepInfra、Cerebras、Moonshot AI、通义千问) + 自定义 Provider
- **Agentic Coding**: 16 个内置工具，完全对齐 OpenCode 工具集 (bash/read/write/edit/grep/glob/apply_patch/skill/todowrite/webfetch/websearch/question/task/lsp/plan/invalid)
- **WebIDE**: 文件递归展开/折叠、语法高亮 (Shiki)、Diff 差异展示、终端面板、暗黑/光亮主题切换
- **AI Chat**: 实时流式对话，工具调用 7 状态可视化，推理过程折叠（灰色斜体，与回复明显区分），Markdown 渲染，消息操作 (复制)
- **elements.ai 组件**: 全面使用 ai-elements 组件库 (48 个组件) — Conversation/Message/Tool/Reasoning/Terminal/PromptInput/CodeBlock/FileTree/Queue/Plan 等
- **WS 协议对齐 AI SDK**: 完整实现 AI SDK UI Stream Protocol v1 全部 14 类事件 (start/text/reasoning/tool/step 五阶段流、abort/done)
- **Todo 实时推送**: AI 调用 todowrite 后通过 WebSocket 实时推送任务列表到前端 Queue 组件
- **Web 搜索**: DuckDuckGo 实时搜索 (5 分钟缓存)，AI 可获取最新信息
- **API 兼容**: 同时提供 Anthropic Messages API (`/v1/messages`) 和 OpenAI Responses API (`/v1/responses`)
- **动态模型拉取**: 自动从服务商 API 获取最新模型列表 (5 分钟缓存)
- **暗黑/光亮主题**: 支持三种模式 (跟随系统/浅色/暗黑)，CSS 变量驱动，无 FOUC
- **AGENTS.md 注入**: 自动扫描工作区 AGENTS.md 规则注入 AI System Prompt (深度 3)
- **SKILL 加载**: AI 可通过 `skill` 工具加载 `.agents/skills/` 目录下的 SKILL 完整指令

## 技术栈

- **Server**: Hono 4 + WebSocket (ws) + Node.js HTTP
- **Web**: React 19 + Vite 8 + Tailwind CSS v4 + ai-elements + Shiki
- **AI**: AI SDK v6 (`ai` + 18 个 `@ai-sdk/*` Provider)
- **国际化**: i18next + react-i18next
- **其他**: Zod v4, diff, lucide-react, Streamdown

## 快速开始

### 前提

- Node.js ≥ 22
- pnpm

### 安装和运行

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入至少一个 AI 服务商的 API Key
# 例如: DEEPSEEK_API_KEY=sk-xxx

# 启动开发服务器
pnpm dev
# Server: http://localhost:3001
# Web: http://localhost:5173
```

### 快速测试

```bash
# 检查 Server 健康状态
curl http://localhost:3001/health

# 获取服务商列表
curl http://localhost:3001/api/providers

# 获取 DeepSeek 模型列表
curl http://localhost:3001/api/providers/deepseek/models

# 通过 Anthropic 协议调用 (非流式)
curl -X POST http://localhost:3001/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'

# 通过 OpenAI Responses 协议调用 (非流式)
curl -X POST http://localhost:3001/v1/responses \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","input":"Hello"}'
```

## 项目结构

```
ai-coding-platform/
├── apps/
│   ├── server/          # Hono HTTP + WebSocket 服务端
│   │   └── src/
│   │       ├── index.ts       # 入口
│   │       ├── app.ts         # Hono 应用 + 路由挂载
│   │       ├── routes/        # API 路由
│   │       │   ├── health.ts        # GET /health
│   │       │   ├── providers.ts     # 服务商/模型管理
│   │       │   ├── files.ts         # 文件 I/O API
│   │       │   ├── run.ts           # API 任务模式
│   │       │   ├── messages.ts      # Anthropic Messages API
│   │       │   └── responses.ts     # OpenAI Responses API
│   │       ├── ws/            # WebSocket /ws/chat
│   │       └── lib/           # 工具函数
│   └── web/             # React 前端 (ai-elements)
│       └── src/
│           ├── App.tsx        # 根组件
│           ├── components/    # UI 组件
│           │   ├── chat/      # 聊天面板
│           │   ├── ide/       # IDE 面板 (文件/代码/Diff)
│           │   ├── layout/    # 布局 (TopBar)
│           │   ├── task/      # API 任务模式
│           │   ├── providers/ # 服务商管理
│           │   ├── ai-elements/ # 48 个 ai-elements 组件
│           │   └── ui/        # shadcn/ui 基础组件
│           ├── hooks/         # React Hooks
│           └── i18n/          # 国际化资源
├── packages/
│   ├── ai/              # AI 网关核心
│   │   ├── providers.ts # Provider 注册表 (18 官方 + 自定义)
│   │   ├── chat.ts      # Agentic 循环 (6 tools + streamText)
│   │   ├── router.ts    # 简单文本生成
│   │   ├── context.ts   # AGENTS.md/SKILL 扫描加载
│   │   └── types.ts     # 类型定义
│   └── tools/           # 工具定义+实现 (16 个 OpenCode 对齐工具)
│       ├── types.ts      # ToolDef / ToolContext / ToolExecuteResult
│       ├── registry.ts   # 统一注册表
│       ├── context.ts    # 执行上下文
│       ├── truncate.ts   # 输出截断
│       ├── bash.ts       # Shell 执行
│       ├── read.ts       # 文件/目录读取
│       ├── write.ts      # 文件写入
│       ├── edit.ts       # 精确编辑
│       ├── grep.ts       # 内容搜索
│       ├── glob.ts       # 模式匹配
│       ├── apply_patch.ts # 补丁应用
│       ├── skill.ts      # 技能加载
│       ├── todowrite.ts  # 任务管理
│       ├── webfetch.ts   # Web 获取
│       ├── websearch.ts  # Web 搜索
│       ├── question.ts   # 用户提问
│       ├── task.ts       # 子代理
│       ├── lsp_tool.ts   # LSP 代码智能
│       ├── plan.ts       # 计划模式
│       └── invalid.ts    # 无效工具回退
└── workspace/           # AI Agent 工作区 (默认)
```

## API 路由

### 内部 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查，返回已配置的 Provider 列表 |
| GET | `/api/providers` | 获取所有服务商/模型 |
| GET | `/api/providers/:id/models` | 动态拉取服务商模型列表 |
| GET | `/api/providers/custom` | 获取自定义服务商列表 |
| POST | `/api/providers/custom` | 注册自定义服务商 |
| DELETE | `/api/providers/custom/:id` | 删除自定义服务商 |
| GET | `/api/files?path=` | 文件树 (目录) 或文件内容 (文件) |
| POST | `/api/files` | 写入文件 `{ path, content }` |
| POST | `/api/run` | API 任务模式 (plan → code) |

### 外部 API

| 方法 | 路径 | 协议 | 说明 |
|------|------|------|------|
| POST | `/v1/messages` | Anthropic Messages API | 兼容 Claude API，支持 SSE 流式 |
| POST | `/v1/responses` | OpenAI Responses API | 兼容 OpenAI API，支持 SSE 流式 |

### WebSocket 协议 (`/ws/chat`)

协议对齐 AI SDK UI Stream Protocol v1，支持完整 14 类流式事件。

客户端发送：
```json
{ "type": "chat", "messages": [...], "provider": "deepseek", "model": "deepseek-chat" }
{ "type": "cancel" }
{ "type": "answer", "toolCallId": "...", "answers": [["选中的选项"]] }
```

服务端返回 (流式)：
```json
{ "type": "start", "messageId": "..." }
{ "type": "text-start", "id": "..." }
{ "type": "text-delta", "id": "...", "delta": "..." }
{ "type": "text-end", "id": "..." }
{ "type": "reasoning-start", "id": "..." }
{ "type": "reasoning-delta", "id": "...", "delta": "..." }
{ "type": "reasoning-end", "id": "..." }
{ "type": "tool-input-start", "toolCallId": "...", "toolName": "..." }
{ "type": "tool-input-delta", "toolCallId": "...", "inputTextDelta": "..." }
{ "type": "tool-input-available", "toolCallId": "...", "toolName": "...", "input": {...} }
{ "type": "tool-output-available", "toolCallId": "...", "output": "..." }
{ "type": "tool-output-error", "toolCallId": "...", "errorText": "..." }
{ "type": "start-step" }
{ "type": "finish-step" }
{ "type": "error", "errorText": "..." }
{ "type": "finish", "usage": { "promptTokens": ..., "completionTokens": ... } }
{ "type": "done" }
{ "type": "question", "toolCallId": "...", "questions": [...] }
{ "type": "todos-update", "todos": [...] }
{ "type": "source-url", "sourceId": "...", "url": "...", "title": "..." }
```

> **API 文档**: 完整 OpenAPI 3.0 规范见 [`docs/openapi.yaml`](docs/openapi.yaml)，WebSocket 协议见 [`docs/asyncapi.yaml`](docs/asyncapi.yaml)。

## Agentic Coding 工具 (16 个，对齐 OpenCode)

| 工具 | 说明 |
|------|------|
| `bash` | 执行 Shell 命令 (30 命令白名单, 120s 超时, 支持 workdir) |
| `read` | 读取文件/目录内容 (带行号, 支持 offset/limit, 合并 list 功能) |
| `write` | 创建/覆写文件 |
| `edit` | 精确字符串替换编辑 (支持 replaceAll 全局替换) |
| `grep` | ripgrep 正则内容搜索 (支持 include 文件类型过滤) |
| `glob` | 按 glob 模式匹配文件路径 |
| `apply_patch` | 结构化 Diff 补丁应用 (Add/Update/Delete File) |
| `skill` | 加载 SKILL.md 技能完整指令到对话 |
| `todowrite` | 任务列表管理 (pending/in_progress/completed/cancelled, WS 实时推送) |
| `webfetch` | 抓取网页内容 (HTML 自动转 Markdown, 支持 text/html 格式) |
| `websearch` | Web 搜索获取实时信息 (DuckDuckGo, 5 分钟缓存) |
| `question` | 向用户提问 (WebSocket 双向交互, 60s 超时) |
| `task` | 启动子代理执行子任务 (递归 streamText, 排除 task/question/todowrite) |
| `lsp` | LSP 代码智能 (定义跳转/引用查找/Hover/符号搜索等 9 种操作) |
| `plan` | 计划模式 (基于 AGENTS.md 创建实现计划) |
| `invalid` | 无效工具回退 (模型调用不存在或禁用工具时给出提示) |

### 工具系统架构

工具定义与实现在 `packages/tools/` 中统一管理，每个文件包含完整工具定义 (`ToolDef` = `id` + `description` + `parameters`(zod) + `execute`)，通过统一注册表 (`registry.getAISDKTools(ctx)`) 暴露给 AI Agent 使用。

- `packages/tools/types.ts` — 核心类型: `ToolDef` / `ToolContext` / `ToolExecuteResult`
- `packages/tools/registry.ts` — 工具注册表 (register/get/getAISDKTools)
- `packages/tools/truncate.ts` — 输出截断 (2000 行 / 50KB)
- `packages/tools/context.ts` — 执行上下文工厂 (进度反馈/文件变更通知)
- `packages/tools/*.ts` — 每个工具一个文件，定义 + 实现不分离

Shell 白名单: `ls cat echo pwd node npm pnpm npx git tsc tsx mkdir touch cp mv rm python python3 tree find which curl grep rg head tail sed awk`

## AI 服务商

### 官方支持 (18 个)

| 服务商 | SDK 包 | 模型拉取 |
|--------|--------|----------|
| OpenAI | `@ai-sdk/openai` | 动态 |
| Anthropic | `@ai-sdk/anthropic` | 动态 |
| Google AI | `@ai-sdk/google` | 动态 |
| Vertex AI | `@ai-sdk/google-vertex` | Fallback |
| Mistral | `@ai-sdk/mistral` | 动态 |
| Cohere | `@ai-sdk/cohere` | Fallback |
| AWS Bedrock | `@ai-sdk/amazon-bedrock` | Fallback |
| Azure OpenAI | `@ai-sdk/azure` | Fallback |
| DeepSeek | `@ai-sdk/deepseek` | 动态 |
| Groq | `@ai-sdk/groq` | 动态 |
| xAI Grok | `@ai-sdk/xai` | 动态 |
| Together AI | `@ai-sdk/togetherai` | 动态 |
| Perplexity | `@ai-sdk/perplexity` | Fallback |
| Fireworks AI | `@ai-sdk/fireworks` | Fallback |
| DeepInfra | `@ai-sdk/deepinfra` | Fallback |
| Cerebras | `@ai-sdk/cerebras` | 动态 |
| Moonshot AI | `@ai-sdk/openai-compatible` | 动态 |
| 通义千问 | `@ai-sdk/openai-compatible` | 动态 |

### 动态模型拉取

模型列表从各服务商 API 实时拉取 (5 分钟缓存)，不需要手动更新。当服务商发布新模型时自动可用。

### 自定义服务商

支持 OpenAI Compatible 和 Anthropic 协议的自定义服务商：
- 通过 UI (设置 → 添加自定义服务商) 或 API 注册
- 支持多个自定义服务商 (名称唯一)
- OpenAI Compatible 支持 Responses API 和 Completions API 两种风格
- 可配置 Provider Options (reasoningEffort、textVerbosity 等)

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `OPENAI_API_KEY` | OpenAI API Key | 否 |
| `ANTHROPIC_API_KEY` | Anthropic API Key | 否 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API Key | 否 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | 否 |
| `GROQ_API_KEY` | Groq API Key | 否 |
| `MISTRAL_API_KEY` | Mistral API Key | 否 |
| `COHERE_API_KEY` | Cohere API Key | 否 |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` | AWS Bedrock | 否 |
| `AZURE_API_KEY` / `AZURE_RESOURCE_NAME` | Azure OpenAI | 否 |
| `XAI_API_KEY` | xAI Grok API Key | 否 |
| `TOGETHER_AI_API_KEY` | Together AI API Key | 否 |
| `PERPLEXITY_API_KEY` | Perplexity API Key | 否 |
| `FIREWORKS_API_KEY` | Fireworks AI API Key | 否 |
| `DEEPINFRA_API_KEY` | DeepInfra API Key | 否 |
| `CEREBRAS_API_KEY` | Cerebras API Key | 否 |
| `MOONSHOT_API_KEY` | Moonshot AI API Key | 否 |
| `DASHSCOPE_API_KEY` | 通义千问 API Key | 否 |
| `GOOGLE_VERTEX_PROJECT` / `GOOGLE_VERTEX_LOCATION` | Vertex AI | 否 |
| `PORT` | Server 端口 (默认 3001) | 否 |
| `WORKSPACE_ROOT` | 工作区根目录 (默认 ./workspace) | 否 |

至少配置一个服务商的 API Key。

## Docker 部署

```bash
cp .env.example .env
# 编辑 .env 配置 API Key
docker compose up -d
```

- Web: nginx 端口 80
- Server: Node.js 端口 3001

## 国际化

支持简体中文和英文，页面右上角可切换语言。

## 自定义服务商 API

```bash
# 注册
curl -X POST http://localhost:3001/api/providers/custom \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-llm",
    "name": "My LLM",
    "protocol": "openai-compatible",
    "baseURL": "https://api.example.com/v1",
    "apiKey": "sk-xxx",
    "models": ["gpt-4o", "gpt-4o-mini"]
  }'

# 删除
curl -X DELETE http://localhost:3001/api/providers/custom/my-llm
```
