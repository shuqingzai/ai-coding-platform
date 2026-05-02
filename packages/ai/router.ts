import { generateText } from "ai"
import { resolveModel } from "./providers"
import type { ChatMessage } from "./types"

export async function callAI(options: {
  provider: string
  messages: ChatMessage[]
  apiKey?: string
}) {
  const model = await resolveModel(options.provider, options.apiKey)
  const result = await generateText({ model, messages: options.messages as any })
  return {
    text: result.text,
    usage: {
      promptTokens: (result.usage as any)?.promptTokens ?? 0,
      completionTokens: (result.usage as any)?.completionTokens ?? 0,
    },
  }
}
