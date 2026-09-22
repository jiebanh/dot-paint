import { deserialize, render, upscaleRgba } from "@dot-paint/core";
import { PNG } from "pngjs";
import * as vscode from "vscode";
import type { DotPaintEditorProvider } from "./dotPaintEditorProvider";

const SCALE_CHOICES = ["1x", "2x", "4x", "8x"];

/**
 * The extension host has no DOM/canvas (unlike packages/web, which uses
 * canvas.toBlob), so PNG encoding happens here via pngjs against the same
 * core.render() RGBA buffer the webview uses to draw. Upscaling goes through
 * core's upscaleRgba too, rather than pngjs doing its own pixel duplication,
 * so this produces pixel-identical output to the web export at the same
 * scale (the encoded PNG bytes can still differ - different encoders).
 */
export function registerExportPngCommand(provider: DotPaintEditorProvider): vscode.Disposable {
  return vscode.commands.registerCommand("dotPaint.exportPng", async () => {
    const doc = provider.getActiveDocument();
    if (!doc) {
      vscode.window.showErrorMessage("Dot Paint: open a .dpaint file to export it as PNG.");
      return;
    }

    const scaleChoice = await vscode.window.showQuickPick(SCALE_CHOICES, {
      placeHolder: "Export scale",
    });
    if (!scaleChoice) return; // cancelled
    const scaleFactor = Number(scaleChoice.replace("x", ""));

    const state = deserialize(doc.getContent());
    const rgba = upscaleRgba(render(state), state.width, state.height, scaleFactor);

    const png = new PNG({ width: state.width * scaleFactor, height: state.height * scaleFactor });
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
