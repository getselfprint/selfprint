/**
 * Encrypted local store (spec §10). Local-only, IndexedDB + Web Crypto
 * (AES-GCM, PBKDF2-derived key). The passphrase is never stored; the key lives
 * in memory only while unlocked. This module is the only place that touches
 * persistence - screens go through the VaultContext, never IndexedDB directly.
 */
export type { Repo, SelfprintStore, SettingsStore } from "./store";
export {
  clearIfLegacy,
  forgetKey,
  getAutoLock,
  getKeyMode,
  initDeviceVault,
  isInitialized,
  type KeyMode,
  type Opened,
  openVault,
  rememberKey,
  removePassphrase,
  setAutoLockPref,
  setPassphrase,
  unlockVault,
  wipeVault,
  WrongPassphraseError,
} from "./vault";
export { exportBackup, readBackup } from "./backup";

/** Settings keys used across the app (keeps string keys in one place). */
export const SETTINGS_KEYS = {
  providerConfig: "providerConfig",
  /** Names the user wants redacted from exports (spec §8, §12). */
  nameList: "nameList",
  /** Structured Facts form data (layer 01). */
  facts: "facts",
  /** Whether the first-run Facts step has been seen (saved or skipped). */
  factsStepDone: "factsStepDone",
  /** The user's own self-scores for the Mirror dimensions (0-100). */
  mirrorSelf: "mirrorSelf",
  /** Autosaved in-progress interview session, so it survives navigation. */
  interviewDraft: "interviewDraft",
  /** True while the user is browsing the pre-seeded demo persona. */
  demoMode: "demoMode",
} as const;
