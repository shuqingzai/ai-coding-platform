import { z } from "zod"
import type { ToolDef } from "./types"

export const invalidTool: ToolDef = {
  id: "invalid",
  description: `fallback tool when the model calls a non-existent or denied tool. this tool should not be directly invoked by the model.`,
  parameters: z.object({
    toolName: z.string().describe("尝试调用的工具名称"),
    reason: z.string().optional().describe("拒绝原因"),
  }),
  async execute(args, ctx) {
    const msg = args.reason
      ? `工具 "${args.toolName}" 不可用: ${args.reason}`
      : `工具 "${args.toolName}" 不存在或已被禁用。请使用可用工具: bash, read, write, edit, grep, glob, webfetch, websearch, question, task, todowrite, skill, apply_patch, lsp, plan`
    return { title: "无效工具调用", output: msg }
  },
}
