import type { Document, DotDocument } from "@dot-paint/core";
import { useSyncExternalStore } from "react";

export function useDocument(doc: Document): DotDocument {
  return useSyncExternalStore(
    (listener) => doc.subscribe(listener),
    () => doc.getState(),
  );
}
