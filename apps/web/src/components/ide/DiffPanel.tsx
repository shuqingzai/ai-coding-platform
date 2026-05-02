import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { diffLines } from "diff"
import { CodeBlockContainer, CodeBlockHeader, CodeBlockContent, CodeBlockFilename } from "@/components/ai-elements/code-block"

interface DiffPanelProps {
  filePath: string
  oldContent: string
  newContent: string
}

export function DiffPanel({ filePath, oldContent, newContent }: DiffPanelProps) {
  const { t } = useTranslation()
  const changes = useMemo(
    () => diffLines(oldContent || "", newContent || ""),
    [oldContent, newContent]
  )

  const diffText = useMemo(() => {
    return changes
      .map((change) => {
        const prefix = change.added ? "+" : change.removed ? "-" : " "
        const lines = change.value.split("\n")
        const meaningfulLines = lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines
        return meaningfulLines.map((line) => prefix + line).join("\n")
      })
      .join("\n")
  }, [changes])

  if (changes.length === 0 || (changes.length === 1 && !changes[0].added && !changes[0].removed)) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {t("diff.noChange")}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-3">
      <CodeBlockContainer language="diff">
        <CodeBlockHeader>
          <CodeBlockFilename>{filePath}</CodeBlockFilename>
        </CodeBlockHeader>
        <CodeBlockContent code={diffText} language="diff" showLineNumbers />
      </CodeBlockContainer>
    </div>
  )
}
