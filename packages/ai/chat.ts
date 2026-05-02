import { streamText, stepCountIs, generateId } from "ai"
import { resolveModel } from "./providers"
import type { ChatMessage } from "./types"
import { loadAgentsMd, loadSkills } from "./context"
import { registry, createToolContext, setTaskExecutor } from "../tools"

const BASE_SYSTEM_PROMPT = `You are an Agentic Coding assistant running in a WebIDE environment.

Available tools: bash(execute shell), read(read files/dirs), write(write files), edit(edit files), grep(search content), glob(match files), webfetch(fetch web), websearch(search web), question(ask user), task(launch subagent), todowrite(manage tasks), skill(load skill), apply_patch(apply patch), lsp(code intelligence), plan(planning mode)

Rules:
1. Reply in Simplified Chinese
2. Read files before modifying to understand existing content
3. Explain what was changed after writing code
4. All file paths are relative to workspace root
5. Use todowrite to track multi-step task progress
6. Use the question tool to ask users for clarification`

async function buildSystemPrompt(): Promise<string> {
  const agentsMd = await loadAgentsMd()
  const skills = await loadSkills()
  let prompt = BASE_SYSTEM_PROMPT
  if (agentsMd) prompt += `\n\n<!-- Workspace rules -->\n${agentsMd}`
  if (skills.length > 0) {
    prompt += `\n\n<!-- Available Skills (use the skill tool to load full instructions) -->\n`
    prompt += skills.map((s) => `- ${s.name}: ${s.description}`).join("\n")
  }
  return prompt
}

export async function getSystemPrompt(): Promise<string> {
  return buildSystemPrompt()
}

// 注入 task 执行器 — 解决 packages/tools 不能反向依赖 packages/ai 的循环引用
setTaskExecutor(async (args, ctx) => {
  const system = await buildSystemPrompt()
  let model: any
  try {
    model = await resolveModel("deepseek", undefined)
  } catch {
    try { model = await resolveModel("openai", undefined) } catch {
      return `task_id: ses_${Date.now().toString(36)}\n\n<task_result>\n无法获取子代理模型\n</task_result>`
    }
  }

  const subCtx = createToolContext({
    sessionId: ctx.sessionId,
    messageId: ctx.messageId + "-sub",
    abort: ctx.abort,
    agent: args.subagent_type,
    callID: args.task_id,
  })

  const result = streamText({
    model,
    system: `${system}\n\nYou are a subagent responsible for executing specific subtasks. Return a summary after completing the task. Do not use the task/question/todowrite tools.`,
    messages: [
      { role: "user" as const, content: `Execute the following task and return results:\n\n${args.prompt}\n\nDescription: ${args.description}` },
    ],
    tools: registry.getAISDKToolsExcluding(subCtx, ["task", "question", "todowrite"]),
    maxSteps: 10,
  })

  let text = ""
  try {
    for await (const part of result.fullStream) {
      const pt = part as any
      if (pt.type === "text-delta") {
        text += pt.textDelta || pt.text || ""
      }
    }
  } catch (err: any) {
    const ti = Date.now().toString(36)
    return `task_id: ses_${ti}\n\n<task_result>\n子代理执行错误: ${err.message}\n\n已收集输出: ${text.slice(0, 2000)}\n</task_result>`
  }

  const ti = Date.now().toString(36)
  const summary = text.slice(0, 8000) || `子代理 "${args.description}" 完成，无文本输出`
  return `task_id: ses_${ti}\n\n<task_result>\n${summary}\n</task_result>`
})

export async function chatAgent(options: {
  provider: string
  messages: ChatMessage[]
  apiKey?: string
  maxSteps?: number
  providerOptions?: Record<string, any>
  abortSignal?: AbortSignal
  onChunk: (chunk: { type: string; [key: string]: any }) => void
}) {
  const model = await resolveModel(options.provider, options.apiKey)
  const maxSteps = options.maxSteps ?? 20
  const sessionId = Math.random().toString(36).slice(2)
  const messageId = generateId()

  try {
    const system = await buildSystemPrompt()

    const ctx = createToolContext({
      sessionId,
      messageId,
      abort: options.abortSignal || new AbortController().signal,
      onFileChange: (action, path) => {
        options.onChunk({ type: "file-change", action, path } as any)
      },
      onProgress: (data) => {
        options.onChunk({
          type: "tool-progress",
          toolCallId: data.toolCallId,
          toolName: data.toolName,
          title: data.title,
          content: data.content,
        } as any)
      },
    })

    const result = streamText({
      model,
      messages: options.messages as any,
      system,
      tools: registry.getAISDKTools(ctx),
      maxSteps,
      stopWhen: stepCountIs(maxSteps),
      providerOptions: options.providerOptions,
      abortSignal: options.abortSignal,
    } as any)

    let textBlockId = ""
    let reasoningBlockId = ""
    let hasActiveText = false
    let hasActiveReasoning = false

    options.onChunk({ type: "start", messageId } as any)

    for await (const part of result.fullStream) {
      const pt = part as any
      const type = pt.type as string

      switch (type) {
        case "start-step":
          options.onChunk({ type: "start-step" } as any)
          break
        case "finish-step":
          options.onChunk({ type: "finish-step" } as any)
          break

        case "text-start":
          textBlockId = generateId()
          hasActiveText = true
          options.onChunk({ type: "text-start", id: textBlockId } as any)
          break
        case "text-delta":
          if (!hasActiveText) {
            textBlockId = generateId()
            hasActiveText = true
            options.onChunk({ type: "text-start", id: textBlockId } as any)
          }
          options.onChunk({ type: "text-delta", id: textBlockId, delta: pt.textDelta || pt.text || "" } as any)
          break
        case "text-end":
          if (hasActiveText) {
            options.onChunk({ type: "text-end", id: textBlockId } as any)
            hasActiveText = false
          }
          break

        case "reasoning-start":
          reasoningBlockId = generateId()
          hasActiveReasoning = true
          options.onChunk({ type: "reasoning-start", id: reasoningBlockId } as any)
          break
        case "reasoning-delta":
          if (!hasActiveReasoning) {
            reasoningBlockId = generateId()
            hasActiveReasoning = true
            options.onChunk({ type: "reasoning-start", id: reasoningBlockId } as any)
          }
          options.onChunk({ type: "reasoning-delta", id: reasoningBlockId, delta: pt.textDelta || pt.text || "" } as any)
          break
        case "reasoning-end":
          if (hasActiveReasoning) {
            options.onChunk({ type: "reasoning-end", id: reasoningBlockId } as any)
            hasActiveReasoning = false
          }
          break

        case "tool-call-streaming-start":
          options.onChunk({ type: "tool-input-start", toolCallId: pt.toolCallId, toolName: pt.toolName } as any)
          break
        case "tool-call-delta":
          options.onChunk({ type: "tool-input-delta", toolCallId: pt.toolCallId, inputTextDelta: pt.argsTextDelta || pt.delta || "" } as any)
          break
        case "tool-call": {
          const input = pt.input || pt.args || {}
          options.onChunk({ type: "tool-input-available", toolCallId: pt.toolCallId, toolName: pt.toolName, input } as any)
          break
        }

        case "tool-result":
          options.onChunk({ type: "tool-output-available", toolCallId: pt.toolCallId, output: pt.output || pt.result } as any)
          break
        case "tool-error":
          options.onChunk({ type: "tool-output-error", toolCallId: pt.toolCallId, errorText: String(pt.error || pt.message || "未知错误") } as any)
          break

        case "source":
          options.onChunk({ type: "source-url", sourceId: pt.id || generateId(), url: pt.url || "", title: pt.title } as any)
          break
        case "file":
          options.onChunk({ type: "file", url: pt.url || "", mediaType: pt.mediaType || "application/octet-stream" } as any)
          break

        case "error":
          options.onChunk({ type: "error", errorText: String(pt.error || pt.message || "未知错误") } as any)
          break

        case "finish":
          if (hasActiveText) {
            options.onChunk({ type: "text-end", id: textBlockId } as any)
            hasActiveText = false
          }
          if (hasActiveReasoning) {
            options.onChunk({ type: "reasoning-end", id: reasoningBlockId } as any)
            hasActiveReasoning = false
          }
          options.onChunk({
            type: "finish",
            usage: { promptTokens: pt.usage?.inputTokens ?? 0, completionTokens: pt.usage?.outputTokens ?? 0 },
          } as any)
          break

        // 忽略的内部事件
        case "start":
        case "start-tool-call":
        case "start-tool-result":
        case "tool-input-start":
        case "tool-input-delta":
        case "tool-input-end":
        case "reasoning":
          break

        default:
          console.error("[chat] 未知 chunk 类型:", type, JSON.stringify(pt).slice(0, 100))
      }
    }

    options.onChunk({ type: "done" } as any)
  } catch (err) {
    options.onChunk({ type: "error", errorText: err instanceof Error ? err.message : String(err) } as any)
  }
}
