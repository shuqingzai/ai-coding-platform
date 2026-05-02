/** 服务商配置 */
export interface ProviderConfig {
  id: string
  name: string
  envKey: string
  extraEnvKeys?: string[]
  modelsEndpoint?: string
  modelsAuth?: (apiKey: string) => Record<string, string>
  defaultModel: string
  createProvider: (apiKey: string, extra?: Record<string, string>, modelName?: string) => Promise<any>
}

/** 自定义 Provider 配置 */
export interface CustomProviderConfig {
  id: string
  name: string
  protocol: "openai-compatible" | "anthropic"
  /** OpenAI: "responses" (@ai-sdk/openai) 或 "completions" (@ai-sdk/openai-compatible) */
  apiStyle?: "responses" | "completions"
  baseURL: string
  apiKey: string
  models: string[]
  headers?: string
  /** AI SDK providerOptions JSON */
  providerOptions?: string
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool"
  content: string
  toolCallId?: string
  toolName?: string
}

export interface WsClientMessage {
  type: "chat" | "cancel" | "answer"
  messageId?: string
  messages?: ChatMessage[]
  provider?: string
  model?: string
  apiKey?: string
  /** answer 类型专用 */
  toolCallId?: string
  answers?: string[][]
}

/** AI SDK Data Stream Protocol 对齐的 WS 服务端消息类型 (14 类事件) */
export type WsServerMessage =
  // --- 消息生命周期 ---
  | { type: "start"; messageId: string }
  | { type: "done" }
  // --- 文本流 (start → delta → end) ---
  | { type: "text-start"; id: string }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "text-end"; id: string }
  // --- 推理流 (start → delta → end) ---
  | { type: "reasoning-start"; id: string }
  | { type: "reasoning-delta"; id: string; delta: string }
  | { type: "reasoning-end"; id: string }
  // --- 工具输入流 (start → delta → available) ---
  | { type: "tool-input-start"; toolCallId: string; toolName: string }
  | { type: "tool-input-delta"; toolCallId: string; inputTextDelta: string }
  | { type: "tool-input-available"; toolCallId: string; toolName: string; input: unknown }
  // --- 工具输出 ---
  | { type: "tool-output-available"; toolCallId: string; output: unknown }
  | { type: "tool-output-error"; toolCallId: string; errorText: string }
  // --- Step 边界 ---
  | { type: "start-step" }
  | { type: "finish-step" }
  // --- 来源/文件引用 ---
  | { type: "source-url"; sourceId: string; url: string; title?: string }
  | { type: "file"; url: string; mediaType: string }
  // --- 错误/取消/完成 ---
  | { type: "error"; errorText: string }
  | { type: "finish"; usage: { promptTokens: number; completionTokens: number } }
  | { type: "abort"; reason?: string }
  // --- 文件变更事件 ---
  | { type: "file-change"; action: "write" | "delete"; path: string }
  // --- 工具进度事件 ---
  | { type: "tool-progress"; toolCallId: string; toolName: string; title?: string; content: string }
  // --- 业务事件 ---
  | { type: "question"; toolCallId: string; questions: any[] }
  | { type: "todos-update"; todos: { content: string; status: string; priority: string }[] }

export interface RunTaskRequest {
  task: string
  provider?: string
  model?: string
  apiKey?: string
}

export interface RunTaskResponse {
  plan: string
  code: string
}

export interface AvailableProvider {
  id: string
  name: string
  models: string[]
  configured: boolean
  isCustom?: boolean
  supportsModelFetch?: boolean
  defaultModel: string
}

export interface SkillInfo {
  name: string
  description: string
  content: string
  output: string
  dir: string
  files: string[]
}
