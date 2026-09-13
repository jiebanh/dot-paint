import { deserialize, render } from "@dot-paint/core";
import { PNG } from "pngjs";
import * as vscode from "vscode";
import type { DotPaintEditorProvider } from "./dotPaintEditorProvider";

/**
 * The extension host has no DOM/canvas (unlike packages/web, which uses
 * canvas.toBlob), so PNG encoding happens here via pngjs against the same
 * core.render() RGBA buffer the webview uses to draw.
 */
export function registerExportPngCommand(provider: DotPaintEditorProvider): vscode.Disposable {
  return vscode.commands.registerCommand("dotPaint.exportPng", async () => {
    const doc = provider.getActiveDocument();
    if (!doc) {
      vscode.window.showErrorMessage("Dot Paint: open a .dpaint file to export it as PNG.");
      return;
    }

    const state = deserialize(doc.getContent());
    const rgba = render(state);

    const png = new PNG({ width: state.width, height: state.height });
    png.data = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
    const buffer = PNG.sync.write(png);

    const defaultUri = doc.uri.with({ path: doc.uri.path.replace(/\.dpaint$/, ".png") });
    const destination = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { "PNG image": ["png"] },
    });
    if (!destination) return;

    await vscode.workspace.fs.writeFile(destination, buffer);
    vscode.window.showInformationMessage(`Dot Paint: exported ${vscode.workspace.asRelativePath(destination)}`);
  });
}
