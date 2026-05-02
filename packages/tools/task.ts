import { z } from "zod"
import type { ToolDef, ToolContext } from "./types"

// task 工具的实际执行器，由 chat.ts 在运行时注入
let _taskExecutor: ((args: { 
  description: string; prompt: string; subagent_type: string
  task_id?: string; command?: string 
}, ctx: ToolContext) => Promise<string>) | null = null

export function setTaskExecutor(fn: typeof _taskExecutor) {
  _taskExecutor = fn
}

export const taskTool: ToolDef = {
  id: "task",
  description: `launch a new agent to handle complex, multistep tasks autonomously.

when using the task tool, you must specify a subagent_type parameter to select which agent type to use.

when to use the task tool:
- when you are instructed to execute custom slash commands. use the task tool with the slash command invocation as the entire prompt. the slash command can take arguments.
- for complex multistep tasks that require autonomous execution

when not to use the task tool:
- if you want to read a specific file path, use the read or glob tool instead
- if you are searching for a specific class definition, use the glob tool instead
- if you are searching for code within a specific file or set of 2-3 files, use the read tool instead
- other tasks that are not related to the agent descriptions above

usage notes:
1. launch multiple agents concurrently whenever possible, to maximize performance; use a single message with multiple tool uses
2. when the agent is done, it will return a single message back to you. the result returned by the agent is not visible to the user. to show the user the result, you should send a text message back to the user with a concise summary of the result. the output includes a task_id you can reuse later to continue the same subagent session.
3. each agent invocation starts with a fresh context unless you provide task_id to resume the same subagent session (which continues with its previous messages and tool outputs). when starting fresh, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.
4. the agent's outputs should generally be trusted
5. clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user's intent. tell it how to verify its work if possible.
6. if the agent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first. use your judgement.`,
  parameters: z.object({
    description: z.string().describe("简短描述 (3-5 字)"),
    prompt: z.string().describe("子代理任务指令"),
    subagent_type: z.string().describe("子代理类型: general"),
    task_id: z.string().optional().describe("恢复此任务的会话"),
    command: z.string().optional().describe("触发此任务的斜线命令"),
  }),
  async execute(args, ctx) {
    if (!_taskExecutor) {
      throw new Error("task 执行器未注入 — 请确保 chat.ts 已调用 setTaskExecutor()")
    }
    const output = await _taskExecutor(args, ctx)
    return { title: `子代理: ${args.description}`, output }
  },
}
