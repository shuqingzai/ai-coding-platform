import { createToolRegistry } from "./registry"
import { bashTool } from "./bash"
import { readTool } from "./read"
import { writeTool } from "./write"
import { editTool } from "./edit"
import { grepTool } from "./grep"
import { globTool } from "./glob"
import { skillTool } from "./skill"
import { todowriteTool, todoEmitter } from "./todowrite"
import { questionTool, questionEmitter } from "./question"
import { taskTool, setTaskExecutor } from "./task"
import { webfetchTool } from "./webfetch"
import { websearchTool } from "./websearch"
import { applyPatchTool } from "./apply_patch"
import { lspDef } from "./lsp_tool"
import { planTool } from "./plan"
import { invalidTool } from "./invalid"

// 创建全局注册表
const registry = createToolRegistry()

// 注册所有 16 个内置工具
registry.register(bashTool)
registry.register(readTool)
registry.register(writeTool)
registry.register(editTool)
registry.register(grepTool)
registry.register(globTool)
registry.register(skillTool)
registry.register(todowriteTool)
registry.register(questionTool)
registry.register(taskTool)
registry.register(webfetchTool)
registry.register(websearchTool)
registry.register(applyPatchTool)
registry.register(lspDef)
registry.register(planTool)
registry.register(invalidTool)

export { registry }
export { createToolRegistry } from "./registry"
export type { ToolRegistry } from "./registry"
export type { ToolDef, ToolContext, ToolExecuteResult } from "./types"
export { getWorkspaceRoot, resolveSafe } from "./types"
export { createToolContext } from "./context"
export { truncateOutput } from "./truncate"
export { todoEmitter } from "./todowrite"
export type { TodoItem } from "./todowrite"
export { questionEmitter } from "./question"
export { setTaskExecutor } from "./task"
