import { useSyncExternalStore } from "react";
import { getEntries, getVersion, subscribe } from "./recorder";

function fmtBytes(b: number | null): string {
  if (b === null) return "-";
  if (b < 1024) return `${b} B`;
  return `${(b / 1024).toFixed(1)} KB`;
}

/** Lists every outbound request made this session (spec §15.2). */
export function NetworkPanel() {
  useSyncExternalStore(subscribe, getVersion);
  const entries = getEntries();

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-muted max-w-[56ch]">
        Every outbound request this browser tab has made since it loaded, so you
        can see exactly where your answers go. Nothing here is persisted.
      </p>
      {entries.length === 0 ? (
        <p className="m-0 text-sm text-muted">
          No outbound requests recorded.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left">
                {["Time", "Method", "Host", "Size"].map((h) => (
                  <th
                    key={h}
                    className="label-mono font-normal py-1.5 pr-4 border-b border-sand-300"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-sand-200">
                  <td className="py-1.5 pr-4 font-mono text-xs text-muted whitespace-nowrap">
                    {new Date(e.time).toLocaleTimeString()}
                  </td>
                  <td className="py-1.5 pr-4 font-mono text-xs">{e.method}</td>
                  <td className="py-1.5 pr-4 break-all">
                    {e.host}
                    {e.error && (
                      <span className="text-accent"> · {e.error}</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-4 font-mono text-xs text-muted whitespace-nowrap">
                    {fmtBytes(e.bytes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
