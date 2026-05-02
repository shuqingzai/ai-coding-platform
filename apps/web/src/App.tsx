import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { TopBar } from "./components/layout/TopBar"
import { FilePanel } from "./components/ide/FilePanel"
import { CodePanel } from "./components/ide/CodePanel"
import { DiffPanel } from "./components/ide/DiffPanel"
import { TerminalPanel } from "./components/ide/TerminalPanel"
import { QueuePanel } from "./components/ide/QueuePanel"
import { PlanPanel } from "./components/ide/PlanPanel"
import { ChatPanel } from "./components/chat/ChatPanel"
import { TaskView } from "./components/task/TaskView"
import { useChat } from "./hooks/useChat"
import { useFileTree } from "./hooks/useFileTree"
import { useSettings } from "./hooks/useSettings"
import { useProviders } from "./hooks/useProviders"

export default function App() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<"chat" | "api">("chat")
  const { setPreference, preferences } = useSettings()
  const { providers, refreshProviders, fetchModels, getModelsForProvider } = useProviders()
  const [diffView, setDiffView] = useState<{ path: string; old: string; new: string } | null>(null)

  const { tree, selectedPath, fileContent, loading: fileLoading, selectFile, refreshTree, refreshing } = useFileTree()

  const handleFileWritten = useCallback((path: string, content: string) => {
    setDiffView({ path, old: fileContent, new: content })
  }, [fileContent])

  const { messages, isStreaming, terminalOutput, sendMessage, cancelMessage, clearMessages, clearTerminal } = useChat({
    onFileChanged: refreshTree,
  })

  // 监听 file-change 事件从 WebSocket 侧推
  useEffect(() => {
    const handler = () => refreshTree()
    window.addEventListener("file-changed", handler)
    return () => window.removeEventListener("file-changed", handler)
  }, [refreshTree])

  useEffect(() => { refreshProviders() }, [])

  // 自动选择默认服务商：优先 preferences 中的，否则随机选一个已配置的
  useEffect(() => {
    const configured = providers.filter((p) => p.configured || p.isCustom)
    if (configured.length === 0) return

    // 已有有效 provider 则不改变
    const currentValid = configured.find((p) => p.id === preferences.provider)
    if (currentValid) {
      // 确保模型也设置了
      if (!preferences.model) {
        fetchModels(currentValid.id).then((models) => {
          if (models?.[0]) setPreference("model", models[0])
          else if (currentValid.models?.[0]) setPreference("model", currentValid.models[0])
        })
      }
      return
    }

    // 随机选择一个
    const pick = configured[Math.floor(Math.random() * configured.length)]
    setPreference("provider", pick.id)
    if (pick.isCustom) {
      if (pick.models?.[0]) setPreference("model", pick.models[0])
    } else {
      fetchModels(pick.id).then((models) => {
        if (models?.[0]) setPreference("model", models[0])
      })
    }
  }, [providers])

  const handleProviderChange = async (providerId: string) => {
    setPreference("provider", providerId)
    const models = await fetchModels(providerId)
    if (models?.[0]) setPreference("model", models[0])
    const customModels = getModelsForProvider(providerId)
    if (customModels?.[0] && !models?.length) setPreference("model", customModels[0])
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TopBar
        mode={mode} onModeChange={setMode}
        providers={providers} onRefresh={refreshProviders}
        onProviderChange={handleProviderChange}
        onModelChange={(m) => setPreference("model", m)}
        getModels={getModelsForProvider}
        onFetchModels={fetchModels}
      />
      <div className="flex-1 flex overflow-hidden">
        <FilePanel tree={tree} selectedPath={selectedPath} onSelect={selectFile} onRefresh={refreshTree} refreshing={refreshing} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {mode === "chat" ? (
            <>
              {diffView ? (
                <>
                  <div className="flex items-center gap-2 px-3 h-9 border-b border-border bg-muted shrink-0">
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground transition"
                      onClick={() => setDiffView(null)}
                    >
                      ✕ {t("file.closeDiff")}
                    </button>
                    <span className="text-xs text-muted-foreground font-mono">{diffView.path}</span>
                  </div>
                  <DiffPanel filePath={diffView.path} oldContent={diffView.old} newContent={diffView.new} />
                </>
              ) : (
                <CodePanel filePath={selectedPath} content={fileContent} loading={fileLoading} />
              )}
              <PlanPanel messages={messages} />
              <QueuePanel />
              <TerminalPanel output={terminalOutput} isStreaming={isStreaming} onClear={clearTerminal} />
            </>
          ) : (
            <TaskView providers={providers} />
          )}
        </div>
        {mode === "chat" && (
          <ChatPanel messages={messages} isStreaming={isStreaming} onSend={sendMessage} onCancel={cancelMessage} onClear={clearMessages} />
        )}
      </div>
    </div>
  )
}
