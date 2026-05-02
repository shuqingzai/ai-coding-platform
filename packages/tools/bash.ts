import { z } from "zod"
import type { ToolDef } from "./types"
import { shellTool } from "./shell"
import { truncateOutput } from "./truncate"

const DESCRIPTION = `executes a given bash command in a persistent shell session with optional timeout, ensuring proper handling and security measures.

be aware: os: darwin, shell: zsh

all commands run in the current working directory by default. use the workdir parameter if you need to run a command in a different directory. avoid using cd patterns - use workdir instead.

important: this tool is for terminal operations like git, npm, docker, etc. do not use it for file operations (reading, writing, editing, searching, finding files) - use the specialized tools for this instead.

before executing the command:
1. directory verification: if the command will create new directories or files, first use ls to verify the parent directory exists
2. command execution: always quote file paths that contain spaces with double quotes

usage notes:
- the command argument is required.
- optional timeout in milliseconds. default 120000ms (2 minutes).
- if the commands are independent and can run in parallel, make multiple bash tool calls in a single message.
- if the commands depend on each other and must run sequentially, use a single bash call with '&&' to chain them together
- use ';' only when you need to run commands sequentially but don't care if earlier commands fail
- do not use newlines to separate commands (newlines are ok in quoted strings)
- avoid using cd. use the workdir parameter to change directories instead.

the command is executed in the workspace root directory by default.
30 commands are allowlisted for security.`

export const bashTool: ToolDef = {
  id: "bash",
  description: DESCRIPTION,
  parameters: z.object({
    command: z.string().describe("shell 命令"),
    workdir: z.string().optional().describe("工作目录 (使用 workdir 而不是 cd)"),
    timeout: z.number().optional().describe("超时毫秒数, 默认 120000 (2 分钟)"),
  }),
  async execute(args, ctx) {
    ctx.emitProgress({ title: "执行命令", content: args.command })
    const result = await shellTool(args.command, {
      timeout: args.timeout ?? 120000,
      workdir: args.workdir,
    })
    const truncated = await truncateOutput(result, "bash")
    return {
      title: `bash: ${args.command.slice(0, 60)}`,
      output: truncated.content,
      truncated: truncated.truncated,
      outputPath: truncated.outputPath,
    }
  },
}
