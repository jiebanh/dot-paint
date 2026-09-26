import { deflateSync } from "node:zlib";
import { buildApngBytes, deserialize, filterScanlines, render, upscaleRgba } from "@dot-paint/core";
import * as vscode from "vscode";
import type { DotPaintEditorProvider } from "./dotPaintEditorProvider";

const SCALE_CHOICES = ["1x", "2x", "4x", "8x"];

/**
 * Same render -> upscale -> filter -> deflate -> buildApngBytes pipeline as
 * packages/web/src/io/apngExport.ts, deflating via node:zlib (sync, built
 * in) instead of the browser's CompressionStream - the only platform-specific
 * piece, since core.buildApngBytes just wraps already-deflated frame bytes.
 */
export function registerExportApngCommand(provider: DotPaintEditorProvider): vscode.Disposable {
  return vscode.commands.registerCommand("dotPaint.exportApng", async () => {
    const doc = provider.getActiveDocument();
    if (!doc) {
      vscode.window.showErrorMessage("Dot Paint: open a .dpaint file to export it as an animated PNG.");
      return;
    }

    const scaleChoice = await vscode.window.showQuickPick(SCALE_CHOICES, {
      placeHolder: "Export scale",
    });
    if (!scaleChoice) return; // cancelled
    const scaleFactor = Number(scaleChoice.replace("x", ""));

    const state = deserialize(doc.getContent());
    const outWidth = state.width * scaleFactor;
    const outHeight = state.height * scaleFactor;

    const frames = state.frames.map((_, frameIndex) => {
      const rgba = upscaleRgba(render(state, frameIndex), state.width, state.height, scaleFactor);
      const idat = deflateSync(filterScanlines(rgba, outWidth, outHeight));
      return { idat, delayMs: state.frameIntervalMs };
    });
    const buffer = Buffer.from(buildApngBytes(outWidth, outHeight, frames));

    const defaultUri = doc.uri.with({ path: doc.uri.path.replace(/\.dpaint(-anim)?$/, ".png") });
    const destination = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { "PNG image": ["png"] },
    });
    if (!destination) return;

    await vscode.workspace.fs.writeFile(destination, buffer);
    vscode.window.showInformationMessage(`Dot Paint: exported ${vscode.workspace.asRelativePath(destination)}`);
  });
}
