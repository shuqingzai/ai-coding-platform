import { Hono } from "hono"
import { fileTool } from "../../../../packages/tools/file"

export const filesRoute = new Hono()
  .get("/files", async (c) => {
    let subPath = c.req.query("path") || ""
    // 规范化: 移除前导 "/" (路径越界检查会基于 WORKSPACE_ROOT)
    if (subPath === "/" || subPath === "") subPath = ""
    else if (subPath.startsWith("/")) subPath = subPath.slice(1)
    try {
      const isDir = subPath.endsWith("/") || subPath === "" || !subPath.includes(".")
      if (isDir) {
        const tree = await fileTool.tree(subPath)
        return c.json({ data: tree })
      } else {
        const content = await fileTool.read(subPath)
        return c.json({ data: { path: subPath, content } })
      }
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "读取文件失败" }, 404)
    }
  })
  .post("/files", async (c) => {
    const { path: filePath, content } = await c.req.json()
    if (!filePath || content === undefined) {
      return c.json({ error: "缺少 path 或 content" }, 400)
    }
    try {
      await fileTool.write(filePath, content)
      return c.json({ ok: true, path: filePath })
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "写入文件失败" }, 500)
    }
  })
