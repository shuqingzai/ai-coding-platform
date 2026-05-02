import { z } from "zod"
import type { ToolDef } from "./types"

async function loadAgentsMd(): Promise<string> {
  try {
    const { loadAgentsMd: lam } = await import("../../ai/context")
    return lam()
  } catch { return "" }
}

export const planTool: ToolDef = {
  id: "plan",
  description: `enter plan mode for structured task planning based on agents.md rules.

when plan mode is active, you should create a comprehensive step-by-step plan before implementing. use this tool to signal entry into plan mode.

rules:
1. read and analyze agents.md for project rules and conventions
2. break down the task into clear, sequential steps
3. present the plan to the user before implementation
4. each step should be independently verifiable`,
  parameters: z.object({
    action: z.enum(["enter", "exit"]).describe("进入或退出计划模式"),
    task: z.string().optional().describe("要计划的任务描述"),
  }),
  async execute(args, ctx) {
    if (args.action === "exit") {
      return { title: "退出计划模式", output: "计划模式已退出。现在开始实现。" }
    }
    const agentsMd = await loadAgentsMd()
    const plan = [
      "# 实现计划",
      "",
      `## 任务: ${args.task || "未指定"}`,
      "",
      "---",
      "",
      "## 项目规则 (AGENTS.md)",
      agentsMd || "无 AGENTS.md 规则",
      "",
      "---",
      "",
      "请根据上面的规则创建详细的逐步实现计划。",
    ].join("\n")
    return { title: "进入计划模式", output: plan }
  },
}
