import { useState, useEffect, useCallback } from "react"
import { API_BASE } from "../lib/constants"

interface ModelEntry { id: string; name: string; models: string[]; configured: boolean; isCustom?: boolean; supportsModelFetch?: boolean }

export function useProviders() {
  const [providers, setProviders] = useState<ModelEntry[]>([])
  const [modelsMap, setModelsMap] = useState<Record<string, string[]>>({})
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({})

  const refreshProviders = useCallback(async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(`${API_BASE}/api/providers`)
        const d = await res.json()
        setProviders(d.data || [])
        return
      } catch (e) {
        if (i < retries - 1) await new Promise((r) => setTimeout(r, 1000))
        else console.error("获取服务商列表失败:", e)
      }
    }
  }, [])

  const fetchModels = useCallback(async (providerId: string) => {
    // 已经加载过
    if (modelsMap[providerId]?.length) return modelsMap[providerId]
    setLoadingModels((p) => ({ ...p, [providerId]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/providers/${providerId}/models`)
      const d = await res.json()
      if (d.data?.length) {
        setModelsMap((p) => ({ ...p, [providerId]: d.data }))
        return d.data as string[]
      }
    } catch (e) { console.error(e) }
    finally { setLoadingModels((p) => ({ ...p, [providerId]: false })) }
    return []
  }, [modelsMap])

  const getModelsForProvider = useCallback((providerId: string): string[] => {
    // 自定义 provider 的 models 已随列表下发
    const p = providers.find((x) => x.id === providerId)
    if (p?.isCustom) return p.models
    // 官方 provider: 从缓存或 fallback
    if (modelsMap[providerId]?.length) return modelsMap[providerId]
    // 还没加载过，返回空触发 onProviderSelect 去拉取
    return []
  }, [providers, modelsMap])

  const firstConfigured = providers.find((p) => p.configured || p.isCustom)

  return { providers, refreshProviders, fetchModels, getModelsForProvider, loadingModels, firstConfigured }
}
