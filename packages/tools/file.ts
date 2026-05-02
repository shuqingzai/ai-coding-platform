import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

// 获取项目根目录 (packages/tools/file.ts → 上溯到 repo root)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

function getWorkspaceRoot(): string {
  if (process.env.WORKSPACE_ROOT) {
    // 环境变量路径相对于项目根目录
    return path.resolve(__dirname, "..", "..", process.env.WORKSPACE_ROOT)
  }
  return path.resolve(__dirname, "..", "..", "workspace")
}

function resolveSafe(subPath: string): string {
  const root = getWorkspaceRoot()
  const resolved = path.resolve(root, subPath)
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`路径越界: ${subPath}`)
  }
  return resolved
}

export const fileTool = {
  async read(subPath: string): Promise<string> {
    const filePath = resolveSafe(subPath)
    return fs.readFile(filePath, "utf-8")
  },

  async write(subPath: string, content: string): Promise<void> {
    const filePath = resolveSafe(subPath)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, "utf-8")
  },

  async list(subPath: string): Promise<string[]> {
    const dirPath = resolveSafe(subPath)
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name)).sort()
  },

  async tree(subPath: string = ""): Promise<any[]> {
    const dirPath = resolveSafe(subPath)
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const result: any[] = []

    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue
      const entryPath = subPath ? `${subPath}/${e.name}` : e.name
      if (e.isDirectory()) {
        const children = await this.tree(entryPath)
        if (children.length > 0) {
          result.push({ name: e.name, path: entryPath, type: "directory", children })
        }
      } else {
        result.push({ name: e.name, path: entryPath, type: "file" })
      }
    }

    return result
  },

  async glob(pattern: string, subPath: string = ""): Promise<string> {
    const root = resolveSafe(subPath)
    const { glob: tinyGlob } = await import("tinyglobby")
    const files = await tinyGlob([pattern], {
      cwd: root,
      absolute: true,
      ignore: ["node_modules/**", ".git/**"],
      onlyFiles: true,
    })
    if (files.length === 0) return "未找到匹配文件"
    return files.slice(0, 100).join("\n") +
      (files.length > 100 ? `\n\n(结果已截断，显示前 100 条，共 ${files.length} 条)` : "")
  },

  async grep(pattern: string, subPath: string = "", include?: string): Promise<string> {
    const root = resolveSafe(subPath)
    try {
      const { execSync } = await import("child_process")
      const includeFlag = include ? `--include="${include}"` : `--include="*.{ts,tsx,js,jsx,json,md,css,html,py,rs,go,yaml,yml,toml,sh}"`
      const result = execSync(
        `grep -rn ${includeFlag} "${pattern.replace(/"/g, '\\"')}" "${root}"`,
        { encoding: "utf-8", timeout: 10000, maxBuffer: 10 * 1024 * 1024 }
      )
      return result || "未找到匹配项"
    } catch (e: any) {
      if (e.status === 1) return "未找到匹配项"
      throw e
    }
  },

  async edit(subPath: string, find: string, replace: string): Promise<string> {
    const content = await this.read(subPath)
    if (!content.includes(find)) {
      throw new Error(`未找到要替换的内容`)
    }
    const count = content.split(find).length - 1
    const newContent = content.replaceAll(find, replace)
    await this.write(subPath, newContent)
    return `已编辑 ${subPath}: ${count} 处替换成功`
  },
}
