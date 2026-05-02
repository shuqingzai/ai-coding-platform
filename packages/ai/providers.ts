import type { ProviderConfig, CustomProviderConfig } from "./types"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createVertex } from "@ai-sdk/google-vertex"
import { createMistral } from "@ai-sdk/mistral"
import { createCohere } from "@ai-sdk/cohere"
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock"
import { createAzure } from "@ai-sdk/azure"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { createGroq } from "@ai-sdk/groq"
import { createXai } from "@ai-sdk/xai"
import { createTogetherAI } from "@ai-sdk/togetherai"
import { createPerplexity } from "@ai-sdk/perplexity"
import { createFireworks } from "@ai-sdk/fireworks"
import { createDeepInfra } from "@ai-sdk/deepinfra"
import { createCerebras } from "@ai-sdk/cerebras"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

// ============ Provider 注册表 ============

export const providerRegistry: Record<string, ProviderConfig> = {
  openai: {
    id: "openai", name: "OpenAI", envKey: "OPENAI_API_KEY",
    modelsEndpoint: "https://api.openai.com/v1/models",
    modelsAuth: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModel: "gpt-4o",
    createProvider: async (apiKey, _extra, modelName) => createOpenAI({ apiKey })(modelName || "gpt-4o"),
  },
  anthropic: {
    id: "anthropic", name: "Anthropic", envKey: "ANTHROPIC_API_KEY",
    modelsEndpoint: "https://api.anthropic.com/v1/models?limit=100",
    modelsAuth: (key) => ({ "x-api-key": key, "anthropic-version": "2023-06-01" }),
    defaultModel: "claude-sonnet-4-20250514",
    createProvider: async (apiKey, _extra, modelName) => createAnthropic({ apiKey })(modelName || "claude-sonnet-4-20250514"),
  },
  google: {
    id: "google", name: "Google AI", envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    modelsEndpoint: "https://generativelanguage.googleapis.com/v1beta/models?key={{key}}",
    defaultModel: "gemini-2.5-flash",
    createProvider: async (apiKey, _extra, modelName) => createGoogleGenerativeAI({ apiKey })(modelName || "gemini-2.5-flash"),
  },
  vertex: {
    id: "vertex", name: "Vertex AI", envKey: "GOOGLE_VERTEX_PROJECT",
    extraEnvKeys: ["GOOGLE_VERTEX_LOCATION"],
    defaultModel: "gemini-2.5-flash",
    createProvider: async (apiKey, extra, modelName) =>
      createVertex({ project: apiKey, location: extra?.["GOOGLE_VERTEX_LOCATION"] ?? "us-central1" })(modelName || "gemini-2.5-flash"),
  },
  mistral: {
    id: "mistral", name: "Mistral", envKey: "MISTRAL_API_KEY",
    modelsEndpoint: "https://api.mistral.ai/v1/models",
    modelsAuth: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModel: "mistral-large-latest",
    createProvider: async (apiKey, _extra, modelName) => createMistral({ apiKey })(modelName || "mistral-large-latest"),
  },
  cohere: {
    id: "cohere", name: "Cohere", envKey: "COHERE_API_KEY",
    defaultModel: "command-r-plus",
    createProvider: async (apiKey, _extra, modelName) => createCohere({ apiKey })(modelName || "command-r-plus"),
  },
  bedrock: {
    id: "bedrock", name: "AWS Bedrock", envKey: "AWS_ACCESS_KEY_ID",
    extraEnvKeys: ["AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
    defaultModel: "us.anthropic.claude-sonnet-4-20250514-v1:0",
    createProvider: async (_, extra, modelName) =>
      createAmazonBedrock({
        region: extra?.["AWS_REGION"] ?? "us-east-1",
        credentialProvider: async () => ({
          accessKeyId: extra?.["AWS_ACCESS_KEY_ID"] ?? "",
          secretAccessKey: extra?.["AWS_SECRET_ACCESS_KEY"] ?? "",
        }),
      })(modelName || "us.anthropic.claude-sonnet-4-20250514-v1:0"),
  },
  azure: {
    id: "azure", name: "Azure OpenAI", envKey: "AZURE_API_KEY",
    extraEnvKeys: ["AZURE_RESOURCE_NAME"],
    defaultModel: "gpt-4o",
    createProvider: async (apiKey, extra, modelName) =>
      createAzure({ apiKey, resourceName: extra?.["AZURE_RESOURCE_NAME"] })(modelName || "gpt-4o"),
  },
  deepseek: {
    id: "deepseek", name: "DeepSeek", envKey: "DEEPSEEK_API_KEY",
    modelsEndpoint: "https://api.deepseek.com/models",
    modelsAuth: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModel: "deepseek-chat",
    createProvider: async (apiKey, _extra, modelName) => createDeepSeek({ apiKey })(modelName || "deepseek-chat"),
  },
  groq: {
    id: "groq", name: "Groq", envKey: "GROQ_API_KEY",
    modelsEndpoint: "https://api.groq.com/openai/v1/models",
    modelsAuth: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModel: "llama-3.3-70b-versatile",
    createProvider: async (apiKey, _extra, modelName) => createGroq({ apiKey })(modelName || "llama-3.3-70b-versatile"),
  },
  xai: {
    id: "xai", name: "xAI Grok", envKey: "XAI_API_KEY",
    modelsEndpoint: "https://api.x.ai/v1/models",
    modelsAuth: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModel: "grok-2-1212",
    createProvider: async (apiKey, _extra, modelName) => createXai({ apiKey })(modelName || "grok-2-1212"),
  },
  togetherai: {
    id: "togetherai", name: "Together AI", envKey: "TOGETHER_AI_API_KEY",
    modelsEndpoint: "https://api.together.xyz/v1/models",
    modelsAuth: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModel: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    createProvider: async (apiKey, _extra, modelName) => createTogetherAI({ apiKey })(modelName || "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"),
  },
  perplexity: {
    id: "perplexity", name: "Perplexity", envKey: "PERPLEXITY_API_KEY",
    defaultModel: "sonar-pro",
    createProvider: async (apiKey, _extra, modelName) => createPerplexity({ apiKey })(modelName || "sonar-pro"),
  },
  fireworks: {
    id: "fireworks", name: "Fireworks AI", envKey: "FIREWORKS_API_KEY",
    defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    createProvider: async (apiKey, _extra, modelName) => createFireworks({ apiKey })(modelName || "accounts/fireworks/models/llama-v3p3-70b-instruct"),
  },
  deepinfra: {
    id: "deepinfra", name: "DeepInfra", envKey: "DEEPINFRA_API_KEY",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct",
    createProvider: async (apiKey, _extra, modelName) => createDeepInfra({ apiKey })(modelName || "meta-llama/Llama-3.3-70B-Instruct"),
  },
  cerebras: {
    id: "cerebras", name: "Cerebras", envKey: "CEREBRAS_API_KEY",
    modelsEndpoint: "https://api.cerebras.ai/v1/models",
    modelsAuth: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModel: "llama3.3-70b",
    createProvider: async (apiKey, _extra, modelName) => createCerebras({ apiKey })(modelName || "llama3.3-70b"),
  },
  // Moonshot AI — OpenAI-compatible 协议
  moonshot: {
    id: "moonshot", name: "Moonshot AI", envKey: "MOONSHOT_API_KEY",
    modelsEndpoint: "https://api.moonshot.cn/v1/models",
    modelsAuth: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModel: "moonshot-v1-8k",
    createProvider: async (apiKey, _extra, modelName) => createOpenAICompatible({ name: "moonshot", apiKey, baseURL: "https://api.moonshot.cn/v1" })(modelName || "moonshot-v1-8k"),
  },
  // 阿里云通义千问 — OpenAI-compatible 协议
  aliyun: {
    id: "aliyun", name: "通义千问", envKey: "DASHSCOPE_API_KEY",
    modelsEndpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/models",
    modelsAuth: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModel: "qwen-plus",
    createProvider: async (apiKey, _extra, modelName) => createOpenAICompatible({ name: "aliyun", apiKey, baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" })(modelName || "qwen-plus"),
  },
}

// ============ 动态模型拉取 ============

/** 模型缓存 */
const modelCache = new Map<string, { models: string[]; expireAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 分钟

// 各 Provider 的响应解析器
interface ModelsResponse {
  parse: (data: any) => string[]
}

const modelParsers: Record<string, ModelsResponse> = {
  // OpenAI-compatible: { data: [{id: "gpt-4o", ...}, ...] }
  openai_compatible: {
    parse: (data) => (data.data || [])
      .filter((m: any) => m.id && !m.id.includes("embed") && !m.id.includes("dall-e") && !m.id.includes("whisper") && !m.id.includes("tts") && !m.id.includes("moderation"))
      .map((m: any) => m.id)
      .sort(),
  },
  // Anthropic: { data: [{id: "claude-sonnet-4-20250514", ...}, ...] }
  anthropic: {
    parse: (data) => (data.data || [])
      .filter((m: any) => m.id?.startsWith("claude"))
      .map((m: any) => m.id)
      .sort(),
  },
  // Google: { models: [{name: "models/gemini-pro", ...}, ...] }
  google: {
    parse: (data) => (data.models || [])
      .filter((m: any) => m.name?.includes("gemini"))
      .map((m: any) => m.name.replace("models/", ""))
      .sort(),
  },
}

/** 动态拉取 Provider 的模型列表 */
export async function fetchProviderModels(providerId: string): Promise<string[]> {
  const config = providerRegistry[providerId]
  if (!config || !config.modelsEndpoint) return getFallbackModels(providerId)

  const apiKey = process.env[config.envKey]
  if (!apiKey) return getFallbackModels(providerId)

  // 检查缓存
  const cached = modelCache.get(providerId)
  if (cached && cached.expireAt > Date.now()) return cached.models

  try {
    const endpoint = config.modelsEndpoint.replace("{{key}}", apiKey)
    const headers: Record<string, string> = config.modelsAuth
      ? { ...config.modelsAuth(apiKey), "Content-Type": "application/json" }
      : { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }

    const res = await fetch(endpoint, { headers, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return getFallbackModels(providerId)

    const data = await res.json()
    const parser = modelParsers[providerId] || modelParsers.openai_compatible
    const models = parser.parse(data).filter((m) => m && m.length > 0)

    if (models.length > 0) {
      modelCache.set(providerId, { models, expireAt: Date.now() + CACHE_TTL })
      return models
    }
  } catch {
    // fetch 失败，使用 fallback
  }

  return getFallbackModels(providerId)
}

/** 无 modelsEndpoint 或拉取失败时的 fallback */
function getFallbackModels(providerId: string): string[] {
  const fallbacks: Record<string, string[]> = {
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o4-mini", "o3", "o3-mini"],
    anthropic: ["claude-sonnet-4-20250514", "claude-3.5-sonnet", "claude-3.5-haiku", "claude-opus-4-20250514"],
    google: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
    vertex: ["gemini-2.5-pro", "gemini-2.5-flash"],
    mistral: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
    cohere: ["command-r-plus", "command-r", "command-a-03-2025"],
    bedrock: ["us.anthropic.claude-sonnet-4-20250514-v1:0"],
    azure: ["gpt-4o", "gpt-4o-mini"],
    deepseek: ["deepseek-chat", "deepseek-reasoner"],
    groq: ["llama-3.3-70b-versatile", "llama-4-scout-17b-16e-instruct", "deepseek-r1-distill-llama-70b"],
    xai: ["grok-2-1212", "grok-3-mini"],
    togetherai: ["meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8", "deepseek-ai/DeepSeek-V3"],
    perplexity: ["sonar-pro", "sonar-reasoning"],
    fireworks: ["accounts/fireworks/models/llama-v3p3-70b-instruct"],
    deepinfra: ["meta-llama/Llama-3.3-70B-Instruct", "deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"],
    cerebras: ["llama3.1-8b", "llama3.1-70b", "llama3.3-70b"],
    moonshot: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    aliyun: ["qwen-plus", "qwen-turbo", "qwen-max", "qwen-max-longcontext"],
  }
  return fallbacks[providerId] || [providerRegistry[providerId]?.defaultModel || providerId]
}

// ============ 自定义 Provider ============

const customProviders = new Map<string, CustomProviderConfig>()

export function registerCustomProvider(config: CustomProviderConfig): CustomProviderConfig {
  if (customProviders.has(config.id)) {
    throw new Error(`服务商 "${config.id}" 已存在，请使用不同名称`)
  }
  if (!config.models || config.models.length === 0) {
    throw new Error("自定义服务商必须指定至少一个模型")
  }
  customProviders.set(config.id, config)
  return config
}

export function unregisterCustomProvider(id: string): boolean {
  return customProviders.delete(id)
}

export function getCustomProviders(): CustomProviderConfig[] {
  return Array.from(customProviders.values())
}

// ============ 公共 API ============

export function getAvailableProviders(): {
  id: string; name: string; models: string[]; configured: boolean; isCustom?: boolean; supportsModelFetch?: boolean; defaultModel: string
}[] {
  const official = Object.values(providerRegistry).map((p) => ({
    id: p.id, name: p.name,
    models: getFallbackModels(p.id),
    configured: !!process.env[p.envKey],
    isCustom: false,
    supportsModelFetch: !!p.modelsEndpoint,
    defaultModel: p.defaultModel,
  }))
  const custom = getCustomProviders().map((c) => ({
    id: c.id, name: c.name, models: c.models,
    configured: true, isCustom: true, supportsModelFetch: false,
    defaultModel: c.models[0] || c.id,
  }))
  return [...official, ...custom]
}

/** 获取默认服务商：优先使用已配置的服务商，从中随机选取 */
export function getDefaultProvider(preferredProvider?: string): string {
  const configured = getAvailableProviders().filter((p) => p.configured)
  // 如果有用户指定的偏好服务商且已配置，优先使用
  if (preferredProvider && configured.some((p) => p.id === preferredProvider)) {
    return preferredProvider
  }
  // 从已配置的服务商中随机选取
  if (configured.length > 0) {
    return configured[Math.floor(Math.random() * configured.length)].id
  }
  return "openai"
}

/** 根据模型名称推断所属 Provider ID */
export function inferProviderFromModel(modelName: string): string {
  if (!modelName) return "openai"
  const lower = modelName.toLowerCase()

  // 按模型前缀匹配官方 Provider
  if (lower.startsWith("claude")) return "anthropic"
  if (lower.startsWith("gpt-") || lower.startsWith("o1-") || lower.startsWith("o3-") || lower.startsWith("o4-") || lower.startsWith("o1") || lower.startsWith("o3") || lower.startsWith("o4")) return "openai"
  if (lower.startsWith("gemini")) return lower.includes("vertex") ? "vertex" : "google"
  if (lower.startsWith("deepseek")) return "deepseek"
  if (lower.startsWith("grok")) return "xai"
  if (lower.startsWith("mistral") || lower.startsWith("codestral") || lower.startsWith("pixtral")) return "mistral"
  if (lower.startsWith("command")) return "cohere"
  if (lower.startsWith("llama") || lower.startsWith("mixtral") || lower.startsWith("meta-llama")) return "groq"
  if (lower.startsWith("sonar")) return "perplexity"
  if (lower.startsWith("moonshot")) return "moonshot"
  if (lower.startsWith("qwen")) return "aliyun"
  if (lower.includes("/") && !lower.startsWith("accounts/")) return "togetherai"
  if (lower.startsWith("accounts/")) return "fireworks"

  // 查找自定义 Provider 的模型
  for (const custom of getCustomProviders()) {
    if (custom.models.some((m) => m.toLowerCase() === lower)) return custom.id
  }

  // 查找 fallback 模型
  for (const [providerId, models] of Object.entries({
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1"],
    anthropic: ["claude-sonnet-4-20250514", "claude-3.5-sonnet"],
    deepseek: ["deepseek-chat", "deepseek-reasoner"],
    xai: ["grok-2-1212", "grok-3-mini"],
  })) {
    if (models.some((m) => m.toLowerCase() === lower)) return providerId
  }

  return "openai"
}

/** 统一模型解析：根据 providerId 和 apiKey 创建 AI SDK 模型实例 */
export async function resolveModel(providerId: string, apiKey?: string, modelName?: string): Promise<any> {
  // 先查官方 Provider
  const config = providerRegistry[providerId]
  if (config) {
    const key = apiKey || process.env[config.envKey]
    if (!key) throw new Error(`服务商 ${config.name} 缺少 API Key。请设置环境变量 ${config.envKey}`)
    const extra: Record<string, string> = {}
    if (config.extraEnvKeys) {
      for (const ek of config.extraEnvKeys) {
        const v = process.env[ek]
        if (v) extra[ek] = v
      }
    }
    return config.createProvider(key, extra, modelName)
  }

  // 查自定义 Provider
  const custom = getCustomProviders().find((c) => c.id === providerId)
  if (custom) {
    return createCustomModel(custom, modelName)
  }

  throw new Error(`未知服务商: ${providerId}。可用: ${Object.keys(providerRegistry).join(", ")} 及自定义服务商`)
}

/** 根据 CustomProviderConfig 创建模型 (支持 OpenAI Responses/Completions + Anthropic) */
export function createCustomModel(config: CustomProviderConfig, modelName?: string): any {
  const actualModel = modelName || config.models[0] || config.id

  // Anthropic 协议
  if (config.protocol === "anthropic") {
    const { createAnthropic } = require("@ai-sdk/anthropic")
    return createAnthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      headers: config.headers ? JSON.parse(config.headers) : undefined,
    })(actualModel)
  }

  // OpenAI Responses API (默认，@ai-sdk/openai)
  if (config.apiStyle === "responses") {
    return createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      headers: config.headers ? JSON.parse(config.headers) : undefined,
    })(actualModel)
  }

  // OpenAI Completions API (@ai-sdk/openai-compatible)
  return createOpenAICompatible({
    name: config.id,
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    headers: config.headers ? JSON.parse(config.headers) : undefined,
  })(actualModel)
}
