import { Hono } from "hono"
import { streamText, generateText } from "ai"
import { resolveModel, inferProviderFromModel } from "../../../../packages/ai"

export const responsesRoute = new Hono().post("/responses", async (c) => {
  // 提取 API Key：Authorization Bearer token
  const auth = c.req.header("Authorization") || ""
  const apiKey = auth.startsWith("Bearer ") ? auth.slice(7) : undefined

  const body = await c.req.json()
  const {
    model: modelName,
    input: userInput,
    instructions,
    stream: doStream,
    temperature,
    tools,
  } = body

  if (!modelName) {
    return c.json({
      error: { message: "缺少 model 参数", type: "invalid_request_error" },
    }, 400)
  }

  // 将 OpenAI Responses 格式转换为 AI SDK 消息格式
  const aiMessages: any[] = []
  if (instructions) {
    aiMessages.push({ role: "system", content: instructions })
  }

  // input 可以是 string 或 array
  if (typeof userInput === "string") {
    if (userInput.trim()) {
      aiMessages.push({ role: "user", content: userInput })
    }
  } else if (Array.isArray(userInput)) {
    for (const item of userInput) {
      if (item.role && item.content) {
        aiMessages.push({ role: item.role, content: convertContent(item.content) })
      } else if (item.type === "message") {
        aiMessages.push({ role: item.role || "user", content: convertContent(item.content) })
      }
    }
  }

  // 解析服务商和模型
  const providerId = inferProviderFromModel(modelName)

  try {
    const model = await resolveModel(providerId, apiKey, modelName)

    if (doStream) {
      return handleResponsesStream(model, aiMessages, modelName, temperature, tools)
    }

    // 非流式
    const result = await generateText({
      model,
      messages: aiMessages.length > 0 ? aiMessages : [{ role: "user", content: "Hello" }],
      temperature,
      tools: convertOpenAITools(tools),
    } as any)

    const respId = `resp_${generateId()}`
    const response = {
      id: respId,
      object: "response" as const,
      model: modelName,
      output: [{
        type: "message" as const,
        role: "assistant" as const,
        content: [{ type: "output_text" as const, text: result.text }],
      }],
      usage: {
        input_tokens: (result.usage as any)?.inputTokens ?? 0,
        output_tokens: (result.usage as any)?.outputTokens ?? 0,
      },
    }
    return c.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 调用失败"
    return c.json({
      error: { message, type: "api_error" },
    }, 502)
  }
})

/** 将 content 转换为纯文本字符串 */
function convertContent(content: any): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === "text" || b.type === "input_text" || b.type === "output_text")
      .map((b: any) => b.text || "")
      .join("")
  }
  return String(content || "")
}

/** 将 OpenAI Responses tools 转为 AI SDK 兼容格式 */
function convertOpenAITools(tools: any[]): any {
  if (!tools || !Array.isArray(tools) || tools.length === 0) return undefined
  const result: Record<string, any> = {}
  for (const t of tools) {
    if (t.type === "function" && t.name) {
      result[t.name] = {
        description: t.description || "",
        inputSchema: t.parameters || {},
      }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

/** 处理 OpenAI Responses SSE 流式响应 */
function handleResponsesStream(
  model: any,
  messages: any[],
  modelName: string,
  temperature?: number,
  tools?: any[],
) {
  const encoder = new TextEncoder()
  const respId = `resp_${generateId()}`

  const stream = new ReadableStream({
    async start(controller) {
      const sendSSE = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // response.created
        sendSSE("response.created", {
          type: "response.created",
          response: {
            id: respId,
            object: "response",
            model: modelName,
            output: [],
          },
        })

        // response.in_progress
        sendSSE("response.in_progress", {
          type: "response.in_progress",
          response: { id: respId, object: "response", model: modelName, output: [] },
        })

        const result = streamText({
          model,
          messages: messages.length > 0 ? messages : [{ role: "user", content: "Hello" }],
          temperature,
          tools: convertOpenAITools(tools),
        } as any)

        let fullText = ""
        let usageData: any = null

        for await (const part of result.fullStream) {
          const type = (part as any).type as string

          if (type === "text-delta") {
            const text = (part as any).textDelta || ""
            fullText += text
            sendSSE("response.output_text.delta", {
              type: "response.output_text.delta",
              delta: text,
            })
          } else if (type === "finish") {
            usageData = (part as any).usage
          } else if (type === "error") {
            const errMsg = String((part as any).error || "未知错误")
            sendSSE("error", { type: "error", error: { message: errMsg, type: "api_error" } })
            controller.close()
            return
          }
        }

        // response.completed
        sendSSE("response.completed", {
          type: "response.completed",
          response: {
            id: respId,
            object: "response",
            model: modelName,
            output: [{
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: fullText }],
            }],
            usage: {
              input_tokens: (usageData as any)?.promptTokens ?? 0,
              output_tokens: (usageData as any)?.completionTokens ?? fullText.length,
            },
          },
        })

        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        try {
          sendSSE("error", { type: "error", error: { message, type: "api_error" } })
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
      "x-request-id": respId,
    },
  })
}

/** 生成简短唯一 ID */
function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
