import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronRight, ChevronDown, RefreshCw, Zap } from "lucide-react"
import { FileTree, FileTreeIcon, FileTreeName, FileTreeFolder, FileTreeFile } from "@/components/ai-elements/file-tree"
import type { FileNode } from "../../types"

interface FilePanelProps {
  tree: FileNode[]
  selectedPath: string
  onSelect: (path: string) => void
  onRefresh: () => void
  refreshing?: boolean
}

export function FilePanel({ tree, selectedPath, onSelect, onRefresh, refreshing }: FilePanelProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["/"]))
  const [autoRefresh, setAutoRefresh] = useState(true)

  // 外部自动刷新（AI 写文件后数据变更）
  // useChat 通过 onFileChanged 触发 refreshTree，这里不做额外处理
  // autoRefresh 状态可用于前端做节流控制

  if (collapsed) {
    return (
      <button
        className="w-8 flex items-center justify-center border-r border-border text-muted-foreground hover:text-accent-foreground shrink-0"
        onClick={() => setCollapsed(false)}
        aria-label={t("file.expand")}
      >
        <ChevronRight size={16} />
      </button>
    )
  }

  return (
    <aside className="w-64 border-r border-border bg-background flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("file.title")}</span>
        <div className="flex items-center gap-1.5">
          <button
            className="p-1 rounded text-muted-foreground hover:text-accent-foreground hover:bg-accent transition flex items-center gap-1"
            onClick={onRefresh}
            title={t("file.refresh")}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            className={`p-0.5 rounded transition ${autoRefresh ? "text-green-400" : "text-muted-foreground"} hover:text-accent-foreground`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? "自动刷新中" : "手动刷新"}
          >
            <Zap size={12} />
          </button>
          <button className="text-muted-foreground hover:text-accent-foreground transition" onClick={() => setCollapsed(true)} aria-label={t("chat.collapse")}>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        <FileTree
          expanded={expanded}
          onExpandedChange={setExpanded}
          selectedPath={selectedPath}
          onSelect={onSelect}
          className="border-none rounded-none bg-transparent"
        >
          <FileTreeNodes nodes={tree} />
        </FileTree>
      </div>
    </aside>
  )
}

/** 递归渲染文件树节点 */
function FileTreeNodes({ nodes }: { nodes: FileNode[] }) {
  return (
    <>
      {nodes.map((node) =>
        node.type === "directory" ? (
          <FileTreeFolder key={node.path} path={node.path} name={node.name}>
            {node.children && <FileTreeNodes nodes={node.children} />}
          </FileTreeFolder>
        ) : (
          <FileTreeFile key={node.path} path={node.path} name={node.name} />
        )
      )}
    </>
  )
}
