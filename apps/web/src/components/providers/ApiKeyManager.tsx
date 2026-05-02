import { useState } from "react"
import { useTranslation } from "react-i18next"
import { X, Eye, EyeOff, Trash2, Star } from "lucide-react"
import { useSettings } from "../../hooks/useSettings"

interface ApiKeyManagerProps {
  open: boolean
  onClose: () => void
  providers: { id: string; name: string; models: string[]; configured: boolean }[]
  setPreference: (key: "provider" | "model", value: string) => void
}

export function ApiKeyManager({ open, onClose, providers, setPreference }: ApiKeyManagerProps) {
  const { apiKeys, setApiKey, removeApiKey } = useSettings()
  const { t } = useTranslation()
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<Record<string, string>>({})

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-muted border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">{t("provider.title")}</h2>
          <button className="p-1 rounded hover:bg-accent text-muted-foreground" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t("provider.desc")}
        </p>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {providers.map((p) => (
            <div key={p.id} className="space-y-1">
              <label className="text-sm text-foreground flex items-center gap-2">
                {p.name}
                {p.configured && <span className="text-xs px-1.5 py-0.5 bg-green-900 text-green-300 rounded">{t("provider.envConfigured")}</span>}
                {apiKeys[p.id] && <span className="text-xs px-1.5 py-0.5 bg-blue-900 text-blue-300 rounded">{t("provider.overridden")}</span>}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKeys[p.id] ? "text" : "password"}
                    className="w-full bg-accent border border-border rounded-md px-3 py-1.5 text-sm text-foreground pr-16"
                    placeholder={t("provider.inputPlaceholder", { name: p.name })}
                    value={editing[p.id] ?? apiKeys[p.id] ?? ""}
                    onChange={(e) => setEditing((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    onBlur={() => {
                      if (editing[p.id] !== undefined) setApiKey(p.id, editing[p.id])
                    }}
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent-foreground"
                    onClick={() => setShowKeys((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                  >
                    {showKeys[p.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  className="p-1.5 rounded text-muted-foreground hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-accent transition"
                  onClick={() => {
                    setPreference("provider", p.id)
                    onClose()
                  }}
                  title={t("provider.setDefault", { name: p.name })}
                >
                  <Star size={14} />
                </button>
                <button
                  className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-accent"
                  onClick={() => {
                    removeApiKey(p.id)
                    setEditing((prev) => {
                      const next = { ...prev }
                      delete next[p.id]
                      return next
                    })
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          className="mt-6 w-full py-2 bg-zinc-100 text-zinc-900 rounded-lg font-medium text-sm hover:bg-white transition"
          onClick={onClose}
        >
          {t("provider.done")}
        </button>
      </div>
    </div>
  )
}
