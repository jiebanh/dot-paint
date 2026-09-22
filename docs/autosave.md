# auto-save & restore

Web-only (`packages/web`). Not present in the VSCode extension: there, the host owns the
`.dpaint` file and its own backup/hot-exit mechanism already covers what auto-save covers in
the browser, so `FileMenu` — and everything below — is not rendered in that mode.

## why it exists

The browser has no durable file handle by default (no File System Access API, or the user
never picked a save location) and a crashed tab or accidental close would otherwise lose
unsaved work. Auto-save is a local, best-effort safety net for that gap — not a replacement
for actually saving a `.dpaint` file.

## data model

```ts
interface AutosaveRecord {
  id: string;        // generateAutosaveId(): crypto.randomUUID(), with a timestamp+random fallback
  name: string;       // the filename the document had at the time (falls back to "untitled.dpaint")
  json: string;       // core.serialize(doc.getState()) - a full .dpaint file body
  updatedAt: number;  // Date.now() at the time of this save
}
```

Stored in IndexedDB (`packages/web/src/io/autosave.ts`):

- Database `dot-paint`, object store `autosave`, `keyPath: "id"`, `DB_VERSION = 2`.
- `saveAutosave(record)` — upsert (`put`) by `id`.
- `listAutosaves()` — all records (`getAll`), unsorted; callers sort (the browser UI sorts by
  `updatedAt` descending, newest first).
- `deleteAutosave(id)` — remove one record.

IndexedDB was chosen over `localStorage` here (unlike the theme library, which uses
`localStorage`) because a record's `json` can be large — up to ~256 KB of raw pixel data at
the 512×512 maximum, base64-encoded in the file body.

### storage budget

No cap on the *number* of records — only on their total size. After every `saveAutosave`,
`enforceStorageBudget` sums `json.length` (an ASCII-content approximation of byte size, not
an exact one) across all records; once that total exceeds `MAX_TOTAL_BYTES` (20 MiB), it
deletes records oldest-`updatedAt`-first until back under budget. The record that was just
written is never evicted for being over budget — if a single record's own size already
exceeds the cap, it's kept anyway (auto-save never refuses to save) and every other record
is evicted to make room.

### v1 → v2 migration

The original implementation (v1) kept exactly one record under a fixed key, with no
`keyPath` — incompatible with `getAll`/`delete(id)`. Bumping `DB_VERSION` to 2 triggers
`onupgradeneeded`, which drops the old object store and recreates it with `keyPath: "id"`.
The single old snapshot is discarded rather than migrated; it wasn't worth carrying a
migration path for one best-effort local blob.

## lifecycle: when a record is created vs. updated

`FileMenu` (`packages/web/src/components/FileMenu.tsx`) holds one ref,
`autosaveIdRef: string | undefined` — the id of the record the *current* document is
writing to, if any.

- **A document's identity changing** (new document, opening a file, restoring an
  auto-save) resets `autosaveIdRef.current = undefined` via a `useEffect` keyed on the
  `Document` instance. The next auto-save for that document then mints a fresh id
  (`autosaveIdRef.current ??= generateAutosaveId()`).
- **While the "Auto-save" checkbox is on**, every `Document` change is debounced
  (500 ms) and written with `saveAutosave({ id: autosaveIdRef.current, ... })` — so a
  continuous editing session keeps updating the *same* record.
- **Restoring an older snapshot and continuing to edit does not overwrite the record you
  restored from.** Restore replaces the in-memory document (via `onOpen`), which is a
  document-identity change like any other, so the next auto-save starts a new record. This
  is deliberate: a restore point stays intact even if you keep editing after loading it, at
  the cost of the list growing over time - pruning is manual, via delete.

There is no "auto-restore on startup" — the old v1 behavior of silently loading the one
existing record on mount doesn't generalize to "which of several records?", so restoring is
always an explicit user action (see below).

## UI

- **Auto-save checkbox** (`FileMenu`): turns the debounced-save behavior in the lifecycle
  section on/off. Off by default.
- **"Restore…" button** opens `AutosaveBrowserDialog`
  (`packages/web/src/components/AutosaveBrowserDialog.tsx`), a `<dialog>` listing every
  saved record (`name` + `updatedAt`, formatted with `toLocaleString()`), newest first.
  Each row has:
  - a click-to-load action (`onRestore`, wired to `FileMenu`'s `handleRestore`, which
    deserializes the record's `json` and swaps in a new `Document`)
  - a delete (`×`) action, calling `deleteAutosave`

## known limitations / non-goals

- Single-browser, single-profile: nothing here is synced or shared between browsers,
  devices, or with the VSCode extension.
- The 20 MiB budget is enforced in bytes-of-`json`, not record count - a handful of
  large (512×512) canvases and dozens of small ones can coexist under the same cap.
- No corruption/quota handling beyond a plain error message surfaced next to the Auto-save
  checkbox (`FileMenu`'s `error` state) - a failed write is not retried.
