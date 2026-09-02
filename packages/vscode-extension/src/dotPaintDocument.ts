import { deserialize, Document, serialize } from "@dot-paint/core";
import * as vscode from "vscode";

export class DotPaintDocument implements vscode.CustomDocument {
  static async create(uri: vscode.Uri): Promise<DotPaintDocument> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const state = deserialize(Buffer.from(bytes).toString("utf-8"));
    return new DotPaintDocument(uri, new Document(state));
  }

  readonly document: Document;

  private constructor(
    readonly uri: vscode.Uri,
    document: Document,
  ) {
    this.document = document;
  }

  async save(target: vscode.Uri = this.uri): Promise<void> {
    const json = serialize(this.document.getState());
    await vscode.workspace.fs.writeFile(target, Buffer.from(json, "utf-8"));
  }

  dispose(): void {}
}
