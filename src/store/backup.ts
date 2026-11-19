import {
  deriveKey,
  encryptJSON,
  fromBase64,
  newSalt,
  decryptJSON,
  type Sealed,
  toBase64,
} from "./crypto";
import type { SelfprintStore } from "./store";
import { SETTINGS_KEYS } from "./index";

/**
 * Encrypted backup (spec §8) - everything in one file, locked with a passphrase
 * the user supplies at export time. Independent of the device key: we decrypt
 * via the open store, then re-encrypt the plaintext under a fresh passphrase so
 * the file is portable. Deterministic code, no model involvement.
 */
interface BackupData {
  version: 1;
  answers: unknown[];
  claims: unknown[];
  contradictions: unknown[];
  tests: unknown[];
  mirror: unknown[];
  settings: Record<string, unknown>;
}

interface BackupFile {
  app: "selfprint";
  v: 1;
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64
}

async function gather(store: SelfprintStore): Promise<BackupData> {
  const settings: Record<string, unknown> = {};
  for (const key of Object.values(SETTINGS_KEYS)) {
    const v = await store.settings.get(key);
    if (v !== undefined) settings[key] = v;
  }
  return {
    version: 1,
    answers: await store.answers.all(),
    claims: await store.claims.all(),
    contradictions: await store.contradictions.all(),
    tests: await store.tests.all(),
    mirror: await store.mirror.all(),
    settings,
  };
}

/** Produce the encrypted backup file contents (JSON string) to download. */
export async function exportBackup(
  store: SelfprintStore,
  passphrase: string,
): Promise<string> {
  const data = await gather(store);
  const salt = newSalt();
  const key = await deriveKey(passphrase, salt);
  const sealed = await encryptJSON(key, data);
  const file: BackupFile = {
    app: "selfprint",
    v: 1,
    salt: toBase64(salt),
    iv: toBase64(sealed.iv),
    ct: toBase64(sealed.ct),
  };
  return JSON.stringify(file, null, 2);
}

/** Decrypt a backup file (used by a future import flow / verification). */
export async function readBackup(
  fileContents: string,
  passphrase: string,
): Promise<BackupData> {
  const file = JSON.parse(fileContents) as BackupFile;
  const key = await deriveKey(passphrase, fromBase64(file.salt));
  const sealed: Sealed = {
    iv: fromBase64(file.iv),
    ct: fromBase64(file.ct),
  };
  return decryptJSON<BackupData>(key, sealed);
}
