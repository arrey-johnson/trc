"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RoutineBuilder,
  type RoutineItemDraft,
} from "@/components/RoutineBuilder";
import { Button, Card, PageShell } from "@/components/ui";
import { ROUTINE_LABELS } from "@/lib/constants";
import { friendlyDbError } from "@/lib/db-errors";
import { syncRoutineItems } from "@/lib/routines/sync-items";
import { createClient } from "@/lib/supabase/client";
import type { RoutineType } from "@/lib/types";

const TABS: RoutineType[] = ["morning", "evening"];

export function RoutineEditor() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<RoutineType>("morning");
  const [morningItems, setMorningItems] = useState<RoutineItemDraft[]>([]);
  const [eveningItems, setEveningItems] = useState<RoutineItemDraft[]>([]);
  const [routineIds, setRoutineIds] = useState<
    Record<RoutineType, string | null>
  >({
    morning: null,
    evening: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<RoutineType, boolean>>({
    morning: false,
    evening: false,
  });

  const loadRoutines = useCallback(async () => {
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
      setError(friendlyDbError(profileError.message, profileError.code));
      setLoading(false);
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
      setError(friendlyDbError(routinesError.message, routinesError.code));
      setLoading(false);
      return;
    }

    const ids: Record<RoutineType, string | null> = {
      morning: null,
      evening: null,
    };

    for (const routine of routines ?? []) {
      if (routine.type === "morning") {
        ids.morning = routine.id;
      } else if (routine.type === "evening") {
        ids.evening = routine.id;
      }
    }

    setRoutineIds(ids);

    for (const type of TABS) {
      const routineId = ids[type];
      if (!routineId) continue;

      const { data: items, error: itemsError } = await supabase
        .from("routine_items")
        .select("id, label")
        .eq("routine_id", routineId)
        .eq("is_active", true)
        .order("sort_order");

      if (itemsError) {
        setError(friendlyDbError(itemsError.message, itemsError.code));
        setLoading(false);
        return;
      }

      const drafts = (items ?? []).map((item) => ({
        id: item.id,
        label: item.label,
      }));

      if (type === "morning") {
        setMorningItems(drafts);
      } else {
        setEveningItems(drafts);
      }
    }

    setDirty({ morning: false, evening: false });
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  async function handleSave() {
    const routineId = routineIds[tab];
    if (!routineId) {
      setError("Routine not found. Complete onboarding first.");
      return;
    }

    const items = tab === "morning" ? morningItems : eveningItems;

    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await syncRoutineItems(supabase, routineId, items);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDirty((current) => ({ ...current, [tab]: false }));
    setMessage(`${ROUTINE_LABELS[tab]} saved.`);
    router.refresh();
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
            className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
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
          <p className="text-sm text-[var(--muted)]">Loading your habits…</p>
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
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {message}
              </p>
            )}

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="w-full"
            >
              {saving
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
