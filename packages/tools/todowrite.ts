/**
 * TodoWrite 工具 — 创建和管理结构化任务列表
 * 通过 EventEmitter 实时推送任务变更给前端
 */

import { z } from "zod"
import { EventEmitter } from "events"
import type { ToolDef } from "./types"

export interface TodoItem { content: string; status: string; priority: string }
export const todoEmitter = new EventEmitter()
todoEmitter.setMaxListeners(50)

const sessionTodos = new Map<string, TodoItem[]>()

export const todowriteTool: ToolDef = {
  id: "todowrite",
  description: `use this tool to create and manage a structured task list for your current coding session. this helps you track progress, organize complex tasks, and demonstrate thoroughness to the user.
it also helps the user understand the progress of the task and overall progress of their requests.

## when to use this tool
use this tool proactively in these scenarios:

1. complex multistep tasks - when a task requires 3 or more distinct steps or actions
2. non-trivial and complex tasks - tasks that require careful planning or multiple operations
3. user explicitly requests todo list - when the user directly asks you to use the todo list
4. user provides multiple tasks - when users provide a list of things to be done (numbered or comma-separated)
5. after receiving new instructions - immediately capture user requirements as todos. feel free to edit the todo list based on new information.
6. after completing a task - mark it complete and add any new follow-up tasks
7. when you start working on a new task, mark the todo as in_progress. ideally you should only have one todo as in_progress at a time. complete existing tasks before starting new ones.

## task states and management
1. **task states**: use these states to track progress:
   - pending: task not yet started
   - in_progress: currently working on (limit to one task at a time)
   - completed: task finished successfully
   - cancelled: task no longer needed

2. **task management**:
   - update task status in real-time as you work
   - mark tasks complete immediately after finishing (don't batch completions)
   - only have one task in_progress at any time
   - complete current tasks before starting new ones
   - cancel tasks that become irrelevant

when in doubt, use this tool. being proactive with task management demonstrates attentiveness and ensures you complete all requirements successfully.

note that you should not use this tool if there is only one trivial task to do. in this case you are better off just doing the task directly.`,
  parameters: z.object({
    todos: z.array(z.object({
      content: z.string().describe("任务描述"),
      status: z.string().describe("状态: pending, in_progress, completed, cancelled"),
      priority: z.string().describe("优先级: high, medium, low"),
    })),
  }),
  execute(args, ctx) {
    sessionTodos.set(ctx.sessionId, args.todos)
    todoEmitter.emit("update", args.todos)
    const pending = args.todos.filter(t => t.status !== "completed").length
    return Promise.resolve({
      title: "更新任务列表",
      output: `任务列表已更新 (${args.todos.length} 项, ${pending} 项待处理)`,
    })
  },
}
