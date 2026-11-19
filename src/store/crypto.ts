/**
 * Encryption primitives (spec §10). AES-GCM with a key derived from the user's
 * passphrase via PBKDF2. Deterministic code, no model involvement.
 *
 * The passphrase is never stored. The derived key lives in memory only while
 * the vault is unlocked. Every record is encrypted with a fresh random IV.
 */

const PBKDF2_ITERATIONS = 310_000; // OWASP-recommended floor for PBKDF2-SHA256
const SALT_BYTES = 16;
const IV_BYTES = 12; // standard for AES-GCM

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

export function newSalt(): Uint8Array {
  return randomBytes(SALT_BYTES);
}

/** Derive a non-extractable AES-GCM key from a passphrase + salt. */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable
    ["encrypt", "decrypt"],
  );
}

/**
 * Generate a fresh random data key (DEK) that encrypts every record. It is
 * `extractable` so it can be wrapped under a passphrase later (opt-in) without
 * re-encrypting the data. Without a passphrase it just lives on the device.
 */
export async function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/** Wrap (encrypt) a data key's raw bytes under a passphrase-derived key. */
export async function wrapDataKey(
  dek: CryptoKey,
  kek: CryptoKey,
): Promise<Sealed> {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", dek));
  const iv = randomBytes(IV_BYTES);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    kek,
    raw as BufferSource,
  );
  return { iv, ct: new Uint8Array(ct) };
}

/**
 * Unwrap a data key. Throws (AES-GCM auth failure) on a wrong passphrase, which
 * callers translate to WrongPassphraseError. Returns an extractable key so the
 * passphrase can later be changed or removed.
 */
export async function unwrapDataKey(
  sealed: Sealed,
  kek: CryptoKey,
): Promise<CryptoKey> {
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: sealed.iv as BufferSource },
    kek,
    sealed.ct as BufferSource,
  );
  return crypto.subtle.importKey("raw", raw, "AES-GCM", true, [
    "encrypt",
    "decrypt",
  ]);
}

/** A stored ciphertext envelope. `iv` and `ct` are raw bytes. */
export interface Sealed {
  iv: Uint8Array;
  ct: Uint8Array;
}

export async function encryptJSON(
  key: CryptoKey,
  value: unknown,
): Promise<Sealed> {
  const iv = randomBytes(IV_BYTES);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(JSON.stringify(value)),
  );
  return { iv, ct: new Uint8Array(ct) };
}

export async function decryptJSON<T>(
  key: CryptoKey,
  sealed: Sealed,
): Promise<T> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: sealed.iv as BufferSource },
    key,
    sealed.ct as BufferSource,
  );
  return JSON.parse(dec.decode(pt)) as T;
}
