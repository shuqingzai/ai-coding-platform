import type { Server } from "node:http"
import { WebSocketServer, WebSocket } from "ws"
import { chatAgent, getCustomProviders } from "../../../../packages/ai"
import { questionEmitter, todoEmitter } from "../../../../packages/tools"
import type { WsClientMessage, WsServerMessage } from "../../../../packages/ai/types"
import { log } from "../lib/logger"

export function createWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true })

  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", `http://${request.headers.host}`)

    if (url.pathname === "/ws/chat") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request)
      })
    } else {
      socket.destroy()
    }
  })

  wss.on("connection", (ws: WebSocket) => {
    log("info", "WebSocket connection established")

    let isProcessing = false
    let abortController: AbortController | null = null

    // question ask handler
    const askHandler = (payload: { callId: string; questions: any[]; resolve: (v: string) => void }) => {
      if (ws.readyState !== ws.OPEN) {
        payload.resolve("WebSocket disconnected")
        return
      }
      ws.send(JSON.stringify({ type: "question", toolCallId: payload.callId, questions: payload.questions }))

      const timeout = setTimeout(() => {
        questionEmitter.removeAllListeners(`answer_${payload.callId}`)
        payload.resolve("User did not answer within 60 seconds")
      }, 60000)

      questionEmitter.once(`answer_${payload.callId}`, (answers: string[][]) => {
        clearTimeout(timeout)
        const formatted = payload.questions
          .map((q: any, i: number) => `"${q.question}"="${answers[i]?.join(", ") || "No answer"}"`)
          .join(", ")
        payload.resolve(`User answered: ${formatted}`)
      })
    }
    questionEmitter.on("ask", askHandler)

    // todo update handler
    const todoHandler = (todos: { content: string; status: string; priority: string }[]) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "todos-update", todos }))
      }
    }
    todoEmitter.on("update", todoHandler)

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WsClientMessage

        if (msg.type === "cancel") {
          abortController?.abort()
          return
        }

        if (msg.type === "answer") {
          const { toolCallId, answers } = msg as any
          if (toolCallId) {
            questionEmitter.emit(`answer_${toolCallId}`, answers)
          }
          return
        }

        if (msg.type !== "chat") return
        if (isProcessing) {
          send(ws, { type: "error", errorText: "A message is already being processed" })
          return
        }

        isProcessing = true
        abortController = new AbortController()

        // Pass custom providerOptions if available
        const customProv = getCustomProviders().find((c) => c.id === msg.provider)
        const providerOpts = customProv?.providerOptions
          ? (() => { try { return JSON.parse(customProv.providerOptions!) } catch { return undefined } })()
          : undefined

        try {
          await chatAgent({
            provider: msg.provider || "openai",
            messages: msg.messages || [],
            apiKey: msg.apiKey,
            providerOptions: providerOpts,
            abortSignal: abortController.signal,
            onChunk: (chunk) => {
              if (abortController?.signal.aborted) return
              send(ws, chunk as WsServerMessage)
            },
          })
        } catch (chatErr) {
          if (abortController?.signal.aborted) return
          const errMsg = chatErr instanceof Error ? chatErr.message : String(chatErr)
          log("error", "Chat Agent error", { error: errMsg })
          send(ws, { type: "error", errorText: errMsg })
        } finally {
          isProcessing = false
          abortController = null
        }
      } catch (err) {
        isProcessing = false
        abortController = null
        send(ws, { type: "error", errorText: err instanceof Error ? err.message : String(err) })
      }
    })

    ws.on("close", () => {
      questionEmitter.off("ask", askHandler)
      todoEmitter.off("update", todoHandler)
      abortController?.abort()
      log("info", "WebSocket connection closed")
    })
    ws.on("error", (err) => log("error", "WebSocket error", { error: err.message }))
  })
}

function send(ws: WebSocket, msg: WsServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}
