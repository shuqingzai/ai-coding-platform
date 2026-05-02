import "./i18n"
import React from "react"
import ReactDOM from "react-dom/client"
import { TooltipProvider } from "@/components/ui/tooltip"
import App from "./App"
import "./index.css"

// 在 React 渲染前设置 data-theme，避免 FOUC
const stored = localStorage.getItem("theme") || "system"
const actual = stored === "system"
  ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  : stored
document.documentElement.setAttribute("data-theme", actual)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </React.StrictMode>
)
