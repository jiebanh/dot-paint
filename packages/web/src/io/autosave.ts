export interface AutosaveRecord {
  id: string;
  name: string;
  json: string;
  updatedAt: number;
}

const DB_NAME = "dot-paint";
const STORE_NAME = "autosave";
const DB_VERSION = 2; // v1 stored a single fixed-key record; v2 is keyed by id, many records

/**
 * Total storage budget across all records, in bytes (approximated as
 * record.json.length - close enough for a soft local cache budget, since the
 * content is almost entirely ASCII: base64 pixel data + JSON syntax).
 * No cap on record *count* - only on total size; oldest records are evicted
 * to make room, newest-first is never evicted for being "too many".
 */
const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20 MiB

export function generateAutosaveId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `autosave-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isIndexedDbSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!isIndexedDbSupported()) {
    return Promise.reject(new Error("IndexedDB is not available in this browser"));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Migrating from v1's single fixed-key record: that store has no
      // keyPath, which getAll()/put(record)/delete(id) all need here, so it
      // can't be reused as-is. The old snapshot isn't worth a migration path.
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAutosave(record: AutosaveRecord): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  await enforceStorageBudget(record.id);
}

/** Evicts the oldest records (by updatedAt) until the total size is back under budget. */
async function enforceStorageBudget(justWrittenId: string): Promise<void> {
  const records = await listAutosaves();
  let total = records.reduce((sum, r) => sum + r.json.length, 0);
  if (total <= MAX_TOTAL_BYTES) return;

  const evictable = records.filter((r) => r.id !== justWrittenId).sort((a, b) => a.updatedAt - b.updatedAt);

  for (const record of evictable) {
    if (total <= MAX_TOTAL_BYTES) break;
    await deleteAutosave(record.id);
    total -= record.json.length;
  }
}

export async function listAutosaves(): Promise<AutosaveRecord[]> {
  const db = await openDb();
  try {
    return await new Promise<AutosaveRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as AutosaveRecord[]);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteAutosave(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
