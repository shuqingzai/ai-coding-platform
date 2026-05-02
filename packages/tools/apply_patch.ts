import { z } from "zod"
import type { ToolDef } from "./types"
import { applyPatch } from "./patch"

export const applyPatchTool: ToolDef = {
  id: "apply_patch",
  description: `edit files using the apply_patch tool. patch language is a concise, file-oriented diff format:

*** begin patch
[one or more file sections]
*** end patch

each operation starts with one of three headers:
*** add file: <path> — create a new file. every line after is a + line (initial content)
*** delete file: <path> — delete an existing file. no content follows
*** update file: <path> — patch an existing file in place (optional rename)

example patch:
*** begin patch
*** add file: hello.txt
+hello world
*** update file: src/app.py
*** move to: src/main.py
@@ def greet():
-print("hi")
+print("hello, world!")
*** delete file: obsolete.txt
*** end patch

important rules:
- must include a header declaring your intended operation (add/delete/update)
- new lines must be prefixed with + even when creating new files`,
  parameters: z.object({
    patchText: z.string().describe("完整补丁文本，以 *** begin patch 开头，以 *** end patch 结尾"),
  }),
  async execute(args, ctx) {
    const result = await applyPatch(args.patchText)
    // 推送文件变更通知
    const ops = args.patchText.match(/\*\*\* (add|delete|update) file: (.+)/gi)
    if (ops) {
      for (const op of ops) {
        const match = op.match(/\*\*\* (add|delete|update) file: (.+)/i)
        if (match) {
          const action = match[1].toLowerCase() === "delete" ? "delete" : "write"
          ctx.emitFileChange(action as any, match[2].trim())
        }
      }
    }
    return { title: "应用补丁", output: result || "无变更" }
  },
}
