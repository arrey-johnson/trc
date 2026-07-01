"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitRoutineCheckin } from "@/app/checkin/actions";
import {
  allItemsAnswered,
  allReasonsValid,
  CheckinItemRow,
} from "@/components/CheckinItemRow";
import {
  isReflectionComplete,
  NonNegotiableReflectionStep,
} from "@/components/NonNegotiableReflectionStep";
import { CheckinPageSkeleton } from "@/components/PageSkeleton";
import { Button, ButtonLink, Card, PageShell } from "@/components/ui";
import { ROUTINE_LABELS } from "@/lib/constants";
import type { CheckinPageData } from "@/lib/checkin/types";
import {
  getTodayInTimezone,
  isEveningUnlockedInTimezone,
  eveningUnlockLabel as getEveningUnlockLabel,
} from "@/lib/dates";
import { friendlyDbError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/client";
import type { CheckinItemAnswer, RoutineType } from "@/lib/types";

interface CheckinPageProps {
  routineType: RoutineType;
  initialData?: CheckinPageData;
}

type Phase = "reflection" | "routine";
type SaveState = "idle" | "saving" | "saved" | "error";

function buildItemsFromData(data: CheckinPageData): CheckinItemAnswer[] {
  return data.items.map((ri) => {
    const saved = data.savedAnswers[ri.id];
    return {
      routineItemId: ri.id,
      label: ri.label,
      wasDone: saved ? saved.wasDone : null,
      reasonIfNotDone: saved?.reasonIfNotDone ?? "",
    };
  });
}

function initialPhase(
  routineType: RoutineType,
  data: CheckinPageData
): Phase {
  const hasSavedAnswers = Object.keys(data.savedAnswers).length > 0;
  if (
    routineType === "evening" &&
    data.hasNonNegotiables &&
    !hasSavedAnswers
  ) {
    return "reflection";
  }
  return "routine";
}

export default function CheckinPage({
  routineType,
  initialData,
}: CheckinPageProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<CheckinItemAnswer[]>(() =>
    initialData ? buildItemsFromData(initialData) : []
  );
  const [routineId, setRoutineId] = useState<string | null>(
    initialData?.routineId ?? null
  );
  const [today, setToday] = useState(
    () => initialData?.today ?? getTodayInTimezone()
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(initialData?.error ?? null);
  const [alreadySubmitted, setAlreadySubmitted] = useState<string | null>(
    initialData?.existingCheckinId ?? null
  );
  const [draftCheckinId, setDraftCheckinId] = useState<string | null>(
    initialData?.draftCheckinId ?? null
  );
  const [eveningBlocked, setEveningBlocked] = useState(
    initialData?.eveningBlocked ?? false
  );
  const [eveningUnlockLabel, setEveningUnlockLabel] = useState(
    initialData?.eveningUnlockLabel ?? ""
  );
  const [phase, setPhase] = useState<Phase>(() =>
    initialData ? initialPhase(routineType, initialData) : "routine"
  );
  const [hasNonNegotiables, setHasNonNegotiables] = useState(
    initialData?.hasNonNegotiables ?? false
  );
  const [reflectionCompletedAll, setReflectionCompletedAll] = useState<
    boolean | null
  >(null);
  const [reflectionText, setReflectionText] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isPending, startTransition] = useTransition();
  const userIdRef = useRef<string | null>(null);
  const reasonSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const title = ROUTINE_LABELS[routineType];
  const answeredCount = items.filter((i) => i.wasDone !== null).length;

  const ensureUserId = useCallback(async () => {
    if (userIdRef.current) return userIdRef.current;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) userIdRef.current = user.id;
    return user?.id ?? null;
  }, [supabase]);

  const persistItem = useCallback(
    async (item: CheckinItemAnswer) => {
      if (!routineId || item.wasDone === null) return;

      const userId = await ensureUserId();
      if (!userId) return;

      setSaveState("saving");

      let checkinId = draftCheckinId;

      if (!checkinId) {
        const { data: inserted, error: insertError } = await supabase
          .from("checkins")
          .insert({
            user_id: userId,
            routine_id: routineId,
            date: today,
            status: "draft",
          })
          .select("id")
          .single();

        if (insertError?.code === "23505") {
          const { data: existing } = await supabase
            .from("checkins")
            .select("id, status")
            .eq("user_id", userId)
            .eq("routine_id", routineId)
            .eq("date", today)
            .maybeSingle();

          if (existing?.status === "draft") {
            checkinId = existing.id;
          } else if (existing) {
            setAlreadySubmitted(existing.id);
            setSaveState("error");
            return;
          }
        } else if (insertError || !inserted) {
          setSaveState("error");
          setError(
            friendlyDbError(
              insertError?.message ?? "Could not save progress.",
              insertError?.code
            )
          );
          return;
        } else {
          checkinId = inserted.id;
        }

        setDraftCheckinId(checkinId);
      }

      const { error: itemError } = await supabase.from("checkin_items").upsert(
        {
          checkin_id: checkinId,
          routine_item_id: item.routineItemId,
          was_done: item.wasDone,
          reason_if_not_done: item.wasDone
            ? null
            : item.reasonIfNotDone.trim() || null,
        },
        { onConflict: "checkin_id,routine_item_id" }
      );

      if (itemError) {
        setSaveState("error");
        setError(friendlyDbError(itemError.message, itemError.code));
        return;
      }

      setSaveState("saved");
    },
    [routineId, draftCheckinId, today, supabase, ensureUserId]
  );

  const loadRoutine = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEveningBlocked(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    userIdRef.current = user.id;

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("timezone, onboarding_complete, evening_reminder_time")
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

    if (routineType === "evening") {
      if (!isEveningUnlockedInTimezone(timezone)) {
        setEveningUnlockLabel(getEveningUnlockLabel());
        setEveningBlocked(true);
        setLoading(false);
        return;
      }

      const { count } = await supabase
        .from("daily_non_negotiables")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("date", todayStr);

      const nnCount = count ?? 0;
      setHasNonNegotiables(nnCount > 0);
    }

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

    const [existingResult, itemsResult] = await Promise.all([
      supabase
        .from("checkins")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("routine_id", routine.id)
        .eq("date", todayStr)
        .maybeSingle(),
      supabase
        .from("routine_items")
        .select("id, label")
        .eq("routine_id", routine.id)
        .eq("is_active", true)
        .order("sort_order"),
    ]);

    if (existingResult.error) {
      setError(friendlyDbError(existingResult.error.message, existingResult.error.code));
      setLoading(false);
      return;
    }

    if (itemsResult.error) {
      setError(friendlyDbError(itemsResult.error.message, itemsResult.error.code));
      setLoading(false);
      return;
    }

    const existing = existingResult.data;
    const savedAnswers: CheckinPageData["savedAnswers"] = {};

    if (existing?.status === "draft") {
      setDraftCheckinId(existing.id);
      const { data: savedItems } = await supabase
        .from("checkin_items")
        .select("routine_item_id, was_done, reason_if_not_done")
        .eq("checkin_id", existing.id);

      for (const row of savedItems ?? []) {
        savedAnswers[row.routine_item_id] = {
          wasDone: row.was_done,
          reasonIfNotDone: row.reason_if_not_done ?? "",
        };
      }

      const hasSavedAnswers = Object.keys(savedAnswers).length > 0;
      if (routineType === "evening" && !hasSavedAnswers) {
        const { count: nnCount } = await supabase
          .from("daily_non_negotiables")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("date", todayStr);

        setHasNonNegotiables((nnCount ?? 0) > 0);
        setPhase((nnCount ?? 0) > 0 ? "reflection" : "routine");
      } else {
        setPhase("routine");
      }
    } else if (existing) {
      setAlreadySubmitted(existing.id);
      setLoading(false);
      return;
    }

    setItems(
      (itemsResult.data ?? []).map((ri) => {
        const saved = savedAnswers[ri.id];
        return {
          routineItemId: ri.id,
          label: ri.label,
          wasDone: saved ? saved.wasDone : null,
          reasonIfNotDone: saved?.reasonIfNotDone ?? "",
        };
      })
    );
    setLoading(false);
  }, [routineType, supabase, router]);

  useEffect(() => {
    if (!initialData) {
      loadRoutine();
    }
  }, [initialData, loadRoutine]);

  useEffect(() => {
    const timers = reasonSaveTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  function updateItem(
    routineItemId: string,
    patch: Partial<CheckinItemAnswer>,
    options?: { debounceReason?: boolean }
  ) {
    setItems((prev) => {
      const next = prev.map((item) =>
        item.routineItemId === routineItemId ? { ...item, ...patch } : item
      );
      const updated = next.find((i) => i.routineItemId === routineItemId);
      if (!updated || updated.wasDone === null) return next;

      if (options?.debounceReason) {
        const existing = reasonSaveTimers.current.get(routineItemId);
        if (existing) clearTimeout(existing);
        reasonSaveTimers.current.set(
          routineItemId,
          setTimeout(() => {
            void persistItem(updated);
          }, 400)
        );
      } else {
        void persistItem(updated);
      }

      return next;
    });
  }

  function handleSubmit() {
    if (!routineId || !allItemsAnswered(items) || !allReasonsValid(items)) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await submitRoutineCheckin({
        routineType,
        routineId,
        date: today,
        draftCheckinId,
        items: items.map((item) => ({
          routineItemId: item.routineItemId,
          wasDone: item.wasDone === true,
          reasonIfNotDone: item.reasonIfNotDone,
        })),
        nonNegotiableReview:
          routineType === "evening" && hasNonNegotiables
            ? {
                completedAll: reflectionCompletedAll === true,
                reflection: reflectionText,
              }
            : null,
      });

      if (result.error || !result.checkinId) {
        setError(result.error ?? "Failed to save check-in.");
        return;
      }

      router.push(`/share/${result.checkinId}`);
    });
  }

  const canContinueReflection = isReflectionComplete(
    reflectionCompletedAll,
    reflectionText
  );

  const canSubmit =
    allItemsAnswered(items) && allReasonsValid(items) && !isPending;

  if (loading) {
    return <CheckinPageSkeleton title={title} />;
  }

  if (eveningBlocked) {
    return (
      <PageShell title={title} subtitle="Not available yet">
        <Card className="space-y-4">
          <p className="text-[var(--foreground)]">
            Evening check-in unlocks at{" "}
            <span className="font-semibold">{eveningUnlockLabel}</span> in your
            timezone.
          </p>
          <p className="text-sm text-[var(--muted)]">
            Use this time to finish your daily non-negotiables first.
          </p>
          <ButtonLink href="/" variant="secondary" className="w-full">
            Back home
          </ButtonLink>
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

  if (error && items.length === 0 && phase === "routine") {
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

  if (phase === "reflection") {
    return (
      <PageShell
        title={title}
        subtitle="Step 1 — Non-negotiables review"
      >
        {error && (
          <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <ul className="space-y-3">
          <NonNegotiableReflectionStep
            completedAll={reflectionCompletedAll}
            reflection={reflectionText}
            onAnswer={(completedAll) => {
              setReflectionCompletedAll(completedAll);
              if (completedAll) setReflectionText("");
            }}
            onReflectionChange={setReflectionText}
          />
        </ul>

        <div className="mt-6">
          <Button
            onClick={() => setPhase("routine")}
            disabled={!canContinueReflection}
          >
            Continue to routine
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={title}
      subtitle={`${answeredCount}/${items.length} answered · saves automatically`}
    >
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {saveState === "saved" && (
        <p className="mb-4 text-center text-xs font-medium text-brand-subtle-fg dark:text-brand-muted">
          Progress saved
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
              updateItem(
                item.routineItemId,
                { reasonIfNotDone: reason },
                { debounceReason: true }
              )
            }
          />
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
        <ButtonLink href="/" variant="ghost" className="w-full">
          Save & continue later
        </ButtonLink>
        {hasNonNegotiables && routineType === "evening" && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setPhase("reflection")}
          >
            Back to non-negotiables review
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {isPending ? "Submitting..." : "Submit check-in"}
        </Button>
        {!allItemsAnswered(items) && (
          <p className="text-center text-xs text-stone-500">
            Finish every item, then submit to share your report
          </p>
        )}
      </div>
    </PageShell>
  );
}
