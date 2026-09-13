import type * as vscode from "vscode";
import { DotPaintEditorProvider } from "./dotPaintEditorProvider";
import { registerExportPngCommand } from "./exportPngCommand";

export function activate(context: vscode.ExtensionContext): void {
  const { provider, disposable } = DotPaintEditorProvider.create(context);
  context.subscriptions.push(disposable);
  context.subscriptions.push(registerExportPngCommand(provider));
}

export function deactivate(): void {}
