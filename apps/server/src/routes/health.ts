import { Hono } from "hono"
import { getAvailableProviders } from "../../../../packages/ai"

export const healthRoute = new Hono().get("/health", (c) => {
  const providers = getAvailableProviders()
  return c.json({
    ok: true,
    providers: providers.filter((p) => p.configured).map((p) => p.id),
  })
})
