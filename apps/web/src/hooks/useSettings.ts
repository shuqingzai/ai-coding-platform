import { useState, useCallback, useEffect } from "react"
import { STORAGE_KEYS, DEFAULT_PROVIDER } from "../lib/constants"

interface Preferences {
  provider: string
  model: string
}

interface Settings {
  apiKeys: Record<string, string>
  preferences: Preferences
  setApiKey: (provider: string, key: string) => void
  removeApiKey: (provider: string) => void
  setPreference: (key: keyof Preferences, value: string) => void
  getApiKey: (provider: string) => string
}

function loadValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveValue(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function useSettings(): Settings {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() =>
    loadValue(STORAGE_KEYS.apiKeys, {} as Record<string, string>)
  )
  const [preferences, setPreferences] = useState<Preferences>(() =>
    loadValue(STORAGE_KEYS.preferences, { provider: DEFAULT_PROVIDER, model: "gpt-4o" })
  )

  useEffect(() => { saveValue(STORAGE_KEYS.apiKeys, apiKeys) }, [apiKeys])
  useEffect(() => { saveValue(STORAGE_KEYS.preferences, preferences) }, [preferences])

  const setApiKey = useCallback((provider: string, key: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: key }))
  }, [])

  const removeApiKey = useCallback((provider: string) => {
    setApiKeys((prev) => {
      const next = { ...prev }
      delete next[provider]
      return next
    })
  }, [])

  const setPreference = useCallback((key: keyof Preferences, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }, [])

  const getApiKey = useCallback(
    (provider: string) => apiKeys[provider] || "",
    [apiKeys]
  )

  return { apiKeys, preferences, setApiKey, removeApiKey, setPreference, getApiKey }
}
