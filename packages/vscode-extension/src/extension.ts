import type * as vscode from "vscode";
import { DotPaintEditorProvider } from "./dotPaintEditorProvider";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(DotPaintEditorProvider.register(context));
}

export function deactivate(): void {}
