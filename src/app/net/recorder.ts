/**
 * Network activity recorder (spec §15.2). Wraps `fetch` once at startup and
 * logs every outbound request made this session - time, host, method, size -
 * so the Network panel can show a technical reader exactly what left the
 * device. Session-only: nothing is persisted. With guided mode (option A) the
 * log stays empty after the page loads.
 */
export interface NetEntry {
  id: number;
  time: string; // ISO
  method: string;
  host: string;
  url: string;
  bytes: number | null;
  ok: boolean | null;
  error?: string;
}

const entries: NetEntry[] = [];
const listeners = new Set<() => void>();
let counter = 0;
let version = 0;
let installed = false;

function emit() {
  version++;
  for (const l of listeners) l();
}

export function getEntries(): readonly NetEntry[] {
  return entries;
}

/** Monotonic version for useSyncExternalStore (entries is mutated in place). */
export function getVersion(): number {
  return version;
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function installRecorder(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = (
      init?.method ??
      (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    let host = url;
    try {
      host = new URL(url, window.location.href).host;
    } catch {
      /* keep raw */
    }

    const entry: NetEntry = {
      id: ++counter,
      time: new Date().toISOString(),
      method,
      host,
      url,
      bytes: null,
      ok: null,
    };
    entries.unshift(entry);
    emit();

    try {
      const res = await original(input, init);
      entry.ok = res.ok;
      const len = res.headers.get("content-length");
      entry.bytes = len ? Number(len) : null;
      emit();
      return res;
    } catch (err) {
      entry.ok = false;
      entry.error = err instanceof Error ? err.message : "network error";
      emit();
      throw err;
    }
  };
}
