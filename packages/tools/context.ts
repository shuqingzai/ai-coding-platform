import type { ToolContext } from "./types"

export function createToolContext(opts: {
  sessionId: string
  messageId: string
  abort: AbortSignal
  agent?: string
  callID?: string
  onProgress?: (data: { title?: string; content: string; toolName: string; toolCallId: string }) => void
  onFileChange?: (action: "write" | "delete", path: string) => void
}): ToolContext {
  return {
    sessionId: opts.sessionId,
    messageId: opts.messageId,
    agent: opts.agent || "main",
    abort: opts.abort,
    callID: opts.callID,
    emitProgress(data) {
      opts.onProgress?.({ ...data, toolName: opts.callID?.split("_")[0] || opts.agent || "unknown", toolCallId: opts.callID || "" })
    },
    emitFileChange(action, path) {
      opts.onFileChange?.(action, path)
    },
  }
}
