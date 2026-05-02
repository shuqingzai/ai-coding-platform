import { z } from "zod"
import type { ToolDef } from "./types"
import { fileTool } from "./file"

export const grepTool: ToolDef = {
  id: "grep",
  description: `fast content search tool that works with any codebase size
- searches file contents using regular expressions
- supports full regex syntax (eg. "log.*error", "function\\s+\\w+", etc.)
- filter files by pattern with the include parameter (eg. "*.js", "*.{ts,tsx}")
- returns file paths and line numbers with at least one match sorted by modification time
- use this tool when you need to find files containing specific patterns
- if you need to identify/count the number of matches within files, use the bash tool with rg (ripgrep) directly. do not use grep.
- when you are doing an open-ended search that may require multiple rounds of globbing and grepping, use the task tool instead`,
  parameters: z.object({
    pattern: z.string().describe("搜索模式 (正则表达式)"),
    path: z.string().optional().describe("搜索目录，默认工作区根"),
    include: z.string().optional().describe("文件类型过滤，如 *.ts, *.{ts,tsx}"),
  }),
  async execute(args, ctx) {
    const result = await fileTool.grep(args.pattern, args.path || "", args.include)
    return { title: `grep: ${args.pattern}`, output: result }
  },
}
