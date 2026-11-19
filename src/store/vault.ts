import {
  type Sealed,
  deriveKey,
  generateDataKey,
  newSalt,
  unwrapDataKey,
  wrapDataKey,
} from "./crypto";
import {
  META_STORE,
  deleteDatabase,
  idbDelete,
  idbGet,
  idbPut,
  openDB,
} from "./db";
import { type SelfprintStore, buildStore } from "./store";

/**
 * Vault key model (spec §10, revised).
 *
 * Every record is encrypted with a single random **data key (DEK)**. Protection
 * is OPT-IN, so a passphrase is never forced:
 *   - "device" mode (the default): the DEK lives on the device (an IndexedDB
 *     CryptoKey). The app opens straight away, no passphrase. Data is still
 *     origin-scoped and off any server, just not protected by a secret.
 *   - "passphrase" mode: the DEK is wrapped under a passphrase-derived key and
 *     the plain copy is removed. Opening requires the passphrase (unless the
 *     user turns on "stay unlocked", which remembers the key on the device).
 *
 * Switching between modes only wraps/unwraps the DEK - the data is never
 * re-encrypted.
 */
const KEY_MODE = "keyMode"; // "device" | "passphrase"
const DEK_KEY = "dek"; // device mode: the data key, on the device
const SALT_KEY = "salt"; // passphrase mode: PBKDF2 salt
const WRAPPED_DEK = "wrappedDek"; // passphrase mode: DEK wrapped under the passphrase
const SESSION_KEY = "sessionKey"; // "stay unlocked": remembered DEK for reloads
const AUTOLOCK_KEY = "autoLock"; // passphrase mode: require passphrase every load

export type KeyMode = "device" | "passphrase";

export class WrongPassphraseError extends Error {
  constructor() {
    super("That passphrase is incorrect.");
    this.name = "WrongPassphraseError";
  }
}

/** An open vault: the store plus the live (extractable) data key. */
export interface Opened {
  store: SelfprintStore;
  dek: CryptoKey;
}

/**
 * A vault from the pre-device-key model (passphrase-required) wrote a
 * `verifier` into meta; the current model never does. Its records are
 * encrypted with a key we can no longer derive, so such a device starts fresh.
 * Call this once before opening, so a returning user isn't stuck on a vault we
 * can't read. (Pre-launch only affects local test data.)
 */
export async function clearIfLegacy(): Promise<void> {
  const db = await openDB();
  const legacy = await idbGet<unknown>(META_STORE, "verifier");
  if (legacy === undefined) return;
  // Clear every store IN PLACE (don't deleteDatabase - that can block on open
  // connections and then stall the reopen, hanging the app).
  const stores = [...db.objectStoreNames];
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(stores, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    for (const s of stores) tx.objectStore(s).clear();
  });
}

/** True once a vault exists on this device (in either mode). */
export async function isInitialized(): Promise<boolean> {
  await openDB();
  return (await idbGet<KeyMode>(META_STORE, KEY_MODE)) !== undefined;
}

export async function getKeyMode(): Promise<KeyMode | null> {
  await openDB();
  return (await idbGet<KeyMode>(META_STORE, KEY_MODE)) ?? null;
}

export async function getAutoLock(): Promise<boolean> {
  await openDB();
  return (await idbGet<boolean>(META_STORE, AUTOLOCK_KEY)) ?? false;
}

export async function setAutoLockPref(on: boolean): Promise<void> {
  await idbPut(META_STORE, AUTOLOCK_KEY, on);
}

/** Remember the data key so a passphrase-protected vault reopens without asking. */
export async function rememberKey(dek: CryptoKey): Promise<void> {
  await idbPut(META_STORE, SESSION_KEY, dek);
}

/** Forget the remembered key (lock now, or auto-lock turned on). */
export async function forgetKey(): Promise<void> {
  await idbDelete(META_STORE, SESSION_KEY);
}

/**
 * First run: create an unprotected device-key vault. No passphrase prompt - the
 * user is dropped straight into the app and can add a passphrase later.
 */
export async function initDeviceVault(): Promise<Opened> {
  const dek = await generateDataKey();
  await idbPut(META_STORE, DEK_KEY, dek);
  await idbPut(META_STORE, KEY_MODE, "device");
  return { store: buildStore(dek), dek };
}

/**
 * Open the vault without asking for a passphrase, when that's allowed:
 *  - device mode always opens (the key is on the device);
 *  - passphrase mode opens only if a key was remembered and auto-lock is off.
 * Returns null when the caller must show the unlock screen.
 */
export async function openVault(): Promise<Opened | null> {
  const mode = await getKeyMode();
  if (mode === "device") {
    const dek = await idbGet<CryptoKey>(META_STORE, DEK_KEY);
    return dek ? { store: buildStore(dek), dek } : null;
  }
  if (mode === "passphrase") {
    if (await getAutoLock()) return null;
    const dek = await idbGet<CryptoKey>(META_STORE, SESSION_KEY);
    return dek ? { store: buildStore(dek), dek } : null;
  }
  return null;
}

/** Unlock a passphrase-protected vault. Throws WrongPassphraseError. */
export async function unlockVault(passphrase: string): Promise<Opened> {
  const salt = await idbGet<Uint8Array>(META_STORE, SALT_KEY);
  const wrapped = await idbGet<Sealed>(META_STORE, WRAPPED_DEK);
  if (!salt || !wrapped) {
    throw new Error("No passphrase-protected vault on this device.");
  }
  const kek = await deriveKey(passphrase, salt);
  let dek: CryptoKey;
  try {
    dek = await unwrapDataKey(wrapped, kek);
  } catch {
    throw new WrongPassphraseError();
  }
  return { store: buildStore(dek), dek };
}

/**
 * Opt in to passphrase protection: wrap the live DEK under the passphrase and
 * drop the plain on-device copy. Needs the currently-open DEK.
 */
export async function setPassphrase(
  dek: CryptoKey,
  passphrase: string,
): Promise<void> {
  const salt = newSalt();
  const kek = await deriveKey(passphrase, salt);
  const wrapped = await wrapDataKey(dek, kek);
  await idbPut(META_STORE, SALT_KEY, salt);
  await idbPut(META_STORE, WRAPPED_DEK, wrapped);
  await idbPut(META_STORE, KEY_MODE, "passphrase");
  await idbDelete(META_STORE, DEK_KEY);
}

/** Remove passphrase protection: store the DEK back on the device. */
export async function removePassphrase(dek: CryptoKey): Promise<void> {
  await idbPut(META_STORE, DEK_KEY, dek);
  await idbPut(META_STORE, KEY_MODE, "device");
  await idbDelete(META_STORE, SALT_KEY);
  await idbDelete(META_STORE, WRAPPED_DEK);
  await idbDelete(META_STORE, SESSION_KEY);
  await idbDelete(META_STORE, AUTOLOCK_KEY);
}

/** Full wipe: delete all data and key material (spec §12). */
export async function wipeVault(): Promise<void> {
  await deleteDatabase();
}
