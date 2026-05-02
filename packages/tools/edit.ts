import { z } from "zod"
import fs from "fs/promises"
import path from "path"
import type { ToolDef } from "./types"
import { resolveSafe } from "./types"

export const editTool: ToolDef = {
  id: "edit",
  description: `performs exact string replacements in files. 

usage:
- you must use your read tool at least once in the conversation before editing. this tool will error if you attempt an edit without reading the file. 
- when editing text from read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears after the line number prefix. the line number prefix format is: line number + colon + space (e.g., \`1: \`). everything after that space is the actual file content to match. never include any part of the line number prefix in the oldString or newString.
- always prefer editing existing files in the codebase. never write new files unless explicitly required.
- only use emojis if the user explicitly requests it. avoid adding emojis to files unless asked.
- the edit will fail if oldString is not found in the file with an error "oldString not found in content".
- the edit will fail if oldString is found multiple times in the file with an error "found multiple matches for oldString". either provide a larger string with more surrounding context to make it unique or use replaceAll to change every instance of oldString. 
- use replaceAll for replacing and renaming strings across the file.`,
  parameters: z.object({
    filePath: z.string().describe("文件路径，相对工作区根目录"),
    oldString: z.string().describe("要查找的文本 (精确匹配)"),
    newString: z.string().describe("替换后的文本"),
    replaceAll: z.boolean().optional().describe("是否替换所有匹配项 (默认 true)"),
  }),
  async execute(args, ctx) {
    const filePath = resolveSafe(args.filePath)
    const content = await fs.readFile(filePath, "utf-8")

    if (!content.includes(args.oldString)) {
      throw new Error(`未找到要替换的内容: "${args.oldString.slice(0, 100)}"`)
    }

    const count = content.split(args.oldString).length - 1
    const replaceAll = args.replaceAll !== false
    const newContent = replaceAll
      ? content.replaceAll(args.oldString, args.newString)
      : content.replace(args.oldString, args.newString)

    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, newContent, "utf-8")
    ctx.emitFileChange("write", args.filePath)

    const actual = replaceAll ? count : 1
    return { title: `编辑 ${args.filePath}`, output: `已编辑 ${args.filePath}: ${actual} 处替换` }
  },
}
