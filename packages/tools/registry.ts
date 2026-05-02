import { tool, jsonSchema } from "ai"
import { z } from "zod"
import type { ToolDef, ToolContext } from "./types"

function toAISDKTool(def: ToolDef, ctx: ToolContext): any {
  return tool({
    description: def.description,
    inputSchema: jsonSchema(z.toJSONSchema(def.parameters as z.ZodType<any>) as any),
    execute: async (args: any) => {
      const result = await def.execute(args, ctx)
      return result.output
    },
  })
}

export function createToolRegistry() {
  const tools = new Map<string, ToolDef>()

  return {
    register(tool: ToolDef) {
      tools.set(tool.id, tool)
    },

    get(id: string): ToolDef | undefined {
      return tools.get(id)
    },

    getAll(): ToolDef[] {
      return [...tools.values()]
    },

    /** 获取 AI SDK v6 streamText() 可用的 tools 对象 */
    getAISDKTools(ctx: ToolContext): Record<string, any> {
      const result: Record<string, any> = {}
      for (const [id, def] of tools) {
        result[id] = toAISDKTool(def, ctx)
      }
      return result
    },

    /** 获取排除指定工具的 AI SDK tools (供 subagent 使用) */
    getAISDKToolsExcluding(ctx: ToolContext, exclude: string[]): Record<string, any> {
      const result: Record<string, any> = {}
      for (const [id, def] of tools) {
        if (!exclude.includes(id)) {
          result[id] = toAISDKTool(def, ctx)
        }
      }
      return result
    },
  }
}

export type ToolRegistry = ReturnType<typeof createToolRegistry>
