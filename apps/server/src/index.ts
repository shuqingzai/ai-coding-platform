import { config } from "dotenv"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

// 加载项目根目录的 .env (apps/server/src/index.ts → 上溯 3 级 → repo root)
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env") })

import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { createApp } from "./app"
import { validateEnv } from "./lib/env"
import { createWebSocketServer } from "./ws"

validateEnv()

const app = createApp()

// 创建 HTTP Server + WebSocket
const httpServer = createServer(async (req, res) => {
  // 收集 body
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk))
  }
  const body = Buffer.concat(chunks)

  // 构建 Web Request
  const url = `http://${req.headers.host || "localhost"}${req.url || "/"}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, String(v)))
      } else {
        headers.set(key, String(value))
      }
    }
  }

  const request = new Request(url, {
    method: req.method || "GET",
    headers,
    body: body.length > 0 ? body : undefined,
  })

  const response = await app.fetch(request)

  res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
  if (response.body) {
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  }
  res.end()
})

createWebSocketServer(httpServer)

const PORT = parseInt(process.env.PORT || "3001", 10)
httpServer.listen(PORT, () => {
  const addr = httpServer.address() as AddressInfo
  console.log(`[server] 运行在 http://localhost:${addr.port}`)
  console.log(`[server] WebSocket 运行在 ws://localhost:${addr.port}/ws/chat`)
})

process.on("SIGTERM", () => {
  console.log("[server] 正在关闭...")
  httpServer.close(() => process.exit(0))
})
