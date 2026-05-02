export function log(level: "info" | "warn" | "error", message: string, context?: Record<string, unknown>) {
  const entry = { timestamp: new Date().toISOString(), level, message, ...context }
  const output = JSON.stringify(entry)
  if (level === "error") console.error(output)
  else if (level === "warn") console.warn(output)
  else console.log(output)
}
