import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Trash2, Bot, ChevronRight, CheckIcon, CopyIcon, XIcon, Brain } from "lucide-react"
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation"
import { Message, MessageContent, MessageResponse, MessageToolbar, MessageActions, MessageAction } from "@/components/ai-elements/message"
import { PromptInput, PromptInputBody, PromptInputTextarea, PromptInputFooter, PromptInputSubmit, PromptInputTools, PromptInputProvider } from "@/components/ai-elements/prompt-input"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning"
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool"
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"
import type { ChatMessage, UIMessagePart } from "../../types"

interface ChatPanelProps {
  messages: ChatMessage[]
  isStreaming: boolean
  onSend: (content: string) => void
  onCancel: () => void
  onClear: () => void
}

export function ChatPanel({ messages, isStreaming, onSend, onCancel, onClear }: ChatPanelProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  const handleSubmit = useCallback(
    ({ text }: { text: string; files: unknown[] }) => {
      if (!text.trim() || isStreaming) return
      onSend(text.trim())
    },
    [isStreaming, onSend]
  )

  if (collapsed) {
    return (
      <button
        className="w-8 flex items-center justify-center border-l border-border text-muted-foreground hover:text-accent-foreground shrink-0"
        onClick={() => setCollapsed(false)}
        aria-label={t("chat.expand")}
      >
        <ChevronRight size={16} />
      </button>
    )
  }

  return (
    <aside className="w-96 border-l border-border bg-background flex flex-col shrink-0">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 h-9 border-b border-border shrink-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("nav.aiChat")}</span>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded text-muted-foreground hover:text-accent-foreground hover:bg-accent transition" onClick={onClear} title={t("chat.clear")}>
            <Trash2 size={14} />
          </button>
          <button className="p-1 rounded text-muted-foreground hover:text-accent-foreground transition" onClick={() => setCollapsed(true)} title={t("chat.collapse")}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 对话列表 */}
      <Conversation className="flex-1 border-border">
        <ConversationContent className="px-3 py-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Bot size={32} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("chat.empty")}</p>
              <Suggestions className="mt-1">
                <Suggestion suggestion={t("suggestions.createReact")} onClick={(s) => onSend(s)} />
                <Suggestion suggestion={t("suggestions.fixBug")} onClick={(s) => onSend(s)} />
                <Suggestion suggestion={t("suggestions.explainCode")} onClick={(s) => onSend(s)} />
              </Suggestions>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} msg={msg} />
          ))}
        </ConversationContent>
        <ConversationScrollButton className="bg-muted hover:bg-accent border-border" />
      </Conversation>

      {/* 输入框 */}
      <div className="border-t border-border px-3 py-3 shrink-0">
        <PromptInputProvider>
          <PromptInput onSubmit={handleSubmit} className="[&>div]:rounded-xl [&>div]:border-border [&>div]:bg-muted">
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={t("chat.placeholder")}
                className="min-h-10 max-h-32 bg-transparent text-sm text-foreground placeholder:text-muted-foreground border-none focus:outline-none resize-none"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit
                status={isStreaming ? "streaming" : "ready"}
                onStop={onCancel}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
              />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">{t("chat.hint")}</p>
      </div>
    </aside>
  )
}

/** 单条消息气泡 */
function ChatMessageBubble({ msg }: { msg: ChatMessage }) {
  const { t } = useTranslation()
  const isUser = msg.role === "user"
  const isStreaming = msg.streaming
  const [copied, setCopied] = useState(false)
  const [reasoningDuration, setReasoningDuration] = useState<number | undefined>(undefined)
  const reasoningStartRef = useRef(Date.now())

  // 合并连续的 text-delta 为单个文本块
  const mergedParts = useMemo(() => {
    const result: UIMessagePart[] = []
    let textBuf = ""
    for (const part of msg.parts) {
      if (part.type === "text-delta") {
        textBuf += (part.delta || "")
      } else {
        if (textBuf) { result.push({ type: "text-delta", delta: textBuf }); textBuf = "" }
        result.push(part)
      }
    }
    if (textBuf) result.push({ type: "text-delta", delta: textBuf })
    return result
  }, [msg.parts])

  // 提取推理文本
  const reasoningText = useMemo(() => {
    return msg.parts
      .filter((p) => p.type === "reasoning-delta")
      .map((p) => p.delta || "")
      .join("")
  }, [msg.parts])

  // 合并后的纯文本回复
  const fullText = useMemo(() => {
    return mergedParts
      .filter((p) => p.type === "text-delta")
      .map((p) => p.delta || "")
      .join("")
  }, [mergedParts])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [fullText])

  useEffect(() => {
    if (reasoningText && !isStreaming) {
      const elapsed = ((Date.now() - reasoningStartRef.current) / 1000)
      setReasoningDuration(elapsed)
    } else if (reasoningText && isStreaming) {
      reasoningStartRef.current = Date.now()
      setReasoningDuration(undefined)
    }
  }, [reasoningText, isStreaming])

  return (
    <Message from={isUser ? "user" : "assistant"}>
      <MessageContent>
        {/* 推理过程 — 默认折叠，灰色斜体 */}
        {reasoningText && (
          <Reasoning isStreaming={!!isStreaming}>
            <ReasoningTrigger
              className="text-muted-foreground hover:text-accent-foreground text-xs"
              getThinkingMessage={(streaming, duration) => (
                <span className="flex items-center gap-1.5">
                  <Brain size={14} className={streaming ? "text-blue-400 animate-pulse" : "text-muted-foreground"} />
                  {streaming ? "正在思考..." : `思考了 ${duration?.toFixed(1)}s`}
                </span>
              )}
            />
            <ReasoningContent className="text-muted-foreground text-xs leading-relaxed pl-3 border-l-2 border-primary/20 bg-muted/20 rounded-r-md">
              {reasoningText}
            </ReasoningContent>
          </Reasoning>
        )}

        {/* 渲染合并后的 parts */}
        {mergedParts.map((part, i) => {
          switch (part.type) {
            // 文本回复
            case "text-delta":
              if (isUser) return null
              return (
                <MessageResponse key={`text-${i}`} className="text-foreground [&_pre]:bg-muted [&_pre]:border [&_pre]:border-border [&_pre]:rounded-md [&_code]:text-sm [&_p]:leading-relaxed">
                  {(part.delta || "") + (isStreaming && i === mergedParts.length - 1 ? "▌" : "")}
                </MessageResponse>
              )

            // 工具调用
            case "tool-input-start":
            case "tool-input-delta":
            case "tool-input-available":
            case "tool-output-available":
            case "tool-output-error":
              return <ToolCallRenderer key={`tool-${i}`} part={part} msg={msg} partIndex={i} />

            // 来源
            case "source-url":
              return (
                <a key={`src-${i}`} href={part.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline truncate block">
                  {part.title || part.url}
                </a>
              )

            // 工具进度事件 — 仅作为提示，不独立渲染
            case "tool-progress":
              return null

            // 错误
            case "error":
              return (
                <div key={`err-${i}`} className="text-xs text-red-500 bg-red-500/10 rounded-md px-2 py-1">
                  <XIcon size={12} className="inline mr-1" />
                  {part.errorText}
                </div>
              )

            // 跳过边界标记
            case "text-start":
            case "text-end":
            case "reasoning-start":
            case "reasoning-end":
            case "file":
              return null

            default:
              return null
          }
        })}

        {/* 用户消息纯文本 */}
        {isUser && msg.content && (
          <div className="whitespace-pre-wrap break-words leading-relaxed">
            {msg.content}
          </div>
        )}
      </MessageContent>

      {/* 助手消息操作栏 */}
      {!isUser && fullText && (
        <MessageToolbar>
          <MessageActions>
            <MessageAction
              label={copied ? t("message.copied") : t("message.copy")}
              onClick={handleCopy}
            >
              {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            </MessageAction>
          </MessageActions>
        </MessageToolbar>
      )}
    </Message>
  )
}

/** 工具调用渲染器 — 基于 UIMessagePart 推断 ToolUIPart state，增强状态反馈 */
function ToolCallRenderer({ part, msg, partIndex }: { part: UIMessagePart; msg: ChatMessage; partIndex: number }) {
  const tcId = part.toolCallId || ""
  const relatedParts = msg.parts.filter((p) => p.toolCallId === tcId)

  const hasOutput = relatedParts.some((p) => p.type === "tool-output-available")
  const hasError = relatedParts.some((p) => p.type === "tool-output-error")
  const hasInput = relatedParts.some((p) => p.type === "tool-input-available")
  const isStreamingInput = part.type === "tool-input-start" || part.type === "tool-input-delta"

  let state: import("ai").ToolUIPart["state"] = "input-streaming"
  if (hasError) state = "output-error"
  else if (hasOutput) state = "output-available"
  else if (hasInput) state = "input-available"
  else if (isStreamingInput) state = "input-streaming"

  const toolName = part.toolName || "unknown"
  const type = `tool-${toolName}` as const

  const isFirst = (relatedParts.length === 0) || (relatedParts[0] === part)
  if (!isFirst && partIndex > 0) return null

  const inputPart = relatedParts.find((p) => p.type === "tool-input-available")
  const outputPart = relatedParts.find((p) => p.type === "tool-output-available")
  const errorPart = relatedParts.find((p) => p.type === "tool-output-error")

  const isCompleted = state === "output-available"
  const isError = state === "output-error"

  const [open, setOpen] = useState(false)
  const autoOpenedRef = useRef(false)
  useEffect(() => {
    if (!autoOpenedRef.current && (isCompleted || isError)) {
      setOpen(true)
      autoOpenedRef.current = true
    }
  }, [isCompleted, isError])

  return (
    <Tool open={open} onOpenChange={setOpen}>
      <ToolHeader
        type={type}
        state={state}
        title={toolName}
        className={`text-foreground ${state === "input-streaming" ? "animate-pulse" : ""}`}
      />
      <ToolContent>
        {(inputPart || relatedParts.some((p) => p.type === "tool-input-delta")) && (
          <ToolInput input={inputPart?.input || {}} />
        )}
        {outputPart && (
          <ToolOutput output={outputPart.output} errorText={undefined} />
        )}
        {errorPart && (
          <ToolOutput output={undefined} errorText={errorPart.errorText} />
        )}
      </ToolContent>
    </Tool>
  )
}
