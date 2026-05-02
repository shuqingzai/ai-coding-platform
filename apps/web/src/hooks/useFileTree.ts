import { useState, useCallback, useEffect } from "react"
import type { FileNode } from "../types"
import { API_BASE } from "../lib/constants"

export function useFileTree() {
  const [tree, setTree] = useState<FileNode[]>([])
  const [selectedPath, setSelectedPath] = useState<string>("")
  const [fileContent, setFileContent] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchTree = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`${API_BASE}/api/files?path=/`)
      const json = await res.json()
      setTree(json.data || [])
    } catch (err) {
      console.error("获取文件树失败:", err)
    } finally {
      setRefreshing(false)
    }
  }, [])

  const selectFile = useCallback(async (path: string) => {
    setSelectedPath(path)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/files?path=${encodeURIComponent(path)}`)
      const json = await res.json()
      if (json.data?.content) {
        setFileContent(json.data.content)
      }
    } catch (err) {
      console.error("读取文件失败:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTree() }, [fetchTree])

  return { tree, selectedPath, fileContent, loading, selectFile, refreshTree: fetchTree, refreshing }
}
