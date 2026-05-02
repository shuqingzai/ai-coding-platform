import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Terminal as TerminalIcon, ChevronUp, ChevronDown } from "lucide-react"
import {
  Terminal,
  TerminalContent,
  TerminalHeader,
  TerminalTitle,
  TerminalActions,
  TerminalCopyButton,
  TerminalClearButton,
} from "@/components/ai-elements/terminal"

interface TerminalPanelProps {
  output?: string[]
  isStreaming?: boolean
  onClear?: () => void
}

export function TerminalPanel({ output = [], isStreaming, onClear }: TerminalPanelProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(true)

  if (collapsed) {
    return (
      <button
        className="flex items-center gap-2 px-4 h-8 border-t border-border bg-background text-muted-foreground hover:text-accent-foreground text-xs shrink-0"
        onClick={() => setCollapsed(false)}
      >
        <TerminalIcon size={14} />
        {t("nav.terminal")}
        <ChevronUp size={12} />
      </button>
    )
  }

  return (
    <Terminal
      output={output.join("\n")}
      isStreaming={isStreaming}
      onClear={onClear}
      className="h-48 rounded-none border-0 border-t border-border bg-background text-foreground shrink-0"
    >
      <TerminalHeader className="border-border px-4 min-h-8 h-8 py-0">
        <TerminalTitle className="text-muted-foreground text-xs">
          {t("nav.terminal")}
        </TerminalTitle>
        <div className="flex items-center gap-1">
          <TerminalActions>
            <TerminalCopyButton />
            <TerminalClearButton />
          </TerminalActions>
          <button
            className="text-muted-foreground hover:text-accent-foreground"
            onClick={() => setCollapsed(true)}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </TerminalHeader>
      <TerminalContent className="flex-1 text-xs text-foreground max-h-none" />
    </Terminal>
  )
}
