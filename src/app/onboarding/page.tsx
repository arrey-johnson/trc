"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  RoutineBuilder,
  templateToDrafts,
  type RoutineItemDraft,
} from "@/components/RoutineBuilder";
import { PushControls } from "@/components/PushControls";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { Button, Card, Input, Label, PageShell } from "@/components/ui";
import {
  DEFAULT_REMINDER_TIMES,
  EVENING_TEMPLATE_ITEMS,
  MORNING_TEMPLATE_ITEMS,
  ROUTINE_LABELS,
} from "@/lib/constants";
import { friendlyDbError } from "@/lib/db-errors";
import { resolveAvatarUrl, uploadUserAvatar } from "@/lib/profile/avatar";
import { syncRoutineItems } from "@/lib/routines/sync-items";
import { syncLibraryForCurrentMember } from "@/app/library/actions";
import { createClient } from "@/lib/supabase/client";

const STEPS = ["profile", "morning", "evening", "reminders"] as const;
type Step = (typeof STEPS)[number];

const STEP_TITLES: Record<Step, string> = {
  profile: "Your profile",
  morning: "Morning routine",
  evening: "Evening routine",
  reminders: "Reminders",
};

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState<Step>("profile");
  const [displayName, setDisplayName] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [morningItems, setMorningItems] = useState<RoutineItemDraft[]>(() =>
    templateToDrafts(MORNING_TEMPLATE_ITEMS)
  );
  const [eveningItems, setEveningItems] = useState<RoutineItemDraft[]>(() =>
    templateToDrafts(EVENING_TEMPLATE_ITEMS)
  );
  const [morningReminder, setMorningReminder] = useState(
    DEFAULT_REMINDER_TIMES.morning
  );
  const [eveningReminder, setEveningReminder] = useState(
    DEFAULT_REMINDER_TIMES.evening
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const metadataName =
        typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : "";
      setDisplayName(metadataName);

      const { data: profile } = await supabase
        .from("users")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.display_name) {
        setDisplayName(profile.display_name);
      }
      if (profile?.avatar_url) {
        setAvatarPath(profile.avatar_url);
      }
    }

    loadProfile();
  }, [supabase]);

  const stepIndex = STEPS.indexOf(step);

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }

  function validateStep(): string | null {
    if (step === "profile" && !displayName.trim()) {
      return "Please enter your name.";
    }
    if (step === "morning" && morningItems.filter((i) => i.label.trim()).length === 0) {
      return "Add at least one morning routine item.";
    }
    if (step === "evening" && eveningItems.filter((i) => i.label.trim()).length === 0) {
      return "Add at least one evening routine item.";
    }
    return null;
  }

  async function completeOnboarding() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expired. Please sign in again.");
      setLoading(false);
      return;
    }

    const displayNameValue = displayName.trim();
    const phoneNumber =
      typeof user.user_metadata?.phone_number === "string"
        ? user.user_metadata.phone_number
        : "";

    let nextAvatarPath = avatarPath;
    if (avatarFile) {
      const { path, error: uploadError } = await uploadUserAvatar(
        supabase,
        user.id,
        avatarFile
      );
      if (uploadError || !path) {
        setError(uploadError ?? "Could not upload profile photo.");
        setLoading(false);
        return;
      }
      nextAvatarPath = path;
    }

    const { error: userError } = await supabase.from("users").upsert({
      id: user.id,
      email: user.email ?? "",
      display_name: displayNameValue,
      phone_number: phoneNumber,
      avatar_url: nextAvatarPath,
      morning_reminder_time: morningReminder,
      evening_reminder_time: eveningReminder,
      onboarding_complete: true,
    });

    if (userError) {
      setError(friendlyDbError(userError.message, userError.code));
      setLoading(false);
      return;
    }

    await supabase.auth.updateUser({
      data: { display_name: displayNameValue },
    });

    for (const [type, items, name] of [
      ["morning", morningItems, ROUTINE_LABELS.morning],
      ["evening", eveningItems, ROUTINE_LABELS.evening],
    ] as const) {
      const { data: routine, error: routineError } = await supabase
        .from("routines")
        .upsert(
          { user_id: user.id, type, name, is_active: true },
          { onConflict: "user_id,type" }
        )
        .select("id")
        .single();

      if (routineError || !routine) {
        setError(routineError?.message ?? "Failed to save routine.");
        setLoading(false);
        return;
      }

      const syncResult = await syncRoutineItems(supabase, routine.id, items);
      if (syncResult.error) {
        setError(syncResult.error);
        setLoading(false);
        return;
      }
    }

    await syncLibraryForCurrentMember();

    router.push("/");
    router.refresh();
  }

  async function handleContinue() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    if (step === "reminders") {
      await completeOnboarding();
      return;
    }
    goNext();
  }

  return (
    <PageShell
      title="Set up The Reset Circle App"
      subtitle={`Step ${stepIndex + 1} of ${STEPS.length} — ${STEP_TITLES[step]}`}
    >
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <Card className="space-y-4">
        {step === "profile" && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted)]">
              Add a photo and confirm the name your circle will see on reports
              and in the forum.
            </p>
            <AvatarUpload
              name={displayName || "You"}
              currentAvatarUrl={resolveAvatarUrl(supabase, avatarPath)}
              onFileSelect={setAvatarFile}
              disabled={loading}
            />
            <div>
              <Label htmlFor="onboarding-display-name">Your name</Label>
              <Input
                id="onboarding-display-name"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Arrey J."
                required
              />
            </div>
          </div>
        )}

        {step === "morning" && (
          <RoutineBuilder
            title="Build your Morning Routine"
            items={morningItems}
            onChange={setMorningItems}
          />
        )}

        {step === "evening" && (
          <RoutineBuilder
            title="Build your Evening Routine"
            items={eveningItems}
            onChange={setEveningItems}
          />
        )}

        {step === "reminders" && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Set when you want a heads-up to log your check-in. Notifications
              list your actual routine items — not generic nudges.
            </p>
            <div>
              <Label htmlFor="morningReminder">Morning reminder</Label>
              <Input
                id="morningReminder"
                type="time"
                value={morningReminder}
                onChange={(e) => setMorningReminder(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="eveningReminder">Evening reminder</Label>
              <Input
                id="eveningReminder"
                type="time"
                value={eveningReminder}
                onChange={(e) => setEveningReminder(e.target.value)}
              />
            </div>
            <PushControls variant="inline" />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          {stepIndex > 0 && (
            <Button type="button" variant="secondary" onClick={goBack}>
              Back
            </Button>
          )}
          <Button type="button" onClick={handleContinue} disabled={loading}>
            {loading
              ? "Saving..."
              : step === "reminders"
                ? "Finish setup"
                : "Continue"}
          </Button>
        </div>
      </Card>
    </PageShell>
  );
}
