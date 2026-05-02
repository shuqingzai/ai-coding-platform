import { spawn, ChildProcess } from "child_process"
import path from "path"
import { fileURLToPath } from "url"
import {
  createProtocolConnection,
  InitializeRequest,
  DidOpenTextDocumentNotification,
  DefinitionRequest,
  ReferencesRequest,
  HoverRequest,
  DocumentSymbolRequest,
  WorkspaceSymbolRequest,
  ImplementationRequest,
  CallHierarchyPrepareRequest,
  CallHierarchyIncomingCallsRequest,
  CallHierarchyOutgoingCallsRequest,
} from "vscode-languageserver-protocol"
import type { ProtocolConnection } from "vscode-languageserver-protocol"
import { StreamMessageReader, StreamMessageWriter } from "vscode-jsonrpc/node"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function getWorkspaceRoot(): string {
  if (process.env.WORKSPACE_ROOT) {
    return path.resolve(__dirname, "..", "..", process.env.WORKSPACE_ROOT)
  }
  return path.resolve(__dirname, "..", "..", "workspace")
}

interface LspClient {
  process: ChildProcess
  connection: ProtocolConnection
  language: string
  initialized: Promise<void>
  lastUsed: number
}

const clients = new Map<string, LspClient>()
const IDLE_TIMEOUT = 5 * 60 * 1000

function getLanguageFromExtension(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    ".ts": "typescript", ".tsx": "typescriptreact",
    ".js": "javascript", ".jsx": "javascriptreact",
    ".mjs": "javascript", ".cjs": "javascript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
  }
  return map[ext] || null
}

function getServerCommand(language: string): { command: string; args: string[] } | null {
  const commands: Record<string, { command: string; args: string[] }> = {
    typescript: { command: "typescript-language-server", args: ["--stdio"] },
    typescriptreact: { command: "typescript-language-server", args: ["--stdio"] },
    javascript: { command: "typescript-language-server", args: ["--stdio"] },
    javascriptreact: { command: "typescript-language-server", args: ["--stdio"] },
    python: { command: "pyright-langserver", args: ["--stdio"] },
    go: { command: "gopls", args: [] },
    rust: { command: "rust-analyzer", args: [] },
  }
  return commands[language] || null
}

async function getClient(filePath: string): Promise<LspClient | null> {
  const lang = getLanguageFromExtension(filePath)
  if (!lang) return null

  const langGroup = lang.includes("type") || lang.includes("java") ? "typescript" : lang
  const existing = clients.get(langGroup)
  if (existing) {
    existing.lastUsed = Date.now()
    await existing.initialized
    return existing
  }

  const serverCmd = getServerCommand(lang)
  if (!serverCmd) return null

  const proc = spawn(serverCmd.command, serverCmd.args, {
    stdio: ["pipe", "pipe", "pipe"],
  })

  const connection = createProtocolConnection(
    new StreamMessageReader(proc.stdout!),
    new StreamMessageWriter(proc.stdin!),
    undefined
  )

  connection.listen()

  proc.on("exit", (code) => {
    clients.delete(langGroup)
    if (code !== 0 && code !== null) {
      console.error(`LSP server ${langGroup} exited with code ${code}`)
    }
  })

  const client: LspClient = {
    process: proc,
    connection,
    language: langGroup,
    lastUsed: Date.now(),
    initialized: connection.sendRequest(InitializeRequest.type, {
      processId: process.pid,
      rootUri: `file://${getWorkspaceRoot()}`,
      capabilities: {},
    }).then(() => {
      connection.sendNotification(DidOpenTextDocumentNotification.type, {
        textDocument: {
          uri: `file://${filePath}`,
          languageId: lang,
          version: 1,
          text: "",
        },
      })
    }),
  }

  clients.set(langGroup, client)
  return client
}

// Clean up idle clients every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, client] of clients) {
    if (now - client.lastUsed > IDLE_TIMEOUT) {
      client.process.kill()
      clients.delete(key)
    }
  }
}, 60000)

async function formatResults(results: any[] | null | undefined): Promise<string> {
  if (!results || (Array.isArray(results) && results.length === 0)) {
    return "No results found"
  }
  return JSON.stringify(results, null, 2)
}

export const lspTool = {
  async execute(
    operation: string,
    filePath: string,
    line?: number,
    character?: number,
    query?: string
  ): Promise<string> {
    const client = await getClient(filePath)
    if (!client) {
      throw new Error(`No LSP server available for this file type: ${path.extname(filePath)}`)
    }

    const resolvePath = (p: string) => path.resolve(getWorkspaceRoot(), p)
    const resolvedPath = resolvePath(filePath)

    try {
      switch (operation) {
        case "goToDefinition": {
          const result = await client.connection.sendRequest(DefinitionRequest.type, {
            textDocument: { uri: `file://${resolvedPath}` },
            position: { line: (line || 1) - 1, character: (character || 1) - 1 },
          })
          return formatResults(result as any[])
        }
        case "findReferences": {
          const result = await client.connection.sendRequest(ReferencesRequest.type, {
            textDocument: { uri: `file://${resolvedPath}` },
            position: { line: (line || 1) - 1, character: (character || 1) - 1 },
            context: { includeDeclaration: true },
          })
          return formatResults(result as any[])
        }
        case "hover": {
          const result = await client.connection.sendRequest(HoverRequest.type, {
            textDocument: { uri: `file://${resolvedPath}` },
            position: { line: (line || 1) - 1, character: (character || 1) - 1 },
          })
          if (!result) return "No hover info found"
          const contents = Array.isArray(result.contents)
            ? result.contents.map((c: any) => typeof c === "string" ? c : c.value).join("\n")
            : typeof result.contents === "string" ? result.contents : String(result.contents)
          return contents.toString()
        }
        case "documentSymbol": {
          const result = await client.connection.sendRequest(DocumentSymbolRequest.type, {
            textDocument: { uri: `file://${resolvedPath}` },
          })
          return formatResults(result as any[])
        }
        case "workspaceSymbol": {
          const result = await client.connection.sendRequest(WorkspaceSymbolRequest.type, {
            query: query || "",
          })
          return formatResults(result as any[])
        }
        case "goToImplementation": {
          const result = await client.connection.sendRequest(ImplementationRequest.type, {
            textDocument: { uri: `file://${resolvedPath}` },
            position: { line: (line || 1) - 1, character: (character || 1) - 1 },
          })
          return formatResults(result as any[])
        }
        case "prepareCallHierarchy": {
          const result = await client.connection.sendRequest(CallHierarchyPrepareRequest.type, {
            textDocument: { uri: `file://${resolvedPath}` },
            position: { line: (line || 1) - 1, character: (character || 1) - 1 },
          })
          return formatResults(result as any[])
        }
        case "incomingCalls": {
          const items = await client.connection.sendRequest(CallHierarchyPrepareRequest.type, {
            textDocument: { uri: `file://${resolvedPath}` },
            position: { line: (line || 1) - 1, character: (character || 1) - 1 },
          })
          if (!items || (items as any[]).length === 0) return "No call hierarchy found"
          const calls = await client.connection.sendRequest(CallHierarchyIncomingCallsRequest.type, {
            item: (items as any[])[0],
          })
          return formatResults(calls as any[])
        }
        case "outgoingCalls": {
          const items = await client.connection.sendRequest(CallHierarchyPrepareRequest.type, {
            textDocument: { uri: `file://${resolvedPath}` },
            position: { line: (line || 1) - 1, character: (character || 1) - 1 },
          })
          if (!items || (items as any[]).length === 0) return "No call hierarchy found"
          const calls = await client.connection.sendRequest(CallHierarchyOutgoingCallsRequest.type, {
            item: (items as any[])[0],
          })
          return formatResults(calls as any[])
        }
        default:
          throw new Error(`Unknown LSP operation: ${operation}`)
      }
    } catch (err: any) {
      return `LSP operation failed: ${err.message}`
    }
  },
}
