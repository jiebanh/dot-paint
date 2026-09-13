import { deserialize } from "@dot-paint/core";
import * as vscode from "vscode";

/**
 * Holds the .dpaint content for one open editor. Editing happens entirely in
 * the webview (it runs its own core.Document); this class is just the file
 * I/O side - the latest content it has seen, and reading/writing it to disk.
 */
export class DotPaintDocument implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<DotPaintDocument> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const json = Buffer.from(bytes).toString("utf-8");
    deserialize(json); // fail fast on a file the webview couldn't load either
    return new DotPaintDocument(uri, json);
  }

  private content: string;

  private constructor(
    readonly uri: vscode.Uri,
    initialContent: string,
  ) {
    this.content = initialContent;
  }

  getContent(): string {
    return this.content;
  }

  setContent(json: string): void {
    deserialize(json);
    this.content = json;
  }

  async save(target: vscode.Uri = this.uri): Promise<void> {
    await vscode.workspace.fs.writeFile(target, Buffer.from(this.content, "utf-8"));
  }

  dispose(): void {}
}
