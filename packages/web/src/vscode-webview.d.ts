// Minimal ambient type for the API a VSCode webview injects into the page.
// See packages/web/src/io/vscodeBridge.ts.

interface VsCodeWebviewApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeWebviewApi;
