import { type ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChooseHow } from "@/app/config/ChooseHow";
import { useConfig } from "@/app/config/ConfigContext";
import { useStore, useVault } from "@/app/vault/VaultContext";
import { seedDemoPersonality } from "@/app/dev/seedDemo";
import { NetworkPanel } from "@/app/net/NetworkPanel";
import { DOTS } from "./shared";

const NAV = [
  { id: "model", label: "Model" },
  { id: "privacy", label: "Privacy and network" },
  { id: "security", label: "Security" },
  { id: "data", label: "Your data" },
];

/** Settings: a left sub-nav, the model picker, then privacy/security/data rows. */
export function SettingsScreen() {
  const { nameList, saveNameList } = useConfig();
  const {
    lock,
    wipe,
    autoLock,
    setAutoLock,
    hasPassphrase,
    setPassphrase,
    removePassphrase,
  } = useVault();

  const store = useStore();
  const navigate = useNavigate();
  const [active, setActive] = useState("model");
  const [showNet, setShowNet] = useState(false);
  const [showSec, setShowSec] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [seeding, setSeeding] = useState(false);

  function go(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main
      className={`flex-1 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
    >
      <div className="w-full flex flex-wrap gap-x-12 gap-y-8">
        <nav className="flex-[0_0_220px] flex flex-col gap-1 self-start">
          <span className="label-mono mb-2">Settings</span>
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => go(n.id)}
              className={`text-left px-3 py-2 rounded-card text-sm ${
                active === n.id
                  ? "bg-sand-100 text-ink font-medium"
                  : "text-muted hover:text-ink"
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-[320px] flex flex-col gap-12">
          <section id="model" className="scroll-mt-6">
            <ChooseHow heading="How the interview runs" />
          </section>

          <section
            id="privacy"
            className="scroll-mt-6 pt-8 border-t border-sand-300 flex flex-col gap-4"
          >
            <Row
              title="Privacy and network"
              desc="Every request this app sends, with its destination and size."
            >
              <Secondary onClick={() => setShowNet((v) => !v)}>
                {showNet ? "Hide" : "View network activity"}
              </Secondary>
            </Row>
            {showNet && <NetworkPanel />}

            <div className="pt-2 flex flex-col gap-2">
              <span className="label-mono">Names to redact from exports</span>
              <p className="m-0 text-sm text-muted max-w-[60ch]">
                Exports replace these names with roles ("a close friend") by
                exact match. One per line. The list stays on this device.
              </p>
              <RedactNames nameList={nameList} saveNameList={saveNameList} />
            </div>
          </section>

          <section
            id="security"
            className="scroll-mt-6 pt-8 border-t border-sand-300 flex flex-col gap-4"
          >
            <Row
              title="Security"
              desc="Passphrase and automatic lock. A lost passphrase cannot be recovered."
            >
              <Secondary onClick={() => setShowSec((v) => !v)}>
                {showSec
                  ? "Hide"
                  : hasPassphrase
                    ? "Manage passphrase"
                    : "Add a passphrase"}
              </Secondary>
            </Row>
            {showSec &&
              (hasPassphrase ? (
                <ManagePassphrase
                  autoLock={autoLock}
                  setAutoLock={setAutoLock}
                  lock={lock}
                  removePassphrase={removePassphrase}
                />
              ) : (
                <AddPassphrase onAdd={setPassphrase} />
              ))}
          </section>

          <section
            id="data"
            className="scroll-mt-6 pt-8 border-t border-sand-300 flex flex-col gap-4"
          >
            <Row
              title="Your data"
              desc="Back up everything to one encrypted file, or erase it from this device."
            >
              <Link
                to="/app/export"
                className="inline-flex items-center min-h-[40px] px-4 rounded-pill border border-sand-300 bg-ground text-ink no-underline text-sm font-medium hover:bg-sand-100"
              >
                Back up
              </Link>
              {!confirmWipe ? (
                <button
                  type="button"
                  onClick={() => setConfirmWipe(true)}
                  className="inline-flex items-center min-h-[40px] px-4 rounded-pill border border-accent text-accent text-sm font-medium hover:bg-sand-100"
                >
                  Delete everything
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => wipe()}
                    className="inline-flex items-center min-h-[40px] px-4 rounded-pill bg-accent text-ground text-sm font-medium"
                  >
                    Yes, delete all data
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmWipe(false)}
                    className="inline-flex items-center min-h-[40px] px-4 rounded-pill text-sm text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </>
              )}
            </Row>
            {confirmWipe && (
              <span className="text-sm text-muted">
                This permanently deletes every answer, claim, and setting on this
                device, and starts a fresh empty profile. It cannot be undone.
              </span>
            )}
          </section>

          {import.meta.env.DEV && (
            <section className="scroll-mt-6 pt-8 border-t border-dashed border-sand-300 flex flex-col gap-4">
              <Row
                title="Developer"
                desc="Dev builds only. Fills every layer with a demo personality so you can preview the finished shape. Your Facts are kept."
              >
                <button
                  type="button"
                  disabled={seeding}
                  onClick={async () => {
                    setSeeding(true);
                    await seedDemoPersonality(store);
                    navigate("/app/profile");
                  }}
                  className="inline-flex items-center min-h-[40px] px-4 rounded-pill bg-ink text-ground text-sm font-medium disabled:opacity-40"
                >
                  {seeding ? "Filling…" : "Seed demo personality"}
                </button>
              </Row>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5 min-w-0">
        <h2 className="m-0 text-xl font-medium">{title}</h2>
        <p className="m-0 text-sm text-muted max-w-[60ch]">{desc}</p>
      </div>
      <div className="flex flex-wrap gap-3 shrink-0">{children}</div>
    </div>
  );
}

function Secondary({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center min-h-[40px] px-4 rounded-pill border border-sand-300 bg-ground text-ink text-sm font-medium hover:bg-sand-100"
    >
      {children}
    </button>
  );
}

function RedactNames({
  nameList,
  saveNameList,
}: {
  nameList: string[];
  saveNameList: (names: string[]) => Promise<void>;
}) {
  const [names, setNames] = useState(nameList.join("\n"));
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={names}
        onChange={(e) => {
          setNames(e.target.value);
          setSaved(false);
        }}
        rows={4}
        className="w-full border border-sand-300 rounded-[10px] px-3.5 py-2.5 bg-ground text-ink text-base font-mono"
        placeholder="Alex&#10;Mum"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={async () => {
            await saveNameList(
              names
                .split("\n")
                .map((n) => n.trim())
                .filter(Boolean),
            );
            setSaved(true);
          }}
          className="self-start inline-flex items-center min-h-[40px] px-4 rounded-pill bg-ink text-ground text-sm font-medium"
        >
          Save names
        </button>
        {saved && <span className="text-sm text-accent">Saved.</span>}
      </div>
    </div>
  );
}

const PW_FIELD =
  "w-full border border-sand-300 rounded-[10px] px-3.5 py-2.5 bg-ground text-ink text-base";

/** Opt in to passphrase protection (shown when the vault has no passphrase). */
function AddPassphrase({ onAdd }: { onAdd: (pass: string) => Promise<void> }) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== pass;
  const canAdd = pass.length > 0 && confirm === pass && !busy;

  return (
    <div className="flex flex-col gap-3 max-w-[520px]">
      <p className="m-0 text-sm text-muted">
        Selfprint is open on this device - anyone who can use it can open the
        app. Adding a passphrase encrypts everything behind a secret only you
        know, and asks for it when you open Selfprint. There is no account and no
        recovery: if you forget it, your data is gone.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono">Passphrase</span>
        <input
          type="password"
          autoComplete="new-password"
          className={PW_FIELD}
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono">Confirm passphrase</span>
        <input
          type="password"
          autoComplete="new-password"
          className={PW_FIELD}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>
      {mismatch && (
        <span className="text-sm text-muted">The two entries don't match.</span>
      )}
      <button
        type="button"
        disabled={!canAdd}
        onClick={async () => {
          setBusy(true);
          await onAdd(pass);
          setPass("");
          setConfirm("");
          setBusy(false);
        }}
        className="self-start inline-flex items-center min-h-[40px] px-4 rounded-pill bg-ink text-ground text-sm font-medium disabled:opacity-40"
      >
        {busy ? "Adding…" : "Add a passphrase"}
      </button>
    </div>
  );
}

/** Manage an existing passphrase: auto-lock, lock now, remove. */
function ManagePassphrase({
  autoLock,
  setAutoLock,
  lock,
  removePassphrase,
}: {
  autoLock: boolean;
  setAutoLock: (on: boolean) => Promise<void>;
  lock: () => Promise<void>;
  removePassphrase: () => Promise<void>;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  return (
    <div className="flex flex-col gap-3 max-w-[560px]">
      <p className="m-0 text-sm text-muted">
        Protected. Selfprint asks for your passphrase to open.
      </p>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={autoLock}
          onChange={(e) => void setAutoLock(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[var(--accent)]"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            Ask for my passphrase every time
          </span>
          <span className="text-sm text-muted">
            On by default once you add a passphrase. Turn it off to stay unlocked
            on this device between visits - more convenient, but then the
            passphrase no longer protects the data at rest here.
          </span>
        </span>
      </label>
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          onClick={lock}
          className="inline-flex items-center min-h-[40px] px-4 rounded-pill border border-sand-300 bg-ground text-ink text-sm font-medium hover:bg-sand-100"
        >
          Lock now
        </button>
        {!confirmRemove ? (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            className="inline-flex items-center min-h-[40px] px-4 rounded-pill text-muted text-sm hover:text-ink"
          >
            Remove passphrase
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void removePassphrase()}
              className="inline-flex items-center min-h-[40px] px-4 rounded-pill border border-accent text-accent text-sm font-medium hover:bg-sand-100"
            >
              Remove - leave it open
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              className="inline-flex items-center min-h-[40px] px-4 rounded-pill text-sm text-muted hover:text-ink"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
