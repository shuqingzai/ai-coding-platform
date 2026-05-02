import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { healthRoute } from "./routes/health"
import { providersRoute } from "./routes/providers"
import { filesRoute } from "./routes/files"
import { runRoute } from "./routes/run"
import { messagesRoute } from "./routes/messages"
import { responsesRoute } from "./routes/responses"

export function createApp() {
  const app = new Hono()

  app.use("*", cors({ origin: ["http://localhost:5173", "http://localhost:3000"] }))
  app.use("*", logger())

  app.onError((err, c) => {
    console.error("[error]", err.message)
    return c.json({ error: err.message, code: 500 }, 500)
  })

  app.route("/", healthRoute)
  app.route("/api", providersRoute)
  app.route("/api", filesRoute)
  app.route("/api", runRoute)
  app.route("/v1", messagesRoute)   // POST /v1/messages
  app.route("/v1", responsesRoute)  // POST /v1/responses

  return app
}
