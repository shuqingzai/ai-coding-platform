import { z } from "zod"
import type { ToolDef } from "./types"
import { lspTool } from "./lsp"

export const lspDef: ToolDef = {
  id: "lsp",
  description: `interact with language server protocol (lsp) servers for code intelligence features.

supported operations:
- goToDefinition: find where a symbol is defined
- findReferences: find all references to a symbol
- hover: get hover info for a symbol (documentation, type info)
- documentSymbol: get all symbols in a document
- workspaceSymbol: search for symbols matching a query across the entire project
- goToImplementation: find implementations of an interface or abstract method
- prepareCallHierarchy: get call hierarchy item at a position
- incomingCalls: find all functions/methods that call the function at a position
- outgoingCalls: find all functions/methods called by the function at a position

all operations require filepath. line and character are 1-based. workspaceSymbol accepts query string.`,
  parameters: z.object({
    operation: z.string().describe("lsp 操作名"),
    filePath: z.string().describe("文件绝对或相对路径"),
    line: z.number().optional().describe("行号 (1-based)"),
    character: z.number().optional().describe("字符偏移 (1-based)"),
    query: z.string().optional().describe("搜索查询 (workspaceSymbol)"),
  }),
  async execute(args, ctx) {
    const result = await lspTool.execute(
      args.operation, args.filePath, args.line, args.character, args.query
    )
    return { title: `lsp: ${args.operation}`, output: result }
  },
}
