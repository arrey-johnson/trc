"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  allItemsAnswered,
  allReasonsValid,
  CheckinItemRow,
} from "@/components/CheckinItemRow";
import { Button, ButtonLink, Card, PageShell } from "@/components/ui";
import { ROUTINE_LABELS } from "@/lib/constants";
import { getTodayInTimezone } from "@/lib/dates";
import { friendlyDbError } from "@/lib/db-errors";
import { deriveCheckinStatus } from "@/lib/streak";
import { createClient } from "@/lib/supabase/client";
import type { CheckinItemAnswer, RoutineType } from "@/lib/types";

interface CheckinPageProps {
  routineType: RoutineType;
}

export default function CheckinPage({ routineType }: CheckinPageProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<CheckinItemAnswer[]>([]);
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [today, setToday] = useState(() => getTodayInTimezone());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState<string | null>(null);

  const title = ROUTINE_LABELS[routineType];

  const loadRoutine = useCallback(async () => {
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
      .select("timezone, onboarding_complete")
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

    const timezone = profile.timezone ?? "Africa/Douala";
    const todayStr = getTodayInTimezone(timezone);
    setToday(todayStr);

    const { data: routine, error: routineError } = await supabase
      .from("routines")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", routineType)
      .eq("is_active", true)
      .maybeSingle();

    if (routineError) {
      setError(friendlyDbError(routineError.message, routineError.code));
      setLoading(false);
      return;
    }

    if (!routine) {
      setError("Routine not found. Complete onboarding first.");
      setLoading(false);
      return;
    }

    setRoutineId(routine.id);

    const { data: existing, error: existingError } = await supabase
      .from("checkins")
      .select("id")
      .eq("user_id", user.id)
      .eq("routine_id", routine.id)
      .eq("date", todayStr)
      .maybeSingle();

    if (existingError) {
      setError(friendlyDbError(existingError.message, existingError.code));
      setLoading(false);
      return;
    }

    if (existing) {
      setAlreadySubmitted(existing.id);
      setLoading(false);
      return;
    }

    const { data: routineItems, error: itemsError } = await supabase
      .from("routine_items")
      .select("id, label")
      .eq("routine_id", routine.id)
      .eq("is_active", true)
      .order("sort_order");

    if (itemsError) {
      setError(friendlyDbError(itemsError.message, itemsError.code));
      setLoading(false);
      return;
    }

    setItems(
      (routineItems ?? []).map((ri) => ({
        routineItemId: ri.id,
        label: ri.label,
        wasDone: null,
        reasonIfNotDone: "",
      }))
    );
    setLoading(false);
  }, [routineType, supabase, router]);

  useEffect(() => {
    loadRoutine();
  }, [loadRoutine]);

  function updateItem(
    routineItemId: string,
    patch: Partial<CheckinItemAnswer>
  ) {
    setItems((prev) =>
      prev.map((item) =>
        item.routineItemId === routineItemId ? { ...item, ...patch } : item
      )
    );
  }

  async function handleSubmit() {
    if (!routineId || !allItemsAnswered(items) || !allReasonsValid(items)) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expired.");
      setSubmitting(false);
      return;
    }

    const answers = items.map((i) => ({
      wasDone: i.wasDone === true,
      reason: i.reasonIfNotDone,
    }));
    const status = deriveCheckinStatus(answers);

    const { data: checkin, error: checkinError } = await supabase
      .from("checkins")
      .insert({
        user_id: user.id,
        routine_id: routineId,
        date: today,
        status,
      })
      .select("id")
      .single();

    if (checkinError || !checkin) {
      setError(friendlyDbError(checkinError?.message ?? "Failed to save check-in.", checkinError?.code));
      setSubmitting(false);
      return;
    }

    const { error: itemsError } = await supabase.from("checkin_items").insert(
      items.map((item) => ({
        checkin_id: checkin.id,
        routine_item_id: item.routineItemId,
        was_done: item.wasDone === true,
        reason_if_not_done:
          item.wasDone === false ? item.reasonIfNotDone.trim() : null,
      }))
    );

    if (itemsError) {
      setError(friendlyDbError(itemsError.message, itemsError.code));
      setSubmitting(false);
      return;
    }

    await supabase
      .from("reminder_log")
      .update({ was_actioned: true })
      .eq("user_id", user.id)
      .eq("date", today)
      .eq("routine_type", routineType);

    router.push(`/share/${checkin.id}`);
    router.refresh();
  }

  const canSubmit =
    allItemsAnswered(items) && allReasonsValid(items) && !submitting;

  if (loading) {
    return (
      <PageShell title={title} subtitle="Loading your routine...">
        <Card>
          <p className="text-stone-600">One moment...</p>
        </Card>
      </PageShell>
    );
  }

  if (alreadySubmitted) {
    return (
      <PageShell title={title} subtitle={`Already logged for ${today}`}>
        <Card className="space-y-4">
          <p className="text-stone-700">
            You&apos;ve already submitted today&apos;s {routineType} check-in.
          </p>
          <ButtonLink href={`/share/${alreadySubmitted}`} className="w-full">
            View & share report
          </ButtonLink>
          <ButtonLink href="/" variant="secondary" className="w-full">
            Back home
          </ButtonLink>
        </Card>
      </PageShell>
    );
  }

  if (error && items.length === 0) {
    return (
      <PageShell title={title} subtitle="Could not load your routine">
        <Card className="space-y-4">
          <p className="text-sm text-red-700">{error}</p>
          <ButtonLink href="/" variant="secondary" className="w-full">
            Back home
          </ButtonLink>
          <Button onClick={() => loadRoutine()}>Try again</Button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={title}
      subtitle={`Tap ✅ or ❌ for each item — ${today}`}
    >
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <CheckinItemRow
            key={item.routineItemId}
            item={item}
            onAnswer={(wasDone) =>
              updateItem(item.routineItemId, {
                wasDone,
                reasonIfNotDone: wasDone ? "" : item.reasonIfNotDone,
              })
            }
            onReasonChange={(reason) =>
              updateItem(item.routineItemId, { reasonIfNotDone: reason })
            }
          />
        ))}
      </ul>

      <div className="mt-6">
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? "Submitting..." : "Submit check-in"}
        </Button>
        {!allItemsAnswered(items) && (
          <p className="mt-2 text-center text-xs text-stone-500">
            Answer every item before submitting
          </p>
        )}
      </div>
    </PageShell>
  );
}
