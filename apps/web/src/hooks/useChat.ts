import { useState, useRef, useCallback, useEffect } from "react"
import type { ChatMessage, UIMessagePart, WsServerMessage } from "../types"
import { useSettings } from "./useSettings"

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

function getWsUrl(): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:"
  return `${protocol}//${location.host}/ws/chat`
}

interface UseChatOptions {
  onFileChanged?: () => void
}

export function useChat(options: UseChatOptions = {}) {
  const { preferences, getApiKey } = useSettings()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const currentMessageRef = useRef<ChatMessage | null>(null)
  const onFileChangedRef = useRef(options.onFileChanged)
  onFileChangedRef.current = options.onFileChanged

  const updateCurrentMessage = useCallback((updater: (msg: ChatMessage) => ChatMessage) => {
    setMessages((prev) => {
      const found = prev.find((m) => m.id === currentMessageRef.current?.id)
      if (!found) return prev
      return prev.map((m) => (m.id === found.id ? { ...m, ...updater(m) } : m))
    })
  }, [])

  const appendPart = useCallback((part: UIMessagePart) => {
    updateCurrentMessage((msg) => ({
      ...msg,
      parts: [...msg.parts, part],
    }))
  }, [updateCurrentMessage])

  const updateLastPart = useCallback((updater: (part: UIMessagePart) => UIMessagePart) => {
    updateCurrentMessage((msg) => {
      const parts = [...msg.parts]
      if (parts.length > 0) {
        parts[parts.length - 1] = updater(parts[parts.length - 1])
      }
      return { ...msg, parts }
    })
  }, [updateCurrentMessage])

  const finishMessage = useCallback(() => {
    const msg = currentMessageRef.current
    if (msg) {
      // 检测 write 工具调用，触发文件刷新
      const hasWriteTool = msg.parts.some(
        (p) => p.type === "tool-output-available" && p.toolName === "write"
      )
      if (hasWriteTool) {
        setTimeout(() => onFileChangedRef.current?.(), 300)
      }
    }
    updateCurrentMessage((msg) => ({ ...msg, streaming: false }))
    setIsStreaming(false)
    currentMessageRef.current = null
    wsRef.current?.close()
  }, [updateCurrentMessage])

  const sendMessage = useCallback(
    (content: string, provider?: string, model?: string) => {
      if (isStreaming || !content.trim()) return

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content,
        parts: [],
        streaming: false,
      }
      const aiMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        parts: [],
        streaming: true,
      }

      setMessages((prev) => [...prev, userMsg, aiMsg])
      setIsStreaming(true)
      currentMessageRef.current = aiMsg

      const ws = new WebSocket(getWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "chat",
            messages: [...messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content || m.parts.filter((p) => p.type === "text-delta").map((p) => p.delta).join(""),
            })),
            provider: provider || preferences.provider,
            model: model || preferences.model,
            apiKey: getApiKey(provider || preferences.provider) || undefined,
          })
        )
      }

      ws.onmessage = (event) => {
        try {
          const chunk = JSON.parse(event.data) as WsServerMessage

          switch (chunk.type) {
            case "start":
              break

            case "text-start":
              appendPart({ type: "text-start", id: chunk.id })
              break
            case "text-delta": {
              const prevPart = currentMessageRef.current?.parts?.[currentMessageRef.current.parts.length - 1]
              if (prevPart?.type === "text-delta" && prevPart.id === chunk.id) {
                updateLastPart((p) => ({ ...p, delta: (p.delta || "") + (chunk.delta || chunk.textDelta || "") }))
              } else {
                appendPart({ type: "text-delta", id: chunk.id, delta: chunk.delta || chunk.textDelta || "" })
              }
              break
            }
            case "text-end":
              appendPart({ type: "text-end", id: chunk.id })
              break

            case "reasoning-start":
              appendPart({ type: "reasoning-start", id: chunk.id })
              break
            case "reasoning-delta": {
              const prevR = currentMessageRef.current?.parts?.[currentMessageRef.current.parts.length - 1]
              if (prevR?.type === "reasoning-delta" && prevR.id === chunk.id) {
                updateLastPart((p) => ({ ...p, delta: (p.delta || "") + (chunk.delta || chunk.textDelta || "") }))
              } else {
                appendPart({ type: "reasoning-delta", id: chunk.id, delta: chunk.delta || chunk.textDelta || "" })
              }
              break
            }
            case "reasoning-end":
              appendPart({ type: "reasoning-end", id: chunk.id })
              break

            case "tool-input-start":
              appendPart({ type: "tool-input-start", toolCallId: chunk.toolCallId!, toolName: chunk.toolName! })
              break
            case "tool-input-delta": {
              const prevT = currentMessageRef.current?.parts?.[currentMessageRef.current.parts.length - 1]
              if (prevT?.type === "tool-input-delta" && prevT.toolCallId === chunk.toolCallId) {
                updateLastPart((p) => ({ ...p, inputTextDelta: (p.inputTextDelta || "") + (chunk.inputTextDelta || chunk.delta || "") }))
              } else {
                appendPart({ type: "tool-input-delta", toolCallId: chunk.toolCallId!, inputTextDelta: chunk.inputTextDelta || chunk.delta || "" })
              }
              break
            }
            case "tool-input-available":
              appendPart({ type: "tool-input-available", toolCallId: chunk.toolCallId!, toolName: chunk.toolName!, input: chunk.input })
              break
            case "tool-output-available":
              appendPart({ type: "tool-output-available", toolCallId: chunk.toolCallId!, output: chunk.output || chunk.result })
              if (chunk.toolName === "bash") {
                setTerminalOutput((prev) => [...prev, String(chunk.output || chunk.result || "")])
              }
              break
            case "tool-output-error":
              appendPart({ type: "tool-output-error", toolCallId: chunk.toolCallId!, errorText: chunk.errorText || "工具执行错误" })
              break

            case "start-step":
            case "finish-step":
              break

            case "source-url":
              appendPart({ type: "source-url", sourceId: chunk.sourceId!, url: chunk.url!, title: chunk.title })
              break
            case "file":
              appendPart({ type: "file", url: chunk.url!, mediaType: chunk.mediaType! })
              break

            case "error":
              appendPart({ type: "error", errorText: chunk.errorText || chunk.message || "未知错误" })
              finishMessage()
              break

            case "finish":
              updateCurrentMessage((msg) => ({
                ...msg,
                streaming: false,
                usage: chunk.usage,
              }))
              // 检测 write 工具
              const hasWrite = currentMessageRef.current?.parts.some(
                (p) => p.type === "tool-output-available" && p.toolName === "write"
              )
              if (hasWrite) {
                setTimeout(() => onFileChangedRef.current?.(), 300)
              }
              setIsStreaming(false)
              currentMessageRef.current = null
              wsRef.current?.close()
              break

            case "abort":
              updateCurrentMessage((msg) => ({ ...msg, streaming: false }))
              finishMessage()
              break

            case "done":
              break

            // 业务事件
            case "file-change":
              // 文件变更 → 触发文件树刷新
              onFileChangedRef.current?.()
              break
            case "tool-progress":
              // 工具进度 → 推送到对应 toolCall
              window.dispatchEvent(new CustomEvent("tool-progress", { detail: chunk }))
              break
            case "todos-update":
              window.dispatchEvent(new CustomEvent("todos-update", { detail: chunk.todos }))
              break
            case "question":
              window.dispatchEvent(new CustomEvent("ai-question", { detail: chunk }))
              break

            default:
              console.warn("[useChat] 未知事件类型:", chunk.type)
          }
        } catch (err) {
          console.error("[useChat] 消息解析错误:", err)
        }
      }

      ws.onerror = () => {
        updateCurrentMessage((msg) => ({
          ...msg,
          parts: [...msg.parts, { type: "error", errorText: "WebSocket 连接失败" }],
          streaming: false,
        }))
        setIsStreaming(false)
        currentMessageRef.current = null
      }

      ws.onclose = () => {
        if (currentMessageRef.current) {
          updateCurrentMessage((msg) => ({ ...msg, streaming: false }))
          setIsStreaming(false)
          currentMessageRef.current = null
        }
      }
    },
    [messages, isStreaming, preferences, getApiKey, appendPart, updateLastPart, updateCurrentMessage, finishMessage]
  )

  const cancelMessage = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "cancel" }))
    wsRef.current?.close()
    updateCurrentMessage((msg) => ({ ...msg, streaming: false }))
    setIsStreaming(false)
    currentMessageRef.current = null
  }, [updateCurrentMessage])

  const clearMessages = useCallback(() => setMessages([]), [])
  const clearTerminal = useCallback(() => setTerminalOutput([]), [])

  useEffect(() => { return () => wsRef.current?.close() }, [])

  return { messages, isStreaming, terminalOutput, sendMessage, cancelMessage, clearMessages, clearTerminal }
}
