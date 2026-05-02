import { useState } from "react"
import { useTranslation } from "react-i18next"
import { X, Plus, Trash2, Info } from "lucide-react"
import { API_BASE } from "../../lib/constants"
import type { CustomProviderConfig } from "../../types"

interface CustomProviderManagerProps {
  open: boolean
  onClose: () => void
  onChanged: () => void
}

export function CustomProviderManager({ open, onClose, onChanged }: CustomProviderManagerProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<CustomProviderConfig>({
    id: "", name: "", protocol: "openai-compatible", apiStyle: "completions", baseURL: "", apiKey: "", models: [], providerOptions: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!form.id || !form.baseURL || !form.apiKey) {
      setError(t("provider.errorRequired"))
      return
    }
    if (!form.models || form.models.filter((m) => m.trim()).length === 0) {
      setError(t("provider.errorModels"))
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/api/providers/custom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) { setError(data.error) }
      else { onChanged(); onClose(); setForm({ id: "", name: "", protocol: "openai-compatible", apiStyle: "completions", baseURL: "", apiKey: "", models: [], providerOptions: "" }) }
    } catch (err) { setError(err instanceof Error ? err.message : "请求失败") }
    finally { setLoading(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-muted border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t("provider.customTitle")}</h2>
          <button className="p-1 rounded hover:bg-accent text-muted-foreground" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label className="text-foreground">{t("provider.name")} *</label>
            <input className="w-full bg-accent border border-border rounded-md px-3 py-1.5 text-foreground mt-1" placeholder={t("provider.namePlaceholder")} value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })} />
          </div>
          <div>
            <label className="text-foreground">{t("provider.displayName")}</label>
            <input className="w-full bg-accent border border-border rounded-md px-3 py-1.5 text-foreground mt-1" placeholder={t("provider.displayNamePlaceholder")} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-foreground">{t("provider.protocol")} *</label>
            <select className="w-full bg-accent border border-border rounded-md px-3 py-1.5 text-foreground mt-1"
              value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value as any })}>
              <option value="openai-compatible">OpenAI Compatible</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          {form.protocol === "openai-compatible" && (
            <div>
              <label className="text-foreground">API 风格</label>
              <select className="w-full bg-accent border border-border rounded-md px-3 py-1.5 text-foreground mt-1"
                value={form.apiStyle || "completions"} onChange={(e) => setForm({ ...form, apiStyle: e.target.value as any })}>
                <option value="completions">Completions API (@ai-sdk/openai-compatible)</option>
                <option value="responses">Responses API (@ai-sdk/openai)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {t("provider.apiStyleHint")}
              </p>
            </div>
          )}
          <div>
            <label className="text-foreground">{t("provider.baseUrl")} *</label>
            <input className="w-full bg-accent border border-border rounded-md px-3 py-1.5 text-foreground mt-1" placeholder={t("provider.baseUrlPlaceholder")} value={form.baseURL}
              onChange={(e) => setForm({ ...form, baseURL: e.target.value })} />
          </div>
          <div>
            <label className="text-foreground">{t("provider.apiKey")} *</label>
            <input type="password" className="w-full bg-accent border border-border rounded-md px-3 py-1.5 text-foreground mt-1" placeholder={t("provider.apiKeyPlaceholder")} value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
          </div>
          <div>
            <label className="text-foreground">{t("provider.models")} *</label>
            <textarea className="w-full bg-accent border border-border rounded-md px-3 py-1.5 text-foreground mt-1 font-mono" rows={4}
              placeholder={t("provider.modelsPlaceholder")}
              value={form.models.join("\n")}
              onChange={(e) => setForm({ ...form, models: e.target.value.split("\n") })} />
          </div>
          <div>
            <label className="text-foreground flex items-center gap-1">
              {t("provider.providerOptions")}
              <span className="text-muted-foreground text-xs">— AI SDK 服务商参数，可选</span>
            </label>
            <textarea className="w-full bg-accent border border-border rounded-md px-3 py-1.5 text-foreground mt-1 font-mono text-xs" rows={4}
              placeholder={t("provider.providerOptionsPlaceholder")}
              value={form.providerOptions || ""}
              onChange={(e) => setForm({ ...form, providerOptions: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">
              {t("provider.providerOptionsHint")}
            </p>
          </div>
        </div>

        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

        <button className="mt-4 w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
          onClick={handleSubmit} disabled={loading}>
          {loading ? t("provider.submitting") : t("provider.submit")}
        </button>
      </div>
    </div>
  )
}
