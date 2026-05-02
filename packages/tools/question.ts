/**
 * Question 工具 — 在执行过程中向用户提问
 * 通过 EventEmitter 推送问题给前端，等待用户响应后 resolve
 */

import { z } from "zod"
import { EventEmitter } from "events"
import type { ToolDef } from "./types"

export const questionEmitter = new EventEmitter()
questionEmitter.setMaxListeners(100)

export const questionTool: ToolDef = {
  id: "question",
  description: `use this tool when you need to ask the user questions during execution. this allows you to:
1. gather user preferences or requirements
2. clarify ambiguous instructions
3. get decisions on implementation choices as you work
4. offer choices to the user about what direction to take.

usage notes:
- when custom is enabled (default), a "type your own answer" option is added automatically; don't include "other" or catch-all options
- answers are returned as arrays of labels; set multiple: true to allow selecting more than one
- if you recommend a specific option, make that the first option in the list and add "(recommended)" at the end of the label`,
  parameters: z.object({
    questions: z.array(z.object({
      question: z.string().describe("问题内容"),
      header: z.string().describe("简短标签 (30 字以内)"),
      options: z.array(z.object({
        label: z.string().describe("显示文本"),
        description: z.string().describe("选项说明"),
      })),
      multiple: z.boolean().optional().describe("允许多选"),
    })),
  }),
  execute(args, ctx) {
    return new Promise((resolve) => {
      const callId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      questionEmitter.emit("ask", { callId, questions: args.questions, resolve })
    })
  },
}
