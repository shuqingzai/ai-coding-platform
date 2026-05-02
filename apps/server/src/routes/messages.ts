import { Hono } from "hono"
import { streamText, generateText } from "ai"
import { resolveModel, inferProviderFromModel } from "../../../../packages/ai"

export const messagesRoute = new Hono().post("/messages", async (c) => {
  // 提取 API Key：x-api-key 或 anthropic-dangerous-direct-browser-access header
  const apiKey = c.req.header("x-api-key") || c.req.header("anthropic-dangerous-direct-browser-access") || undefined

  const body = await c.req.json()
  const {
    model: modelName,
    max_tokens: maxTokens,
    messages: anthropicMessages,
    system,
    stream: doStream,
    temperature,
    tools,
  } = body

  if (!modelName || !anthropicMessages?.length) {
    return c.json({
      type: "error",
      error: { type: "invalid_request_error", message: "缺少 model 或 messages 参数" },
    }, 400)
  }

  // 将 Anthropic 消息格式转换为 AI SDK 格式
  const aiMessages: any[] = []
  if (system) {
    aiMessages.push({ role: "system", content: system })
  }
  for (const msg of anthropicMessages) {
    const content = convertAnthropicContent(msg.content)
    aiMessages.push({ role: msg.role, content })
  }

  // 解析服务商和模型
  const providerId = inferProviderFromModel(modelName)

  try {
    const model = await resolveModel(providerId, apiKey, modelName)

    if (doStream) {
      return handleAnthropicStream(model, aiMessages, modelName, maxTokens, temperature, tools)
    }

    // 非流式
    const result = await generateText({
      model,
      messages: aiMessages,
      maxTokens,
      temperature,
      tools: convertAnthropicTools(tools),
    } as any)

    const response = {
      id: `msg_${generateId()}`,
      type: "message" as const,
      role: "assistant" as const,
      content: [{ type: "text" as const, text: result.text }],
      model: modelName,
      stop_reason: result.finishReason === "stop" ? "end_turn" : (result.finishReason || "end_turn"),
      usage: {
        input_tokens: (result.usage as any)?.inputTokens ?? 0,
        output_tokens: (result.usage as any)?.outputTokens ?? 0,
      },
    }
    return c.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 调用失败"
    return c.json({
      type: "error",
      error: { type: "api_error", message },
    }, 502)
  }
})

/** 将 Anthropic content (string | content block[]) 转为 AI SDK 的 string */
function convertAnthropicContent(content: any): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === "text" || b.type === "tool_result" || b.type === "tool_use")
      .map((b: any) => {
        if (b.type === "tool_result") return typeof b.content === "string" ? b.content : JSON.stringify(b.content)
        if (b.type === "tool_use") return `[调用工具: ${b.name}]`
        return b.text || ""
      })
      .join("")
  }
  return String(content || "")
}

/** 将 Anthropic tools 转为 AI SDK 兼容格式 */
function convertAnthropicTools(tools: any[]): any {
  if (!tools || !Array.isArray(tools) || tools.length === 0) return undefined
  const result: Record<string, any> = {}
  for (const t of tools) {
    if (t.name) {
      result[t.name] = {
        description: t.description || "",
        inputSchema: t.input_schema || {},
      }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

/** 处理 Anthropic SSE 流式响应 */
function handleAnthropicStream(
  model: any,
  messages: any[],
  modelName: string,
  maxTokens: number,
  temperature?: number,
  tools?: any[],
) {
  const encoder = new TextEncoder()
  const msgId = `msg_${generateId()}`

  const stream = new ReadableStream({
    async start(controller) {
      const sendSSE = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // message_start
        sendSSE("message_start", {
          type: "message_start",
          message: {
            id: msgId,
            type: "message",
            role: "assistant",
            content: [],
            model: modelName,
          },
        })

        // content_block_start
        sendSSE("content_block_start", {
          type: "content_block_start",
          index: 0,
          content_block: { type: "text", text: "" },
        })

        const result = streamText({
          model,
          messages,
          maxTokens,
          temperature,
          tools: convertAnthropicTools(tools),
        } as any)

        let fullText = ""
        let usageData: any = null

        for await (const part of result.fullStream) {
          const type = (part as any).type as string

          if (type === "text-delta") {
            const text = (part as any).textDelta || ""
            fullText += text
            sendSSE("content_block_delta", {
              type: "content_block_delta",
              index: 0,
              delta: { type: "text_delta", text },
            })
          } else if (type === "finish") {
            usageData = (part as any).usage
          } else if (type === "error") {
            const errMsg = String((part as any).error || "未知错误")
            sendSSE("error", { type: "error", error: { type: "api_error", message: errMsg } })
            controller.close()
            return
          }
        }

        // content_block_stop
        sendSSE("content_block_stop", {
          type: "content_block_stop",
          index: 0,
        })

        // message_delta
        sendSSE("message_delta", {
          type: "message_delta",
          delta: { stop_reason: "end_turn", stop_sequence: null },
          usage: {
            output_tokens: (usageData as any)?.completionTokens ?? fullText.length,
          },
        })

        // message_stop
        sendSSE("message_stop", {
          type: "message_stop",
        })

        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        try {
          sendSSE("error", { type: "error", error: { type: "api_error", message } })
        } catch {}
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "x-request-id": msgId,
    },
  })
}

/** 生成简短唯一 ID */
function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
