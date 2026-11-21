import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import {
  buildPersonaMarkdown,
  buildProfileFiles,
  countExportable,
  type ExportOptions,
} from "@/export";
import { exportBackup, SETTINGS_KEYS } from "@/store";
import { useConfig } from "@/app/config/ConfigContext";
import { useProfile } from "@/app/data/hooks";
import { DOTS } from "./shared";

type Format = "persona" | "folder" | "backup";

function download(filename: string, data: BlobPart, mime: string) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * The export UI itself (format cards + preview + encrypted backup), with no page
 * chrome - rendered both as the final section of the Profile and at the
 * standalone /app/export route (reached from Settings "Back up").
 */
export function ExportPanel() {
  const { store, claims, answers } = useProfile();
  const { nameList } = useConfig();
  const [format, setFormat] = useState<Format>("persona");
  const [name, setName] = useState("");
  const [options, setOptions] = useState<ExportOptions>({
    redactNames: true,
    includeInferred: false,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    store.settings
      .get<Record<string, string>>(SETTINGS_KEYS.facts)
      .then((facts) => {
        const n = facts?.name?.trim();
        if (n) setName((cur) => cur || n);
      });
  }, [store]);

  const personaMd = useMemo(
    () => buildPersonaMarkdown({ name, claims, nameList, options }),
    [name, claims, nameList, options],
  );
  const folderFiles = useMemo(
    () => buildProfileFiles({ name, claims, answers, nameList, options }),
    [name, claims, answers, nameList, options],
  );
  const count = countExportable(claims, options);
  const folderPreview = Object.entries(folderFiles)
    .map(([path, content]) => `=== ${path} ===\n${content}`)
    .join("\n\n");
  const previewText = format === "folder" ? folderPreview : personaMd;

  async function downloadZip() {
    const zip = new JSZip();
    for (const [path, content] of Object.entries(folderFiles)) {
      zip.file(path, content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    download("selfprint-profile.zip", blob, "application/zip");
  }

  return (
    <div className="w-full flex flex-wrap gap-x-12 gap-y-8 items-start">
        <section className="flex-[1_1_320px] max-w-[440px] flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="label-mono">Export</span>
            <h1 className="m-0 font-heading text-[clamp(34px,4.4vw,52px)] tracking-[-0.02em] leading-[1.02]">
              Take your model with you.
            </h1>
            <p className="m-0 mt-1 text-[15px] text-muted max-w-[46ch] leading-[1.5]">
              Plain files you own. Nothing leaves this device unless you move it.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <FormatCard
              active={format === "persona"}
              onClick={() => setFormat("persona")}
              title="Persona prompt"
              note="One Markdown file that makes any AI answer as you."
            />
            <FormatCard
              active={format === "folder"}
              onClick={() => setFormat("folder")}
              title="Full profile folder"
              note="Six Markdown files, one per layer, with evidence and confidence."
            />
            <FormatCard
              active={format === "backup"}
              onClick={() => setFormat("backup")}
              title="Encrypted backup"
              note="Everything in one file, locked with your passphrase."
            />
          </div>

          {format !== "backup" && (
            <>
              <div className="flex flex-col divide-y divide-sand-200 border-t border-sand-200">
                <Switch
                  checked={options.redactNames}
                  onChange={(v) =>
                    setOptions((o) => ({ ...o, redactNames: v }))
                  }
                  label="Redact names of other people"
                />
                <Switch
                  checked={options.includeInferred}
                  onChange={(v) =>
                    setOptions((o) => ({ ...o, includeInferred: v }))
                  }
                  label="Include claims the model only inferred"
                />
              </div>
              <p className="m-0 text-xs text-muted">
                {count} confirmed claim{count === 1 ? "" : "s"} included.
              </p>
            </>
          )}
        </section>

        <section className="flex-[2_1_440px] min-w-[300px]">
          {format === "backup" ? (
            <BackupPanel onExport={(pass) => exportBackup(store, pass)} />
          ) : (
            <div className="rounded-panel border border-sand-300 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-3 bg-sand-100 border-b border-sand-300">
                <span className="font-mono text-sm text-muted">
                  {format === "persona" ? "persona.md" : "profile folder"} ·
                  preview
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(previewText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="inline-flex items-center min-h-[40px] px-4 rounded-pill border border-sand-300 bg-ground text-ink text-sm font-medium hover:bg-sand-50"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      format === "persona"
                        ? download("persona.md", personaMd, "text/markdown")
                        : void downloadZip()
                    }
                    disabled={count === 0}
                    className="inline-flex items-center min-h-[40px] px-4 rounded-pill bg-ink text-ground text-sm font-medium disabled:opacity-40"
                  >
                    {format === "persona" ? "Download .md" : "Download .zip"}
                  </button>
                </div>
              </div>
              <pre className="m-0 p-5 overflow-x-auto font-mono text-xs leading-[1.6] whitespace-pre-wrap bg-sand-50 max-h-[70vh]">
                {previewText}
              </pre>
            </div>
          )}
        </section>
    </div>
  );
}

/** Standalone export route (/app/export), reached from Settings "Back up". */
export function ExportScreen() {
  return (
    <main className={`flex-1 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}>
      <ExportPanel />
    </main>
  );
}

function FormatCard({
  title,
  note,
  active,
  onClick,
}: {
  title: string;
  note: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left flex items-center justify-between gap-3 rounded-card ${
        active
          ? "border-2 border-ink bg-sand-50 px-[19px] py-[15px]"
          : "border border-sand-300 hover:bg-sand-50 px-5 py-4"
      }`}
    >
      <span className="flex flex-col gap-1 min-w-0">
        <span className="font-heading text-lg font-medium">{title}</span>
        <span className="text-sm text-muted leading-[1.45]">{note}</span>
      </span>
      {active && (
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 py-3.5 text-left"
    >
      <span className="text-[15px]">{label}</span>
      <span
        className={`shrink-0 relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-ink" : "bg-sand-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-ground transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}

function BackupPanel({
  onExport,
}: {
  onExport: (passphrase: string) => Promise<string>;
}) {
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    const contents = await onExport(pass);
    const stamp = new Date().toISOString().slice(0, 10);
    download(
      `selfprint-backup-${stamp}.selfprint`,
      contents,
      "application/json",
    );
    setBusy(false);
    setPass("");
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-sand-50 border border-sand-300 rounded-panel max-w-[560px]">
      <span className="label-mono">Encrypted backup</span>
      <p className="m-0 text-sm text-muted max-w-[56ch] leading-[1.5]">
        The backup contains <strong>everything</strong> - all answers (including
        private ones), claims, settings, and your stored API key - encrypted
        with the passphrase you enter here. Without that passphrase the file
        cannot be opened, by anyone.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono">Backup passphrase</span>
        <input
          type="password"
          autoComplete="off"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="w-full border border-sand-300 rounded-[10px] px-3.5 py-2.5 bg-ground text-ink text-base"
          placeholder="Used to lock this file"
        />
      </label>
      <button
        type="button"
        onClick={go}
        disabled={pass.length < 8 || busy}
        className="self-start inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground text-sm font-medium disabled:opacity-40"
      >
        {busy ? "Encrypting…" : "Download encrypted backup"}
      </button>
      {pass.length > 0 && pass.length < 8 && (
        <span className="text-sm text-muted">Use at least 8 characters.</span>
      )}
    </div>
  );
}
