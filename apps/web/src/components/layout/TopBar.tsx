import { useState, useCallback, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Code2, MessageSquare, Settings, PlugZap, Star, Globe, Check } from "lucide-react"
import { useSettings } from "../../hooks/useSettings"
import { ModelSelector, ModelSelectorTrigger, ModelSelectorContent, ModelSelectorInput, ModelSelectorList, ModelSelectorGroup, ModelSelectorItem } from "@/components/ai-elements/model-selector"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ApiKeyManager } from "../providers/ApiKeyManager"
import { CustomProviderManager } from "../providers/CustomProviderManager"
import { ThemeToggle } from "../ui/theme-toggle"

const LANGUAGES = [
  { code: "zh-CN", label: "简体中文" },
  { code: "en", label: "English" },
] as const

interface TopBarProps {
  mode: "chat" | "api"
  onModeChange: (mode: "chat" | "api") => void
  providers: { id: string; name: string; models: string[]; configured: boolean; isCustom?: boolean; supportsModelFetch?: boolean }[]
  onRefresh: () => void
  onProviderChange: (providerId: string) => void
  onModelChange: (modelId: string) => void
  getModels: (providerId: string) => string[]
  onFetchModels: (providerId: string) => Promise<string[]>
}

export function TopBar({ mode, onModeChange, providers, onRefresh, onProviderChange, onModelChange, getModels, onFetchModels }: TopBarProps) {
  const { preferences, setPreference } = useSettings()
  const { t, i18n } = useTranslation()
  const [showSettings, setShowSettings] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [fetchingModels, setFetchingModels] = useState(false)

  const configuredProviders = providers.filter((p) => p.configured || p.isCustom)
  const currentProvider = configuredProviders.find((p) => p.id === preferences.provider) || configuredProviders[0]
  const currentModels = currentProvider ? getModels(currentProvider.id) : []

  const fetchedRef = useRef(false)

  // Provider 变化时重置拉取标记
  useEffect(() => {
    fetchedRef.current = false
  }, [currentProvider?.id])

  // 自动拉取模型 (副作用不能放在 render 中)
  useEffect(() => {
    if (!currentProvider?.supportsModelFetch || currentProvider.isCustom) return
    if (currentModels.length > 0 || fetchingModels || fetchedRef.current) return

    fetchedRef.current = true
    setFetchingModels(true)
    onFetchModels(currentProvider.id).finally(() => setFetchingModels(false))
  }, [currentProvider?.id, currentModels.length, fetchingModels])

  const handleProviderSelect = useCallback(
    async (providerId: string) => {
      onProviderChange(providerId)
      const target = configuredProviders.find((p) => p.id === providerId)
      if (target?.supportsModelFetch && !target.isCustom) {
        setFetchingModels(true)
        const models = await onFetchModels(providerId)
        setFetchingModels(false)
        if (models?.[0]) onModelChange(models[0])
      } else {
        const models = getModels(providerId)
        if (models?.[0]) onModelChange(models[0])
      }
    },
    [onProviderChange, onModelChange, getModels, onFetchModels, configuredProviders]
  )

  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-background shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <Code2 size={20} className="text-primary" />
          <span>{t("nav.title")}</span>
        </div>
        <div className="flex rounded-lg bg-muted p-0.5">
          <button className={`px-3 py-1 rounded-md text-sm transition ${mode === "chat" ? "bg-primary text-foreground" : "text-muted-foreground hover:text-accent-foreground"}`} onClick={() => onModeChange("chat")}>
            <MessageSquare size={14} className="inline mr-1" />{t("nav.chat")}
          </button>
          <button className={`px-3 py-1 rounded-md text-sm transition ${mode === "api" ? "bg-primary text-foreground" : "text-muted-foreground hover:text-accent-foreground"}`} onClick={() => onModeChange("api")}>
            <Code2 size={14} className="inline mr-1" />{t("nav.api")}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* 模型选择器 — 使用 ai-elements ModelSelector */}
        <ModelSelector open={modelOpen} onOpenChange={setModelOpen}>
          <ModelSelectorTrigger>
            <div className="flex items-center gap-1.5 bg-accent border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground hover:border-ring transition min-w-[8rem] cursor-pointer">
              <span className="truncate max-w-[8rem]">
                {currentProvider ? `${currentProvider.name} / ${preferences.model || "选择模型"}` : t("chat.selectProvider")}
              </span>
              <span className="text-muted-foreground text-xs shrink-0">▼</span>
            </div>
          </ModelSelectorTrigger>
          <ModelSelectorContent title="选择服务商和模型" className="bg-muted border-border sm:max-w-md">
            <ModelSelectorInput placeholder={t("chat.searchModel")} className="bg-muted text-foreground" />
            <ModelSelectorList className="text-foreground max-h-72">
              {configuredProviders.map((prov) => {
                const models = prov.isCustom ? prov.models : getModels(prov.id)
                return (
                  <ModelSelectorGroup key={prov.id} heading={`${prov.name}${prov.isCustom ? t("chat.customLabel") : ""}`} className="text-muted-foreground">
                    <ModelSelectorItem
                      className="text-muted-foreground aria-selected:bg-accent text-xs italic"
                      onSelect={() => handleProviderSelect(prov.id)}
                    >
                      {t("chat.useProvider", { name: prov.name })}
                    </ModelSelectorItem>
                    {models.length > 0 ? (
                      models.map((m) => (
                        <ModelSelectorItem
                          key={m}
                          className={`text-foreground aria-selected:bg-accent ${m === preferences.model && prov.id === preferences.provider ? "bg-accent" : ""}`}
                          onSelect={() => {
                            if (prov.id !== preferences.provider) {
                              handleProviderSelect(prov.id)
                            }
                            onModelChange(m)
                            setModelOpen(false)
                          }}
                        >
                          {m}
                        </ModelSelectorItem>
                      ))
                    ) : (
                      fetchingModels ? (
                        <ModelSelectorItem className="text-muted-foreground text-xs" onSelect={() => {}}>{t("chat.loadingModel")}</ModelSelectorItem>
                      ) : (
                        <ModelSelectorItem className="text-muted-foreground text-xs" onSelect={() => {}}>{t("chat.noModel")}</ModelSelectorItem>
                      )
                    )}
                  </ModelSelectorGroup>
                )
              })}
            </ModelSelectorList>
          </ModelSelectorContent>
        </ModelSelector>

        {currentProvider && (
          <button
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-yellow-400 transition"
            onClick={() => setPreference("provider", currentProvider.id)}
            title={t("provider.setDefault", { name: currentProvider.name })}
          >
            <Star size={14} />
          </button>
        )}

        <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-green-400 transition" onClick={() => setShowCustom(true)} title={t("provider.addCustom")}>
          <PlugZap size={16} />
        </button>
        <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-accent-foreground transition" onClick={() => setShowSettings(true)}>
          <Settings size={18} />
        </button>
        {/* 语言切换下拉菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-accent-foreground transition" title={t("common.language")}>
            <Globe size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-sm">{lang.label}</span>
                {i18n.language === lang.code && <Check size={14} />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle />
      </div>

      {showSettings && <ApiKeyManager open={showSettings} onClose={() => setShowSettings(false)} providers={providers} setPreference={setPreference} />}
      {showCustom && <CustomProviderManager open={showCustom} onClose={() => setShowCustom(false)} onChanged={onRefresh} />}
    </header>
  )
}
