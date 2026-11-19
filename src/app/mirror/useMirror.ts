import { useCallback, useEffect, useState } from "react";
import type { MirrorResponse } from "@/types/model";
import { SETTINGS_KEYS } from "@/store";
import { useStore } from "@/app/vault/VaultContext";

export function useMirror() {
  const store = useStore();
  const [self, setSelf] = useState<Record<string, number> | null>(null);
  const [responses, setResponses] = useState<MirrorResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [s, r] = await Promise.all([
      store.settings.get<Record<string, number>>(SETTINGS_KEYS.mirrorSelf),
      store.mirror.all(),
    ]);
    setSelf(s ?? null);
    setResponses(r);
    setLoading(false);
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveSelf = useCallback(
    async (scores: Record<string, number>) => {
      await store.settings.set(SETTINGS_KEYS.mirrorSelf, scores);
      setSelf(scores);
    },
    [store],
  );

  const addResponse = useCallback(
    async (resp: MirrorResponse) => {
      await store.mirror.put(resp);
      await reload();
    },
    [store, reload],
  );

  const reveal = useCallback(
    async (resp: MirrorResponse) => {
      await store.mirror.put({ ...resp, shared: true });
      await reload();
    },
    [store, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await store.mirror.delete(id);
      await reload();
    },
    [store, reload],
  );

  return { self, responses, loading, saveSelf, addResponse, reveal, remove };
}
