import { useState, useEffect, useCallback } from "react"

type ThemeMode = "system" | "light" | "dark"
type ActualTheme = "light" | "dark"

const STORAGE_KEY = "theme"

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system"
  return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system"
}

function getSystemTheme(): ActualTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(mode: ThemeMode): ActualTheme {
  const actual = mode === "system" ? getSystemTheme() : mode
  document.documentElement.setAttribute("data-theme", actual)
  return actual
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme)
  const [actualTheme, setActualTheme] = useState<ActualTheme>(() => applyTheme(getStoredTheme()))

  const setTheme = useCallback((mode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, mode)
    setThemeState(mode)
    setActualTheme(applyTheme(mode))
  }, [])

  useEffect(() => {
    if (theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = () => {
      setActualTheme(applyTheme("system"))
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  return { theme, setTheme, actualTheme }
}
