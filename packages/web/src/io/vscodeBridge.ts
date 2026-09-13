export function isVsCodeWebview(): boolean {
  return typeof acquireVsCodeApi === "function";
}

let cachedApi: VsCodeWebviewApi | undefined;

// acquireVsCodeApi() may only be called once per webview session; cache the result.
function getVsCodeApi(): VsCodeWebviewApi {
  cachedApi ??= acquireVsCodeApi();
  return cachedApi;
}

export function postToHost(message: unknown): void {
  getVsCodeApi().postMessage(message);
}

/** Subscribes to messages the extension host posts into this webview. Returns an unsubscribe function. */
export function onHostMessage(handler: (message: unknown) => void): () => void {
  const listener = (e: MessageEvent) => handler(e.data);
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
