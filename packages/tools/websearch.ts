import { z } from "zod"
import type { ToolDef } from "./types"

// 5 分钟内存缓存
interface CacheEntry { results: string; timestamp: number }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000

export const websearchTool: ToolDef = {
  id: "websearch",
  description: `web search api that works just like google search.

search strategy:
- if no useful results are returned, try rephrasing your query with different keywords.

returns a json object containing organic results with titles, links, snippets, dates, and related search queries.`,
  parameters: z.object({
    query: z.string().describe("搜索关键词, 3-5 个关键词效果最好"),
  }),
  async execute(args, ctx) {
    const key = args.query.trim().toLowerCase()
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return {
        title: `websearch: ${args.query}`,
        output: `${cached.results}\n\n(缓存, ${Math.round((Date.now() - cached.timestamp) / 1000)} 秒前)`,
      }
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1&skip_disambig=1`,
        { signal: controller.signal }
      )
      clearTimeout(timeout)

      const data = await response.json() as any
      const results: string[] = []

      if (data.AbstractText) {
        results.push(`摘要: ${data.AbstractText}`)
        if (data.AbstractURL) results.push(`来源: ${data.AbstractURL}`)
      }

      if (data.RelatedTopics?.length) {
        results.push("\n相关结果:")
        for (const topic of data.RelatedTopics.slice(0, 5)) {
          if (topic.Text) {
            results.push(`- ${topic.Text}`)
            if (topic.FirstURL) results.push(`  ${topic.FirstURL}`)
          }
        }
      }

      const result = results.join("\n") || `未找到 "${args.query}" 的结果`
      cache.set(key, { results: result, timestamp: Date.now() })
      return { title: `websearch: ${args.query}`, output: result }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { title: `websearch: ${args.query}`, output: `搜索超时: "${args.query}"` }
      }
      return { title: `websearch: ${args.query}`, output: `搜索错误: ${err.message}` }
    }
  },
}
