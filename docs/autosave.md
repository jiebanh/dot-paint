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
  name: string;       // primary key - the filename at the time of this save
  json: string;        // core.serialize(doc.getState()) - a full .dpaint file body
  updatedAt: number;   // Date.now() at the time of this save
}
```

**One record per filename.** Saving under a name that already has a record replaces it —
there's no history of past saves for the same file, just its latest auto-saved state. All
untitled documents (no name yet) share the single `"untitled.dpaint"` key; that's a
deliberate simplification the auto-save feature accepts, not a bug.

Stored in IndexedDB (`packages/web/src/io/autosave.ts`):

- Database `dot-paint`, object store `autosave`, `keyPath: "name"`, `DB_VERSION = 3`.
- `saveAutosave(record)` — upsert (`put`) by `name`.
- `listAutosaves()` — all records (`getAll`), unsorted; callers sort (the browser UI sorts by
  `updatedAt` descending, newest first).
- `deleteAutosave(name)` — remove one record.

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
is evicted to make room. In practice this rarely bites now that records are keyed by
filename rather than accumulating one per editing session.

### schema history

Each prior version keyed the store differently and none were worth migrating (a
best-effort local cache, not data anyone depends on surviving a schema change) - each
version bump just drops and recreates the object store:

- v1: a single fixed key, one record total, no `keyPath`.
- v2: many records keyed by a randomly generated `id` (one per editing session).
- v3 (current): one record per filename, keyed by `name`.

## lifecycle: which record a save goes to

`FileMenu` (`packages/web/src/components/FileMenu.tsx`) holds `filenameRef: string |
undefined` — the filename the current document is known by, used directly as the auto-save
key (falling back to `"untitled.dpaint"`). There's no separate session id: saving under the
same name always overwrites that name's record, so re-opening (or re-creating) a document
with a name you've auto-saved before naturally lands back on that same slot - "tracing back
through the filename" is just what upserting by name does.

`namedForDocRef` (a second ref, holding the `Document` instance `filenameRef` currently
describes) exists to catch the one case that isn't a `FileMenu`-initiated rename: a brand
new blank document from `NewDocumentDialog` changes `doc`'s identity without `FileMenu`
being told a new name. A `useEffect` keyed on `doc` compares it against `namedForDocRef`;
on a mismatch (this doc change wasn't accompanied by `FileMenu` setting a name itself), it
resets `filenameRef.current = undefined` — collapsing a fresh "New" document onto the shared
`"untitled.dpaint"` slot rather than continuing to write under whatever file was open
before. `handleOpen` and `handleRestore` set both refs together, so they don't trigger that
reset.

While the "Auto-save" checkbox is on, every `Document` change is debounced (500 ms) and
written to `filenameRef.current ?? "untitled.dpaint"`.

There is no "auto-restore on startup" — restoring is always an explicit user action (see
below), the same as it was under the old multi-session (v2) model.

## UI

- **Auto-save checkbox** (`FileMenu`): turns the debounced-save behavior in the lifecycle
  section on/off. Off by default.
- **"Restore…" button** opens `AutosaveBrowserDialog`
  (`packages/web/src/components/AutosaveBrowserDialog.tsx`), a `<dialog>` listing every
  saved record (`name` + `updatedAt`, formatted with `toLocaleString()`), newest first.
  Each row has:
  - a click-to-load action (`onRestore`, wired to `FileMenu`'s `handleRestore`, which
    deserializes the record's `json` and swaps in a new `Document`)
  - a delete (`×`) action, calling `deleteAutosave(name)`

## known limitations / non-goals

- Single-browser, single-profile: nothing here is synced or shared between browsers,
  devices, or with the VSCode extension.
- One record per filename means no history - auto-save only ever remembers the *latest*
  state under a given name, never earlier saves under that same name.
- Two different documents that happen to share a filename (most commonly two untitled ones)
  overwrite each other's auto-save; this is accepted, not guarded against.
- No corruption/quota handling beyond a plain error message surfaced next to the Auto-save
  checkbox (`FileMenu`'s `error` state) - a failed write is not retried.
