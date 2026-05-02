export function validateEnv(): void {
  const aiKeys = [
    "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY",
    "MISTRAL_API_KEY", "COHERE_API_KEY", "DEEPSEEK_API_KEY",
    "GROQ_API_KEY", "XAI_API_KEY", "TOGETHER_AI_API_KEY",
    "PERPLEXITY_API_KEY", "FIREWORKS_API_KEY", "DEEPINFRA_API_KEY",
    "CEREBRAS_API_KEY", "MOONSHOT_API_KEY", "DASHSCOPE_API_KEY",
  ]
  const configured = aiKeys.filter((k) => process.env[k])

  if (configured.length === 0) {
    console.warn("[env] 未配置任何 AI 服务商 API Key。请在 .env 中设置至少一个。")
  } else {
    console.log(`[env] 已配置 ${configured.length} 个 AI 服务商`)
  }

  if (!process.env.WORKSPACE_ROOT) {
    console.log("[env] WORKSPACE_ROOT 未设置，使用默认值 ./workspace")
  }
}
