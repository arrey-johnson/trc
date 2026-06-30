"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  RoutineBuilder,
  type RoutineItemDraft,
} from "@/components/RoutineBuilder";
import { Button, Card, PageShell } from "@/components/ui";
import { ROUTINE_LABELS } from "@/lib/constants";
import { friendlyDbError } from "@/lib/db-errors";
import type { RoutineEditorData } from "@/lib/routines/types";
import { syncRoutineItems } from "@/lib/routines/sync-items";
import { createClient } from "@/lib/supabase/client";
import type { RoutineType } from "@/lib/types";

const TABS: RoutineType[] = ["morning", "evening"];

export function RoutineEditor({
  initialTab = "morning",
  initialData,
}: {
  initialTab?: RoutineType;
  initialData?: RoutineEditorData;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<RoutineType>(initialTab);
  const [morningItems, setMorningItems] = useState<RoutineItemDraft[]>(
    initialData?.morningItems ?? []
  );
  const [eveningItems, setEveningItems] = useState<RoutineItemDraft[]>(
    initialData?.eveningItems ?? []
  );
  const [routineIds, setRoutineIds] = useState<
    Record<RoutineType, string | null>
  >(
    initialData?.routineIds ?? {
      morning: null,
      evening: null,
    }
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<RoutineType, boolean>>({
    morning: false,
    evening: false,
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialData) return;

    let cancelled = false;

    async function loadRoutines() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        if (!cancelled) {
          setError(friendlyDbError(profileError.message, profileError.code));
          setLoading(false);
        }
        return;
      }

      if (!profile?.onboarding_complete) {
        router.replace("/onboarding");
        return;
      }

      const { data: routines, error: routinesError } = await supabase
        .from("routines")
        .select("id, type")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (routinesError) {
        if (!cancelled) {
          setError(friendlyDbError(routinesError.message, routinesError.code));
          setLoading(false);
        }
        return;
      }

      const ids: Record<RoutineType, string | null> = {
        morning: null,
        evening: null,
      };

      for (const routine of routines ?? []) {
        if (routine.type === "morning") ids.morning = routine.id;
        else if (routine.type === "evening") ids.evening = routine.id;
      }

      if (!cancelled) setRoutineIds(ids);

      const results = await Promise.all(
        TABS.map(async (type) => {
          const routineId = ids[type];
          if (!routineId) return { type, drafts: [] as RoutineItemDraft[] };

          const { data: items, error: itemsError } = await supabase
            .from("routine_items")
            .select("id, label")
            .eq("routine_id", routineId)
            .eq("is_active", true)
            .order("sort_order");

          if (itemsError) throw itemsError;

          return {
            type,
            drafts: (items ?? []).map((item) => ({
              id: item.id,
              label: item.label,
            })),
          };
        })
      );

      if (cancelled) return;

      for (const { type, drafts } of results) {
        if (type === "morning") setMorningItems(drafts);
        else setEveningItems(drafts);
      }

      setDirty({ morning: false, evening: false });
      setLoading(false);
    }

    loadRoutines().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Failed to load routines.");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initialData, supabase, router]);

  function handleSave() {
    const routineId = routineIds[tab];
    if (!routineId) {
      setError("Routine not found. Complete onboarding first.");
      return;
    }

    const items = tab === "morning" ? morningItems : eveningItems;

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await syncRoutineItems(supabase, routineId, items);

      if (result.error) {
        setError(result.error);
        return;
      }

      setDirty((current) => ({ ...current, [tab]: false }));
      setMessage(`${ROUTINE_LABELS[tab]} saved.`);
    });
  }

  function handleItemsChange(items: RoutineItemDraft[]) {
    if (tab === "morning") {
      setMorningItems(items);
      setDirty((current) => ({ ...current, morning: true }));
    } else {
      setEveningItems(items);
      setDirty((current) => ({ ...current, evening: true }));
    }
    setMessage(null);
  }

  const currentItems = tab === "morning" ? morningItems : eveningItems;
  const hasUnsavedChanges = dirty[tab];

  return (
    <PageShell
      title="My routines"
      subtitle="Add, remove, or drag to reorder your daily habits"
    >
      <div className="mb-4 flex gap-2 rounded-2xl bg-[var(--elevated)] p-1">
        {TABS.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setTab(type);
              setError(null);
              setMessage(null);
            }}
            className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
              tab === type
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {ROUTINE_LABELS[type]}
            {dirty[type] ? " •" : ""}
          </button>
        ))}
      </div>

      <Card className="space-y-4 p-4">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-xl bg-[var(--border)]"
              />
            ))}
          </div>
        ) : (
          <>
            <RoutineBuilder
              title={ROUTINE_LABELS[tab]}
              items={currentItems}
              onChange={handleItemsChange}
              fieldIdPrefix={tab}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && (
              <p className="text-sm text-brand-subtle-fg dark:text-brand-muted">
                {message}
              </p>
            )}

            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending || !hasUnsavedChanges}
              className="w-full"
            >
              {isPending
                ? "Saving…"
                : hasUnsavedChanges
                  ? `Save ${tab} routine`
                  : "No changes to save"}
            </Button>
          </>
        )}
      </Card>
    </PageShell>
  );
}
