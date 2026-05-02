import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Play, Loader2 } from "lucide-react"
import { API_BASE } from "../../lib/constants"
import { useSettings } from "../../hooks/useSettings"
import type { AvailableProvider } from "../../types"

interface TaskViewProps {
  providers: AvailableProvider[]
}

export function TaskView({ providers }: TaskViewProps) {
  const { preferences, getApiKey } = useSettings()
  const { t } = useTranslation()
  const [task, setTask] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ plan: string; code: string } | null>(null)
  const [error, setError] = useState("")

  const configuredProviders = providers.filter((p) => p.configured)

  const handleRun = async () => {
    if (!task.trim()) return
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch(`${API_BASE}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: task.trim(),
          provider: preferences.provider,
          model: preferences.model,
          apiKey: getApiKey(preferences.provider) || undefined,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 h-9 border-b border-border shrink-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("task.title")}</span>
        {configuredProviders.length === 0 && (
          <span className="text-xs text-yellow-500">{t("task.noProvider")}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-6">
        <div>
          <label className="block text-sm text-foreground mb-2">{t("task.label")}</label>
          <textarea
            className="w-full bg-accent border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-zinc-600 resize-none focus:outline-none focus:border-zinc-500"
            rows={4}
            placeholder={t("task.desc")}
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              onClick={handleRun}
              disabled={!task.trim() || loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
               {t("task.run")}
            </button>
            <span className="text-xs text-zinc-600">
              {t("task.using")} {preferences.provider}/{preferences.model}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">{t("task.plan")}</h3>
              <pre className="bg-accent border border-border rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap font-mono overflow-x-auto">
                {result.plan}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">{t("task.code")}</h3>
              <pre className="bg-accent border border-border rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap font-mono overflow-x-auto">
                {result.code}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
