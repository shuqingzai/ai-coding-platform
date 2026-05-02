import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { ListChecks } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
} from "@/components/ai-elements/queue"

interface TodoItem {
  content: string
  status: string
  priority: string
}

export function QueuePanel() {
  const { t } = useTranslation()
  const [todos, setTodos] = useState<TodoItem[]>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as TodoItem[]
      if (detail?.length) setTodos(detail)
    }
    window.addEventListener("todos-update", handler)
    return () => window.removeEventListener("todos-update", handler)
  }, [])

  const grouped = useMemo(() => {
    const inProgress = todos.filter((t) => t.status === "in_progress")
    const pending = todos.filter((t) => t.status === "pending")
    const completed = todos.filter((t) => t.status === "completed")
    const cancelled = todos.filter((t) => t.status === "cancelled")
    return { inProgress, pending, completed, cancelled }
  }, [todos])

  const totalActive = grouped.inProgress.length + grouped.pending.length

  return (
    <div className="border-t border-border bg-background shrink-0">
      <div className="flex items-center px-4 h-8 border-b border-border">
        <ListChecks size={14} className="text-muted-foreground mr-2" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t("nav.todos") || "Todos"}
          {totalActive > 0 && (
            <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {totalActive}
            </span>
          )}
        </span>
      </div>
      <ScrollArea className="h-48">
        {todos.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4 text-center">暂无任务</p>
        ) : (
          <div className="p-2 space-y-0.5">
            {/* 进行中 */}
            {grouped.inProgress.length > 0 && (
              <QueueSection defaultOpen={true}>
                <QueueSectionTrigger className="text-xs px-2 py-1 rounded hover:bg-accent w-full text-left">
                  <QueueSectionLabel
                    label="进行中"
                    count={grouped.inProgress.length}
                    icon={<span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block animate-pulse" />}
                  />
                </QueueSectionTrigger>
                <QueueSectionContent>
                  {grouped.inProgress.map((todo, i) => (
                    <QueueItem key={`ip-${i}`} className="text-xs py-1.5 px-2">
                      <QueueItemIndicator completed={false} />
                      <QueueItemContent completed={false}>
                        <span className="font-medium">{todo.content}</span>
                      </QueueItemContent>
                    </QueueItem>
                  ))}
                </QueueSectionContent>
              </QueueSection>
            )}

            {/* 待处理 */}
            {grouped.pending.length > 0 && (
              <QueueSection defaultOpen={true}>
                <QueueSectionTrigger className="text-xs px-2 py-1 rounded hover:bg-accent w-full text-left">
                  <QueueSectionLabel
                    label="待处理"
                    count={grouped.pending.length}
                    icon={<span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />}
                  />
                </QueueSectionTrigger>
                <QueueSectionContent>
                  {grouped.pending.map((todo, i) => (
                    <QueueItem key={`pd-${i}`} className="text-xs py-1.5 px-2">
                      <QueueItemIndicator completed={false} />
                      <QueueItemContent completed={false}>
                        <span>{todo.content}</span>
                      </QueueItemContent>
                    </QueueItem>
                  ))}
                </QueueSectionContent>
              </QueueSection>
            )}

            {/* 已完成 */}
            {grouped.completed.length > 0 && (
              <QueueSection defaultOpen={false}>
                <QueueSectionTrigger className="text-xs px-2 py-1 rounded hover:bg-accent w-full text-left">
                  <QueueSectionLabel
                    label="已完成"
                    count={grouped.completed.length}
                    icon={<span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
                  />
                </QueueSectionTrigger>
                <QueueSectionContent>
                  {grouped.completed.map((todo, i) => (
                    <QueueItem key={`cp-${i}`} className="text-xs py-1.5 px-2">
                      <QueueItemIndicator completed={true} />
                      <QueueItemContent completed={true}>
                        <span className="line-through text-muted-foreground">{todo.content}</span>
                      </QueueItemContent>
                    </QueueItem>
                  ))}
                </QueueSectionContent>
              </QueueSection>
            )}

            {/* 已取消 */}
            {grouped.cancelled.length > 0 && (
              <QueueSection defaultOpen={false}>
                <QueueSectionTrigger className="text-xs px-2 py-1 rounded hover:bg-accent w-full text-left">
                  <QueueSectionLabel
                    label="已取消"
                    count={grouped.cancelled.length}
                    icon={<span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 inline-block" />}
                  />
                </QueueSectionTrigger>
                <QueueSectionContent>
                  {grouped.cancelled.map((todo, i) => (
                    <QueueItem key={`cc-${i}`} className="text-xs py-1.5 px-2">
                      <QueueItemIndicator completed={true} />
                      <QueueItemContent completed={true}>
                        <span className="line-through text-muted-foreground/50">{todo.content}</span>
                      </QueueItemContent>
                    </QueueItem>
                  ))}
                </QueueSectionContent>
              </QueueSection>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
