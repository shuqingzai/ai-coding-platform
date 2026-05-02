import fs from "fs/promises"
import path from "path"
import { getWorkspaceRoot } from "../tools"

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true } catch { return false }
}

interface SkillInfo { name: string; description: string; content: string; output: string; dir: string; files: string[] }

export async function loadAgentsMd(dir?: string, depth = 3): Promise<string> {
  const root = dir || getWorkspaceRoot()
  if (depth <= 0 || root.includes("node_modules") || root.includes(".git")) return ""
  let result = ""
  const agents = path.join(root, "AGENTS.md")
  if (await fileExists(agents)) {
    const content = await fs.readFile(agents, "utf-8")
    const relPath = path.relative(getWorkspaceRoot(), root) || "."
    result += `\n<!-- AGENTS.md from ${relPath} -->\n${content}\n`
  }
  try {
    const entries = await fs.readdir(root, { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== ".git") {
        result += await loadAgentsMd(path.join(root, e.name), depth - 1)
      }
    }
  } catch {}
  return result
}

export async function loadSkills(): Promise<SkillInfo[]> {
  const skillsDir = path.join(getWorkspaceRoot(), ".agents", "skills")
  if (!await fileExists(skillsDir)) return []

  const result: SkillInfo[] = []
  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true })
    for (const e of entries) {
      if (!e.isDirectory()) continue
      const skillDir = path.join(skillsDir, e.name)
      const skillMd = path.join(skillDir, "SKILL.md")
      if (!await fileExists(skillMd)) continue

      const content = await fs.readFile(skillMd, "utf-8")
      const lines = content.split("\n")
      let description = "无描述"
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("<")) {
          description = trimmed.slice(0, 120)
          break
        }
      }

      const base = `file://${skillDir}`
      const output = [
        `<skill_content name="${e.name}">`,
        `# Skill: ${e.name}`,
        "",
        content.trim(),
        "",
        `Base directory for this skill: ${base}`,
        "Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.",
        "Note: file list is sampled.",
        "</skill_content>",
      ].join("\n")

      let files: string[] = []
      try {
        const dirEntries = await fs.readdir(skillDir, { withFileTypes: true, recursive: true })
        files = dirEntries
          .filter((d) => d.isFile() && d.name !== "SKILL.md")
          .slice(0, 10)
          .map((d) => path.join(d.parentPath || skillDir, d.name))
      } catch {}

      result.push({ name: e.name, description, content, output, dir: skillDir, files })
    }
  } catch {}
  return result
}
