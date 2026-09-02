export class HistoryManager<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];

  push(entry: T): void {
    this.undoStack.push(entry);
    this.redoStack = [];
  }

  undo(): T | undefined {
    const entry = this.undoStack.pop();
    if (entry === undefined) return undefined;
    this.redoStack.push(entry);
    return entry;
  }

  redo(): T | undefined {
    const entry = this.redoStack.pop();
    if (entry === undefined) return undefined;
    this.undoStack.push(entry);
    return entry;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
