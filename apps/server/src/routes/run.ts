import { Hono } from "hono"
import { callAI, getAvailableProviders } from "../../../../packages/ai"
import type { RunTaskRequest, RunTaskResponse, ChatMessage } from "../../../../packages/ai/types"

export const runRoute = new Hono().post("/run", async (c) => {
  const body: RunTaskRequest = await c.req.json()

  if (!body.task || typeof body.task !== "string") {
    return c.json({ error: "缺少 task 参数" }, 400)
  }

  const available = getAvailableProviders().filter((p) => p.configured)
  const provider = body.provider || available[0]?.id || "openai"

  const providerConfig = getAvailableProviders().find((p) => p.id === provider)
  const model = body.model || providerConfig?.models[0] || "gpt-4o"

  try {
    // 第一步: 规划
    const planMessages: ChatMessage[] = [
      { role: "system", content: "你是一个任务规划器。将用户的任务拆解为具体的执行计划。用简体中文回复。" },
      { role: "user", content: body.task },
    ]
    const planResult = await callAI({ provider, messages: planMessages, apiKey: body.apiKey })

    // 第二步: 生成代码
    const codeMessages: ChatMessage[] = [
      { role: "system", content: "你是资深程序员。根据计划生成完整的 TypeScript 代码。只输出代码，不要解释。" },
      { role: "user", content: `计划:\n${planResult.text}\n\n请生成代码。` },
    ]
    const codeResult = await callAI({ provider, messages: codeMessages, apiKey: body.apiKey })

    const response: RunTaskResponse = {
      plan: planResult.text,
      code: codeResult.text,
    }

    return c.json(response)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "AI 调用失败" }, 502)
  }
})
