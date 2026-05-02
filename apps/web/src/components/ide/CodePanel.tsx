import { useTranslation } from "react-i18next"
import { CodeBlockContainer, CodeBlockHeader, CodeBlockContent, CodeBlockFilename, CodeBlockCopyButton, CodeBlockLanguageSelector, CodeBlockLanguageSelectorTrigger, CodeBlockLanguageSelectorValue } from "@/components/ai-elements/code-block"
import type { BundledLanguage } from "shiki"

interface CodePanelProps {
  filePath: string
  content: string
  loading: boolean
}

/** 文件扩展名到 Shiki 语言的映射 */
const langMap: Record<string, string> = {
  // JavaScript/TypeScript
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
  mjs: "javascript", cjs: "javascript", mts: "typescript", cts: "typescript",
  // JS Frameworks
  vue: "vue", svelte: "svelte", astro: "astro",
  // Python
  py: "python", pyi: "python",
  // Systems
  rs: "rust", go: "go", c: "c", cpp: "cpp", h: "c", hpp: "cpp",
  // JVM
  java: "java", kt: "kotlin", kts: "kotlin", scala: "scala",
  // Apple
  swift: "swift", m: "objective-c", mm: "objective-cpp",
  // Scripting
  rb: "ruby", php: "php", lua: "lua",
  // Config/Markup
  json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
  xml: "xml", html: "html", css: "css", scss: "scss", less: "less",
  md: "markdown", mdx: "mdx", svg: "svg",
  // Shell/Config
  sh: "bash", bash: "bash", zsh: "bash", fish: "fish",
  dockerfile: "docker", docker: "docker",
  // DB
  sql: "sql", graphql: "graphql", prisma: "prisma",
  // Other
  dart: "dart", elixir: "ex", erlang: "erl", haskell: "hs",
  zig: "zig", nim: "nim",
  // Diff
  diff: "diff", patch: "diff",
}

function detectLang(filePath: string): BundledLanguage {
  const ext = filePath.split(".").pop()?.toLowerCase() || ""
  return (langMap[ext] || "text") as BundledLanguage
}

export function CodePanel({ filePath, content, loading }: CodePanelProps) {
  const { t } = useTranslation()

  if (!filePath) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">{t("file.selectHint")}</p>
          <p className="text-sm">{t("file.selectDesc")}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">{t("file.loading")}</div>
  }

  const filename = filePath.split("/").pop() || filePath
  const language = detectLang(filePath)

  return (
    <div className="flex-1 overflow-auto p-3">
      <CodeBlockContainer className="border-border bg-background" language={language}>
        <CodeBlockHeader className="border-border bg-muted/50 text-muted-foreground">
          <CodeBlockFilename>{filename}</CodeBlockFilename>
          <div className="flex items-center gap-1">
            <CodeBlockLanguageSelector value={language} onValueChange={() => {}}>
              <CodeBlockLanguageSelectorTrigger>
                <CodeBlockLanguageSelectorValue />
              </CodeBlockLanguageSelectorTrigger>
            </CodeBlockLanguageSelector>
            <CodeBlockCopyButton className="text-muted-foreground hover:text-accent-foreground" />
          </div>
        </CodeBlockHeader>
        <CodeBlockContent code={content} language={language} showLineNumbers />
      </CodeBlockContainer>
    </div>
  )
}
