/**
 * Skill 加载工具 — 从工作区 .agents/skills/ 目录加载技能标记语言文档
 * 复用 packages/ai/context.ts 中的 loadSkills 函数
 */

import { z } from "zod"
import type { ToolDef } from "./types"

async function loadSkills(): Promise<any[]> {
  const { loadSkills: ls } = await import("../../ai/context")
  return ls()
}

export const skillTool: ToolDef = {
  id: "skill",
  description: `load a specialized skill when the task at hand matches one of the skills listed in the system prompt.

use this tool to inject the skill's instructions and resources into current conversation. the output may contain detailed workflow guidance as well as references to scripts, files, etc in the same directory as the skill.

the skill name must match one of the skills listed in your system prompt.

load a specialized skill that provides domain-specific instructions and workflows.

when you recognize that a task matches one of the available skills listed below, use this tool to load the full skill instructions.

the skill will inject detailed instructions, workflows, and access to bundled resources (scripts, references, templates) into the conversation context.

tool output includes a <skill_content name="..."> block with the loaded content.`,
  parameters: z.object({
    name: z.string().describe("技能名称"),
  }),
  async execute(args, ctx) {
    const skills = await loadSkills()
    const skill = skills.find((s) => s.name === args.name)
    if (!skill) {
      throw new Error(`技能 "${args.name}" 未找到。可用: ${skills.map(s => s.name).join(", ") || "无"}`)
    }
    return { title: `加载技能: ${args.name}`, output: skill.output }
  },
}
