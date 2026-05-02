import { z } from "zod"
import type { ToolDef } from "./types"
import { fileTool } from "./file"

export const globTool: ToolDef = {
  id: "glob",
  description: `fast file pattern matching tool that works with any codebase size
- supports glob patterns like "**/*.js" or "src/**/*.ts"
- returns matching file paths sorted by modification time
- use this tool when you need to find files by name patterns
- when you are doing an open-ended search that may require multiple rounds of globbing and grepping, use the task tool instead
- you can call multiple tools in a single response. it is always better to speculatively perform multiple searches as a batch`,
  parameters: z.object({
    pattern: z.string().describe("glob 模式，如 **/*.ts, src/**/*.tsx"),
    path: z.string().optional().describe("搜索目录，默认工作区根"),
  }),
  async execute(args, ctx) {
    const result = await fileTool.glob(args.pattern, args.path || "")
    return { title: `glob: ${args.pattern}`, output: result }
  },
}
