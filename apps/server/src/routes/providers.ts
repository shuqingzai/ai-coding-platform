import { Hono } from "hono"
import { getAvailableProviders, registerCustomProvider, unregisterCustomProvider, getCustomProviders, fetchProviderModels } from "../../../../packages/ai"
import type { CustomProviderConfig } from "../../../../packages/ai/types"

export const providersRoute = new Hono()
  // 获取所有服务商
  .get("/providers", (c) => c.json({ data: getAvailableProviders() }))
  // 获取自定义服务商列表
  .get("/providers/custom", (c) => c.json({ data: getCustomProviders() }))
  // 获取某服务商的模型列表 (动态拉取)
  .get("/providers/:id/models", async (c) => {
    const id = c.req.param("id")
    // 先查自定义 Provider
    const custom = getCustomProviders().find((p) => p.id === id)
    if (custom) return c.json({ data: custom.models, source: "manual" })
    // 动态拉取官方 Provider 模型
    try {
      const models = await fetchProviderModels(id)
      return c.json({ data: models, source: models.length > 0 ? "live" : "fallback" })
    } catch {
      return c.json({ error: "获取模型列表失败" }, 502)
    }
  })
  // 注册自定义服务商
  .post("/providers/custom", async (c) => {
    try {
      const body: CustomProviderConfig = await c.req.json()
      if (!body.id || !body.baseURL || !body.apiKey) {
        return c.json({ error: "缺少必填字段: id, baseURL, apiKey" }, 400)
      }
      if (!body.models || body.models.length === 0) {
        return c.json({ error: "自定义服务商必须填写模型列表" }, 400)
      }
      const config = registerCustomProvider({
        id: body.id,
        name: body.name || body.id,
        protocol: body.protocol || "openai-compatible",
        baseURL: body.baseURL,
        apiKey: body.apiKey,
        models: body.models.filter((m: string) => m.trim()),
        headers: body.headers,
      })
      return c.json({ data: config })
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "注册失败" }, 500)
    }
  })
  // 删除自定义服务商
  .delete("/providers/custom/:id", (c) => {
    const id = c.req.param("id")
    const ok = unregisterCustomProvider(id)
    return ok ? c.json({ ok: true }) : c.json({ error: "未找到该服务商" }, 404)
  })
