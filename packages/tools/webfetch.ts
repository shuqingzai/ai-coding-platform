import { z } from "zod"
import type { ToolDef } from "./types"

export const webfetchTool: ToolDef = {
  id: "webfetch",
  description: `fetches content from a specified url
- takes a url and optional format as input
- fetches the url content, converts to requested format (markdown by default)
- returns the content in the specified format
- use this tool when you need to retrieve and analyze web content

usage notes:
- important: if another tool is present that offers better web fetching capabilities, is more targeted to the task, or has fewer restrictions, prefer using that tool instead of this one.
- the url must be a fully-formed valid url
- http urls will be automatically upgraded to https
- format options: "markdown" (default), "text", or "html"
- this tool is read-only and does not modify any files
- results may be summarized if the content is very large`,
  parameters: z.object({
    url: z.string().describe("目标 URL (必须以 http:// 或 https:// 开头)"),
    format: z.string().optional().describe("返回格式: markdown (默认), text, html"),
    timeout: z.number().optional().describe("超时秒数, 默认 30, 最大 120"),
  }),
  async execute(args, ctx) {
    const response = await fetch(args.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ai-coding-platform/1.0)" },
      signal: AbortSignal.timeout(Math.min(args.timeout || 30, 120) * 1000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = await response.text()
    if (body.length > 5 * 1024 * 1024) throw new Error("响应内容过大 (超过 5MB)")

    const format = args.format || "markdown"
    if (format === "markdown") {
      try {
        const TurndownService = (await import("turndown")).default
        const turndown = new TurndownService({ headingStyle: "atx" })
        return { title: `webfetch: ${args.url}`, output: turndown.turndown(body) }
      } catch {
        return { title: `webfetch: ${args.url}`, output: body }
      }
    }
    if (format === "text") {
      return {
        title: `webfetch: ${args.url}`,
        output: body.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
      }
    }
    return { title: `webfetch: ${args.url}`, output: body }
  },
}
