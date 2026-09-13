import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths: the same build is loaded from a normal server root
  // (standalone web) and from a vscode-webview:// URI rewritten by
  // webview.asWebviewUri (the VSCode extension) - relative paths work in both.
  base: "./",
  plugins: [react()],
});
