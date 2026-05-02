import { exec } from "child_process"

const ALLOWED_COMMANDS = [
  "ls", "cat", "echo", "pwd", "cd",  "git",
  "tree", "find", "which", "curl", "grep", "rg", "head", "tail", "sed", "awk",
  "node", "npm", "pnpm", "npx", "tsc", "tsx",
  "mkdir", "touch", "cp", "mv", "rm",
  "python", "python3", "pip", "pip3",
]

interface ShellOptions {
  timeout?: number
  workdir?: string
  env?: Record<string, string>
}

export function shellTool(command: string, opts?: ShellOptions): Promise<string> {
  const timeout = opts?.timeout ?? 120000
  const workdir = opts?.workdir || process.cwd()
  const env = opts?.env ? { ...process.env, ...opts.env } : process.env

  const cmdName = command.trim().split(/\s+/)[0]

  if (!ALLOWED_COMMANDS.includes(cmdName)) {
    return Promise.reject(new Error(`命令不在白名单中: ${cmdName}。允许的命令: ${ALLOWED_COMMANDS.join(", ")}`))
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    exec(command, { timeout, cwd: workdir, env }, (error, stdout, stderr) => {
      const elapsed = Date.now() - startTime
      if (error) {
        reject(new Error(stderr || error.message))
      } else {
        const result = stdout.trim() || "(无输出)"
        resolve(`${result}\n(耗时 ${elapsed}ms)`)
      }
    })
  })
}
