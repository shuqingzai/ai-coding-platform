import type { z } from "zod"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 工具执行上下文 — 注入到每个工具 execute() 调用中 */
export interface ToolContext {
  sessionId: string
  messageId: string
  agent: string
  abort: AbortSignal
  callID?: string
  /** 实时进度反馈 → 推送给前端 */
  emitProgress(data: { title?: string; content: string }): void
  /** 文件变更推送 → WebSocket → 前端自动刷新文件树 */
  emitFileChange(action: "write" | "delete", path: string): void
}

/** 工具执行结果 */
export interface ToolExecuteResult {
  title: string
  output: string
  attachments?: { contentType: string; data: string }[]
  truncated?: boolean
  outputPath?: string
}

/** 工具定义 — 对齐 AI SDK v6 tool() 接口 */
export interface ToolDef<P = any> {
  id: string
  description: string
  parameters: z.ZodType<P>
  execute(args: P, ctx: ToolContext): Promise<ToolExecuteResult>
  formatValidationError?(error: unknown): string
}

/** 获取工作区根目录 */
export function getWorkspaceRoot(): string {
  if (process.env.WORKSPACE_ROOT) {
    return path.resolve(__dirname, "..", "..", process.env.WORKSPACE_ROOT)
  }
  return path.resolve(__dirname, "..", "..", "workspace")
}

/** 安全解析路径 — 防止路径越界 */
export function resolveSafe(subPath: string): string {
  const root = getWorkspaceRoot()
  const resolved = path.resolve(root, subPath)
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`路径越界: ${subPath}`)
  }
  return resolved
}
