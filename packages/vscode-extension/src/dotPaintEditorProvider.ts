import { readFileSync } from "node:fs";
import * as vscode from "vscode";
import { DotPaintDocument } from "./dotPaintDocument";

type WebviewToHostMessage = { type: "ready" } | { type: "changed"; json: string };
type HostToWebviewMessage = { type: "init"; json: string };

/**
 * Loads the packages/web build (copied into dist/webview by esbuild.mjs) into
 * the webview and bridges it to the extension host over postMessage:
 * - host -> webview "init": the current .dpaint content, sent once the
 *   webview reports "ready" (avoids a race where the host posts before the
 *   page has attached its listener).
 * - webview -> host "changed": the webview's own core.Document is the editor
 *   of record: it owns painting, undo/redo, everything. This just reports the
 *   latest serialized content so the host can mark the tab dirty and know
 *   what to write on save.
 */
export class DotPaintEditorProvider implements vscode.CustomEditorProvider<DotPaintDocument> {
  static create(context: vscode.ExtensionContext): { provider: DotPaintEditorProvider; disposable: vscode.Disposable } {
    const provider = new DotPaintEditorProvider(context);
    const disposable = vscode.window.registerCustomEditorProvider("dotPaint.editor", provider, {
      webviewOptions: { retainContextWhenHidden: true },
    });
    return { provider, disposable };
  }

  private readonly changeEmitter = new vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<DotPaintDocument>>();
  readonly onDidChangeCustomDocument = this.changeEmitter.event;

  private readonly panelsByDocument = new Map<DotPaintDocument, Set<vscode.WebviewPanel>>();
  private activeDocument: DotPaintDocument | undefined;

  private constructor(private readonly context: vscode.ExtensionContext) {}

  /** The document behind the currently focused dot-paint editor tab, if any - used by the Export PNG command. */
  getActiveDocument(): DotPaintDocument | undefined {
    return this.activeDocument;
  }

  async openCustomDocument(uri: vscode.Uri): Promise<DotPaintDocument> {
    return DotPaintDocument.create(uri);
  }

  async resolveCustomEditor(doc: DotPaintDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
    const webviewRoot = vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview");
    webviewPanel.webview.options = { enableScripts: true, localResourceRoots: [webviewRoot] };
    webviewPanel.webview.html = this.renderHtml(webviewPanel.webview, webviewRoot);

    const panels = this.panelsByDocument.get(doc) ?? new Set<vscode.WebviewPanel>();
    panels.add(webviewPanel);
    this.panelsByDocument.set(doc, panels);

    if (webviewPanel.active) this.activeDocument = doc;
    webviewPanel.onDidChangeViewState(() => {
      if (webviewPanel.active) this.activeDocument = doc;
    });
    webviewPanel.onDidDispose(() => {
      panels.delete(webviewPanel);
      if (this.activeDocument === doc && panels.size === 0) this.activeDocument = undefined;
    });

    webviewPanel.webview.onDidReceiveMessage((message: WebviewToHostMessage) => {
      if (message.type === "ready") {
        webviewPanel.webview.postMessage({ type: "init", json: doc.getContent() } satisfies HostToWebviewMessage);
      } else if (message.type === "changed") {
        doc.setContent(message.json);
        this.changeEmitter.fire({ document: doc });
      }
    });
  }

  async saveCustomDocument(doc: DotPaintDocument): Promise<void> {
    await doc.save();
  }

  async saveCustomDocumentAs(doc: DotPaintDocument, destination: vscode.Uri): Promise<void> {
    await doc.save(destination);
  }

  async revertCustomDocument(doc: DotPaintDocument): Promise<void> {
    const reloaded = await DotPaintDocument.create(doc.uri);
    doc.setContent(reloaded.getContent());
    for (const panel of this.panelsByDocument.get(doc) ?? []) {
      panel.webview.postMessage({ type: "init", json: doc.getContent() } satisfies HostToWebviewMessage);
    }
  }

  async backupCustomDocument(
    doc: DotPaintDocument,
    ctx: vscode.CustomDocumentBackupContext,
  ): Promise<vscode.CustomDocumentBackup> {
    await doc.save(ctx.destination);
    return {
      id: ctx.destination.toString(),
      delete: async () => {
        try {
          await vscode.workspace.fs.delete(ctx.destination);
        } catch {
          // already gone
        }
      },
    };
  }

  private renderHtml(webview: vscode.Webview, webviewRoot: vscode.Uri): string {
    const indexPath = vscode.Uri.joinPath(webviewRoot, "index.html");
    let html = readFileSync(indexPath.fsPath, "utf-8");

    html = html.replace(/(src|href)="(\.[^"]+)"/g, (_match, attr: string, relPath: string) => {
      const uri = webview.asWebviewUri(vscode.Uri.joinPath(webviewRoot, relPath));
      return `${attr}="${uri.toString()}"`;
    });

    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src ${webview.cspSource}`,
    ].join("; ");

    return html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`);
  }
}
