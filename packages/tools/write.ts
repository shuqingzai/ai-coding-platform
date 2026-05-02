import { z } from "zod"
import fs from "fs/promises"
import path from "path"
import type { ToolDef } from "./types"
import { resolveSafe } from "./types"

export const writeTool: ToolDef = {
  id: "write",
  description: `writes a file to the local filesystem.

usage:
- this tool will overwrite the existing file if there is one at the provided path.
- if this is an existing file, you must use the read tool first to read the file's contents. this tool will fail if you did not read the file first.
- always prefer editing existing files in the codebase. never write new files unless explicitly required.
- never proactively create documentation files (*.md) or readme files. only create documentation files if explicitly requested by the user.
- only use emojis if the user explicitly requests it. avoid writing emojis to files unless asked.`,
  parameters: z.object({
    filePath: z.string().describe("文件路径，相对工作区根目录"),
    content: z.string().describe("要写入的文件内容"),
  }),
  async execute(args, ctx) {
    const filePath = resolveSafe(args.filePath)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, args.content, "utf-8")
    ctx.emitFileChange("write", args.filePath)
    return {
      title: `写入 ${args.filePath}`,
      output: `已写入 ${args.filePath}, ${args.content.length} 字符`,
    }
  },
}
