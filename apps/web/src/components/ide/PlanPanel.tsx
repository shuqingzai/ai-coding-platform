import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react"
import type { ChatMessage } from "../../types"

interface PlanPanelProps {
  messages: ChatMessage[]
}

export function PlanPanel({ messages }: PlanPanelProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(true)

  // 从最近的 AI 消息中提取规划步骤
  const planSteps = useMemo(() => {
    const lastAiMsg = [...messages].reverse().find((m) => m.role === "assistant")
    if (!lastAiMsg) return []

    const text = lastAiMsg.parts
      .filter((p) => p.type === "text-delta")
      .map((p) => p.delta || "")
      .join("")

    // 解析编号步骤 (如 "1. xxx", "- xxx", "1) xxx")
    const steps: string[] = []
    const lines = text.split("\n")
    for (const line of lines) {
      const trimmed = line.trim()
      if (/^(\d+[\.\)]|\-|\*)\s/.test(trimmed)) {
        steps.push(trimmed.replace(/^(\d+[\.\)]|\-|\*)\s/, ""))
      }
    }
    return steps
  }, [messages])

  if (planSteps.length === 0) return null

  if (collapsed) {
    return (
      <button
        className="flex items-center gap-2 px-4 h-8 border-t border-border bg-background text-muted-foreground hover:text-accent-foreground text-xs shrink-0"
        onClick={() => setCollapsed(false)}
      >
        <Lightbulb size={14} />
        {t("nav.plan") || "Plan"} ({planSteps.length})
        <ChevronUp size={12} className="ml-auto" />
      </button>
    )
  }

  return (
    <div className="border-t border-border bg-background shrink-0">
      <div className="flex items-center justify-between px-4 h-8 border-b border-border">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("nav.plan") || "Plan"}
          </span>
        </div>
        <button
          className="text-muted-foreground hover:text-accent-foreground"
          onClick={() => setCollapsed(true)}
        >
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="max-h-40 overflow-y-auto p-2">
        <ol className="text-xs text-foreground space-y-1 pl-5 list-decimal">
          {planSteps.map((step, i) => (
            <li key={i} className="leading-relaxed">{step}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
