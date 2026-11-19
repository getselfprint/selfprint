/**
 * Low-level IndexedDB access. Stores encrypted envelopes keyed by id; the
 * `meta` store additionally holds the (plaintext) salt and an encrypted
 * verifier used to check the passphrase on unlock. No model involvement.
 */

const DB_NAME = "selfprint";
const DB_VERSION = 1;

/** Object stores for the §9 entities, plus settings and meta. */
export const ENTITY_STORES = [
  "answers",
  "claims",
  "contradictions",
  "tests",
  "mirror",
  "settings",
] as const;

export const META_STORE = "meta";

export type EntityStore = (typeof ENTITY_STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of ENTITY_STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(store, mode).objectStore(store);
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet<T>(
  store: string,
  key: string,
): Promise<T | undefined> {
  const db = await openDB();
  return wrap(tx(db, store, "readonly").get(key) as IDBRequest<T | undefined>);
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return wrap(tx(db, store, "readonly").getAll() as IDBRequest<T[]>);
}

export async function idbPut(
  store: string,
  key: string,
  value: unknown,
): Promise<void> {
  const db = await openDB();
  await wrap(tx(db, store, "readwrite").put(value, key));
}

export async function idbDelete(store: string, key: string): Promise<void> {
  const db = await openDB();
  await wrap(tx(db, store, "readwrite").delete(key));
}

/** Delete the entire database (full wipe - spec §12). */
export async function deleteDatabase(): Promise<void> {
  if (dbPromise) {
    (await dbPromise).close();
    dbPromise = null;
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve(); // proceed; connections will close
  });
}
