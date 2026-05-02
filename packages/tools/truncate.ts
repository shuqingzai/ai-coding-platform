import { writeFile, mkdir } from "fs/promises"
import path from "path"

const MAX_LINES = 2000
const MAX_BYTES = 50 * 1024

export async function truncateOutput(output: string, toolName: string): Promise<{
  content: string
  truncated: boolean
  outputPath?: string
}> {
  const lines = output.split("\n")
  const bytes = Buffer.byteLength(output, "utf-8")

  if (lines.length <= MAX_LINES && bytes <= MAX_BYTES) {
    return { content: output, truncated: false }
  }

  const truncatedContent = lines.slice(0, MAX_LINES).join("\n").slice(0, MAX_BYTES)

  const tmpDir = path.join(process.cwd(), "tmp")
  await mkdir(tmpDir, { recursive: true })
  const tmpFile = path.join(tmpDir, `tool_${toolName}_${Date.now()}.txt`)
  await writeFile(tmpFile, output, "utf-8")

  return {
    content: `${truncatedContent}\n\n(输出已截断: ${lines.length} 行 / ${(bytes / 1024).toFixed(1)}KB, 完整内容: ${tmpFile})`,
    truncated: true,
    outputPath: tmpFile,
  }
}
