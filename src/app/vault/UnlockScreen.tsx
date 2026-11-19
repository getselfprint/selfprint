import { type FormEvent, useState } from "react";
import { WrongPassphraseError } from "@/store";
import { useVault } from "./VaultContext";
import { AuthShell, PassphraseField, SubmitButton } from "./AuthShell";

/** Shown when a vault exists but is locked. */
export function UnlockScreen() {
  const { unlock, wipe } = useVault();
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pass || busy) return;
    setBusy(true);
    setError(null);
    try {
      await unlock(pass);
    } catch (err) {
      setError(
        err instanceof WrongPassphraseError
          ? "That passphrase is incorrect."
          : "Could not unlock the vault.",
      );
      setBusy(false);
      setPass("");
    }
  }

  return (
    <AuthShell title="Unlock Selfprint">
      <p className="m-0 text-[15px] leading-[1.55] text-muted">
        Enter the passphrase you set on this device. Everything stays local.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="label-mono">Passphrase</span>
          <PassphraseField
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoFocus
          />
        </label>
        {error && <span className="text-sm text-accent">{error}</span>}
        <SubmitButton disabled={!pass || busy}>
          {busy ? "Unlocking…" : "Unlock"}
        </SubmitButton>
      </form>

      <div className="pt-3 border-t border-sand-300 flex flex-col gap-2">
        {!confirmWipe ? (
          <button
            type="button"
            onClick={() => setConfirmWipe(true)}
            className="text-sm text-muted underline text-left hover:text-ink"
          >
            Forgot your passphrase?
          </button>
        ) : (
          <>
            <span className="text-sm text-muted">
              Your data can't be recovered without the passphrase. You can
              erase everything and start over - this cannot be undone.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => wipe()}
                className="inline-flex items-center min-h-[40px] px-4 rounded-pill border border-accent text-accent text-sm font-medium hover:bg-sand-100"
              >
                Erase everything
              </button>
              <button
                type="button"
                onClick={() => setConfirmWipe(false)}
                className="inline-flex items-center min-h-[40px] px-4 rounded-pill text-sm text-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </AuthShell>
  );
}
