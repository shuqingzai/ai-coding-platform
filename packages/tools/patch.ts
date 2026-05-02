import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function getWorkspaceRoot(): string {
  if (process.env.WORKSPACE_ROOT) {
    return path.resolve(__dirname, "..", "..", process.env.WORKSPACE_ROOT)
  }
  return path.resolve(__dirname, "..", "..", "workspace")
}

function resolveSafe(subPath: string): string {
  const root = getWorkspaceRoot()
  const resolved = path.resolve(root, subPath)
  if (!resolved.startsWith(root)) {
    throw new Error(`Path out of bounds: ${subPath}`)
  }
  return resolved
}

interface PatchOperation {
  action: "add" | "update" | "delete"
  filePath: string
  moveTo?: string
  newLines?: string[]
  hunks?: Array<{
    oldStart: number
    oldCount: number
    newStart: number
    newCount: number
    lines: Array<{ type: "add" | "remove" | "context"; content: string }>
  }>
}

function parsePatch(patchText: string): PatchOperation[] {
  const body = patchText.replace(/^\*\*\* Begin Patch\n?/, "").replace(/\n?\*\*\* End Patch\s*$/, "")
  const operations: PatchOperation[] = []

  const sections = body.split(/\n(?=\*\*\* (?:Add|Delete|Update) File:)/)

  for (const section of sections) {
    const lines = section.split("\n")
    const header = lines[0]
    if (!header) continue

    const addMatch = header.match(/^\*\*\* Add File: (.+)$/)
    if (addMatch) {
      const filePath = addMatch[1].trim()
      const contentLines = lines.slice(1).filter(l => l.startsWith("+")).map(l => l.slice(1))
      operations.push({ action: "add", filePath, newLines: contentLines })
      continue
    }

    const delMatch = header.match(/^\*\*\* Delete File: (.+)$/)
    if (delMatch) {
      operations.push({ action: "delete", filePath: delMatch[1].trim() })
      continue
    }

    const updMatch = header.match(/^\*\*\* Update File: (.+)$/)
    if (updMatch) {
      const filePath = updMatch[1].trim()
      let moveTo: string | undefined
      let hunkStart = 1

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].startsWith("*** Move to:")) {
          moveTo = lines[i].slice(12).trim()
          hunkStart = i + 1
          break
        }
        if (lines[i].startsWith("@@")) {
          hunkStart = i
          break
        }
      }

      const hunks: PatchOperation["hunks"] = []
      let currentHunk: NonNullable<PatchOperation["hunks"]>[0] | null = null

      for (let i = hunkStart; i < lines.length; i++) {
        const line = lines[i]
        const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
        if (hunkMatch) {
          if (currentHunk && currentHunk.lines.length > 0) hunks.push(currentHunk)
          currentHunk = {
            oldStart: parseInt(hunkMatch[1]),
            oldCount: hunkMatch[2] ? parseInt(hunkMatch[2]) : 1,
            newStart: parseInt(hunkMatch[3]),
            newCount: hunkMatch[4] ? parseInt(hunkMatch[4]) : 1,
            lines: [],
          }
        } else if (currentHunk) {
          if (line.startsWith("+")) currentHunk.lines.push({ type: "add", content: line.slice(1) })
          else if (line.startsWith("-")) currentHunk.lines.push({ type: "remove", content: line.slice(1) })
          else if (line.startsWith(" ")) currentHunk.lines.push({ type: "context", content: line.slice(1) })
        }
      }
      if (currentHunk && currentHunk.lines.length > 0) hunks.push(currentHunk)

      operations.push({ action: "update", filePath, moveTo, hunks })
    }
  }

  return operations
}

function applyHunks(original: string[], hunks: NonNullable<PatchOperation["hunks"]>): string[] {
  const result = [...original]
  let offset = 0

  for (const hunk of hunks) {
    const linesToRemove: number[] = []
    const linesToAdd: Array<{ idx: number; content: string }> = []

    let contextIdx = hunk.oldStart - 1 + offset
    for (const hunkLine of hunk.lines) {
      if (hunkLine.type === "context") {
        contextIdx++
      } else if (hunkLine.type === "remove") {
        linesToRemove.push(contextIdx)
        contextIdx++
      } else if (hunkLine.type === "add") {
        linesToAdd.push({ idx: contextIdx, content: hunkLine.content })
      }
    }

    for (const idx of linesToRemove.reverse()) {
      result.splice(idx, 1)
      offset--
    }

    for (const { idx, content } of linesToAdd.sort((a, b) => b.idx - a.idx)) {
      result.splice(idx, 0, content)
      offset++
    }
  }

  return result
}

export async function applyPatch(patchText: string): Promise<string> {
  const operations = parsePatch(patchText)
  const results: string[] = []

  for (const op of operations) {
    const filePath = resolveSafe(op.filePath)

    if (op.action === "add") {
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, (op.newLines || []).join("\n"), "utf-8")
      results.push(`Created: ${op.filePath}`)
    } else if (op.action === "delete") {
      await fs.unlink(filePath)
      results.push(`Deleted: ${op.filePath}`)
    } else if (op.action === "update") {
      const content = await fs.readFile(filePath, "utf-8")
      const originalLines = content.split("\n")
      const newLines = applyHunks(originalLines, op.hunks || [])

      if (op.moveTo) {
        const movePath = resolveSafe(op.moveTo)
        await fs.mkdir(path.dirname(movePath), { recursive: true })
        await fs.writeFile(movePath, newLines.join("\n"), "utf-8")
        await fs.unlink(filePath)
        results.push(`Moved: ${op.filePath} → ${op.moveTo}`)
      } else {
        await fs.writeFile(filePath, newLines.join("\n"), "utf-8")
        results.push(`Updated: ${op.filePath}`)
      }
    }
  }

  return results.join("\n") || "No changes applied"
}
