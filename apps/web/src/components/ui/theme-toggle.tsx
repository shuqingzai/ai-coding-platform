import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "./button"
import { useTheme } from "../../hooks/useTheme"
import { useTranslation } from "react-i18next"

const nextTheme: Record<string, string> = {
  system: "light",
  light: "dark",
  dark: "system",
}

const icons: Record<string, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  const Icon = icons[theme]
  const next = nextTheme[theme] as "system" | "light" | "dark"

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(next)}
      title={t(`theme.${next}`)}
      aria-label={t(`theme.${next}`)}
    >
      <Icon className="size-4" />
    </Button>
  )
}
