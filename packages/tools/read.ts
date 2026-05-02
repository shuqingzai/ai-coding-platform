import { z } from "zod"
import fs from "fs/promises"
import type { ToolDef } from "./types"
import { resolveSafe } from "./types"

export const readTool: ToolDef = {
  id: "read",
  description: `read a file or directory from the local filesystem. if the path does not exist, an error is returned.

usage:
- the filePath parameter should be an absolute path.
- by default, this tool returns up to 2000 lines from the start of the file.
- the offset parameter is the line number to start from (1-indexed).
- to read later sections, call this tool again with a larger offset.
- use the grep tool to find specific content in large files or files with long lines.
- if you are unsure of the correct file path, use the glob tool to look up filenames by glob pattern.
- contents are returned with each line prefixed by its line number as \`<line>: <content>\`.
- for directories, entries are returned one per line with a trailing \`/\` for subdirectories.
- any line longer than 2000 characters is truncated.
- call this tool in parallel when you know there are multiple files you want to read.
- avoid tiny repeated slices (30 line chunks). if you need more context, read a larger window.
- this tool can read image files and pdfs and return them as file attachments.`,
  parameters: z.object({
    filePath: z.string().describe("文件路径，相对工作区根目录"),
    offset: z.number().optional().describe("起始行号 (1-indexed)"),
    limit: z.number().optional().describe("最大行数"),
  }),
  async execute(args, ctx) {
    const resolved = resolveSafe(args.filePath)
    const stat = await fs.stat(resolved)

    if (stat.isDirectory()) {
      const entries = await fs.readdir(resolved, { withFileTypes: true })
      const result = entries
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
        .sort()
        .join("\n")
      return { title: `列出 ${args.filePath}`, output: result || "(空目录)" }
    }

    const content = await fs.readFile(resolved, "utf-8")
    const lines = content.split("\n")
    const start = (args.offset || 1) - 1
    const end = args.limit ? start + args.limit : lines.length
    const result = lines
      .slice(start, end)
      .map((line, i) => `${start + i + 1}: ${line}`)
      .join("\n")
    return { title: `读取 ${args.filePath}`, output: result }
  },
}
