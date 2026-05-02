/** UIMessagePart 风格的消息部件 */
export interface UIMessagePart {
  type: string
  id?: string
  // text
  text?: string
  delta?: string
  // reasoning
  // tool
  toolCallId?: string
  toolName?: string
  input?: unknown
  inputTextDelta?: string
  output?: unknown
  errorText?: string
  // source/file
  url?: string
  sourceId?: string
  mediaType?: string
  title?: string
  action?: string
  path?: string
}

export interface AvailableProvider {
  id: string
  name: string
  models: string[]
  configured: boolean
  isCustom?: boolean
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  /** 用户消息直接使用 content 字段 */
  content?: string
  /** AI 消息使用 parts 数组 */
  parts: UIMessagePart[]
  streaming?: boolean
  usage?: { promptTokens: number; completionTokens: number }
}

export interface FileNode {
  name: string
  path: string
  type: "file" | "directory"
  children?: FileNode[]
}

/** AI SDK Stream Protocol 对齐的 WS 消息类型 */
export interface WsServerMessage {
  type: string
  messageId?: string
  id?: string
  delta?: string
  textDelta?: string
  toolCallId?: string
  toolName?: string
  args?: unknown
  input?: unknown
  inputTextDelta?: string
  output?: unknown
  result?: unknown
  errorText?: string
  message?: string
  usage?: { promptTokens: number; completionTokens: number }
  sourceId?: string
  url?: string
  mediaType?: string
  title?: string
  reason?: string
  questions?: any[]
  todos?: { content: string; status: string; priority: string }[]
  action?: string
  path?: string
}

/** 自定义 Provider 配置 */
export interface CustomProviderConfig {
  id: string
  name: string
  protocol: "openai-compatible" | "anthropic"
  apiStyle?: "responses" | "completions"
  baseURL: string
  apiKey: string
  models: string[]
  headers?: string
  providerOptions?: string
}
