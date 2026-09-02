import * as vscode from "vscode";
import { DotPaintDocument } from "./dotPaintDocument";

/**
 * Scaffold only: opens/saves .dpaint files and shows a placeholder webview.
 * Wiring the real canvas UI (the packages/web bundle) into the webview, plus
 * the postMessage bridge for edits and PNG export, is a follow-up step.
 */
export class DotPaintEditorProvider implements vscode.CustomEditorProvider<DotPaintDocument> {
  static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider("dotPaint.editor", new DotPaintEditorProvider(context), {
      webviewOptions: { retainContextWhenHidden: true },
    });
  }

  private readonly changeEmitter = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<DotPaintDocument>>();
  readonly onDidChangeCustomDocument = this.changeEmitter.event;

  private constructor(private readonly context: vscode.ExtensionContext) {}

  async openCustomDocument(uri: vscode.Uri): Promise<DotPaintDocument> {
    return DotPaintDocument.create(uri);
  }

  async resolveCustomEditor(doc: DotPaintDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = this.renderPlaceholder(doc);
  }

  async saveCustomDocument(doc: DotPaintDocument): Promise<void> {
    await doc.save();
  }

  async saveCustomDocumentAs(doc: DotPaintDocument, destination: vscode.Uri): Promise<void> {
    await doc.save(destination);
  }

  async revertCustomDocument(doc: DotPaintDocument): Promise<void> {
    const reloaded = await DotPaintDocument.create(doc.uri);
    doc.document.getState().pixels.set(reloaded.document.getState().pixels);
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

  private renderPlaceholder(doc: DotPaintDocument): string {
    const state = doc.document.getState();
    return `<!doctype html>
<html>
  <body style="font-family: sans-serif; padding: 1rem;">
    <p>dot-paint editor scaffold &mdash; ${state.width}×${state.height}, theme "${state.activeThemeId}"</p>
    <p>The full canvas UI (packages/web bundle) is not wired in yet.</p>
  </body>
</html>`;
  }
}
