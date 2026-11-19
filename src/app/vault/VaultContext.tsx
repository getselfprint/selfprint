import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  clearIfLegacy,
  forgetKey,
  getAutoLock,
  getKeyMode,
  initDeviceVault,
  isInitialized,
  openVault,
  rememberKey,
  removePassphrase as removePassphraseVault,
  type SelfprintStore,
  setAutoLockPref,
  setPassphrase as setPassphraseVault,
  unlockVault,
  wipeVault,
} from "@/store";

export type VaultStatus = "loading" | "locked" | "unlocked";

interface VaultValue {
  status: VaultStatus;
  store: SelfprintStore | null;
  /** Whether the user has opted in to passphrase protection. */
  hasPassphrase: boolean;
  /** Passphrase mode only: require the passphrase on every load. */
  autoLock: boolean;
  setAutoLock(on: boolean): Promise<void>;
  /** Unlock a passphrase-protected vault. Throws WrongPassphraseError. */
  unlock(passphrase: string): Promise<void>;
  /** Opt in to passphrase protection (from the default device-key mode). */
  setPassphrase(passphrase: string): Promise<void>;
  /** Drop passphrase protection, back to the on-device key. */
  removePassphrase(): Promise<void>;
  /** Lock now: forget the remembered key and return to the unlock screen. */
  lock(): Promise<void>;
  /** Delete everything, then start a fresh empty vault (spec §12). */
  wipe(): Promise<void>;
}

const VaultCtx = createContext<VaultValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [hasPassphrase, setHasPassphrase] = useState(false);
  const [autoLock, setAutoLockState] = useState(false);
  const storeRef = useRef<SelfprintStore | null>(null);
  const dekRef = useRef<CryptoKey | null>(null);
  const started = useRef(false);

  const adopt = useCallback((store: SelfprintStore, dek: CryptoKey) => {
    storeRef.current = store;
    dekRef.current = dek;
  }, []);

  useEffect(() => {
    // Run once. StrictMode double-invokes effects; a second initDeviceVault
    // would race the first and encrypt data under a key we then overwrite.
    if (started.current) return;
    started.current = true;
    (async () => {
      // Discard any vault from the superseded passphrase-required model.
      await clearIfLegacy();
      // First run: no passphrase prompt - start an on-device vault and go.
      if (!(await isInitialized())) {
        const { store, dek } = await initDeviceVault();
        adopt(store, dek);
        setHasPassphrase(false);
        setStatus("unlocked");
        return;
      }
      setHasPassphrase((await getKeyMode()) === "passphrase");
      setAutoLockState(await getAutoLock());
      const opened = await openVault();
      if (opened) {
        adopt(opened.store, opened.dek);
        setStatus("unlocked");
      } else {
        setStatus("locked");
      }
    })();
  }, [adopt]);

  const unlock = useCallback(
    async (passphrase: string) => {
      const { store, dek } = await unlockVault(passphrase);
      adopt(store, dek);
      if (!(await getAutoLock())) await rememberKey(dek);
      setStatus("unlocked");
    },
    [adopt],
  );

  const setPassphrase = useCallback(async (passphrase: string) => {
    if (!dekRef.current) return;
    await setPassphraseVault(dekRef.current, passphrase);
    // Opting in means you want protection: require it on the next load.
    await setAutoLockPref(true);
    await forgetKey();
    setHasPassphrase(true);
    setAutoLockState(true);
  }, []);

  const removePassphrase = useCallback(async () => {
    if (!dekRef.current) return;
    await removePassphraseVault(dekRef.current);
    setHasPassphrase(false);
    setAutoLockState(false);
  }, []);

  const lock = useCallback(async () => {
    await forgetKey();
    storeRef.current = null;
    dekRef.current = null;
    setStatus("locked");
  }, []);

  const setAutoLock = useCallback(async (on: boolean) => {
    await setAutoLockPref(on);
    if (on) await forgetKey();
    else if (dekRef.current) await rememberKey(dekRef.current);
    setAutoLockState(on);
  }, []);

  const wipe = useCallback(async () => {
    await wipeVault();
    const { store, dek } = await initDeviceVault();
    adopt(store, dek);
    setHasPassphrase(false);
    setAutoLockState(false);
    setStatus("unlocked");
  }, [adopt]);

  return (
    <VaultCtx.Provider
      value={{
        status,
        store: storeRef.current,
        hasPassphrase,
        autoLock,
        setAutoLock,
        unlock,
        setPassphrase,
        removePassphrase,
        lock,
        wipe,
      }}
    >
      {children}
    </VaultCtx.Provider>
  );
}

export function useVault(): VaultValue {
  const v = useContext(VaultCtx);
  if (!v) throw new Error("useVault must be used inside <VaultProvider>.");
  return v;
}

/** Convenience for screens that only run while unlocked. */
export function useStore(): SelfprintStore {
  const { store } = useVault();
  if (!store) throw new Error("The vault is locked.");
  return store;
}
