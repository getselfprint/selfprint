import { type Sealed, decryptJSON, encryptJSON } from "./crypto";
import {
  ENTITY_STORES,
  type EntityStore,
  idbDelete,
  idbGet,
  idbGetAll,
  idbPut,
} from "./db";

/** CRUD over one encrypted object store, for records that carry an `id`. */
export interface Repo<T extends { id: string }> {
  get(id: string): Promise<T | undefined>;
  all(): Promise<T[]>;
  put(item: T): Promise<void>;
  delete(id: string): Promise<void>;
}

/** Arbitrary keyed encrypted settings (provider config, name list, …). */
export interface SettingsStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

class EncryptedRepo<T extends { id: string }> implements Repo<T> {
  constructor(
    private readonly key: CryptoKey,
    private readonly store: EntityStore,
  ) {}

  async get(id: string): Promise<T | undefined> {
    const sealed = await idbGet<Sealed>(this.store, id);
    return sealed ? decryptJSON<T>(this.key, sealed) : undefined;
  }

  async all(): Promise<T[]> {
    const sealed = await idbGetAll<Sealed>(this.store);
    return Promise.all(sealed.map((s) => decryptJSON<T>(this.key, s)));
  }

  async put(item: T): Promise<void> {
    await idbPut(this.store, item.id, await encryptJSON(this.key, item));
  }

  async delete(id: string): Promise<void> {
    await idbDelete(this.store, id);
  }
}

class EncryptedSettings implements SettingsStore {
  constructor(private readonly key: CryptoKey) {}

  async get<T>(key: string): Promise<T | undefined> {
    const sealed = await idbGet<Sealed>("settings", key);
    return sealed ? decryptJSON<T>(this.key, sealed) : undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    await idbPut("settings", key, await encryptJSON(this.key, value));
  }

  async delete(key: string): Promise<void> {
    await idbDelete("settings", key);
  }
}

export interface SelfprintStore {
  answers: Repo<import("@/types/model").Answer>;
  claims: Repo<import("@/types/model").Claim>;
  contradictions: Repo<import("@/types/model").Contradiction>;
  tests: Repo<import("@/types/model").TestRun>;
  mirror: Repo<import("@/types/model").MirrorResponse>;
  settings: SettingsStore;
}

/** Assemble the encrypted store around an unlocked key. */
export function buildStore(key: CryptoKey): SelfprintStore {
  const repo = <T extends { id: string }>(s: EntityStore) =>
    new EncryptedRepo<T>(key, s);
  // Touch ENTITY_STORES so the store set stays the single source of truth.
  void ENTITY_STORES;
  return {
    answers: repo("answers"),
    claims: repo("claims"),
    contradictions: repo("contradictions"),
    tests: repo("tests"),
    mirror: repo("mirror"),
    settings: new EncryptedSettings(key),
  };
}
