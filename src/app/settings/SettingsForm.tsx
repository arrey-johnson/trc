"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PushControls } from "@/components/PushControls";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { Button, Card, Input, Label, PageShell } from "@/components/ui";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types";

const TIMEZONES = [
  "Africa/Douala",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
] as const;

export function SettingsForm({ profile }: { profile: User }) {
  const [morning, setMorning] = useState(
    profile.morning_reminder_time.slice(0, 5)
  );
  const [evening, setEvening] = useState(
    profile.evening_reminder_time.slice(0, 5)
  );
  const [timezone, setTimezone] = useState(profile.timezone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { theme } = useTheme();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        morning_reminder_time: morning,
        evening_reminder_time: evening,
        timezone,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Settings saved.");
    router.refresh();
  }

  return (
    <PageShell title="Settings" subtitle="Reminders & notifications">
      <div className="space-y-4">
        <Card className="space-y-4 p-4">
          <h2 className="font-semibold text-[var(--foreground)]">Appearance</h2>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--muted)]">Theme</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {theme === "dark" ? "Dark mode" : "Light mode"}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </Card>

        <PushControls />

        <Card className="space-y-4 p-4">
          <h2 className="font-semibold text-[var(--foreground)]">Reminder times</h2>
          <p className="text-sm text-[var(--muted)]">
            We send a push at these times in your timezone if you haven&apos;t
            logged yet today.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-3 text-base text-[var(--foreground)]"
              >
                {!TIMEZONES.includes(timezone as (typeof TIMEZONES)[number]) && (
                  <option value={timezone}>{timezone}</option>
                )}
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Default: {DEFAULT_TIMEZONE.replace(/_/g, " ")}
              </p>
            </div>

            <div>
              <Label htmlFor="morning">Morning reminder</Label>
              <Input
                id="morning"
                type="time"
                value={morning}
                onChange={(e) => setMorning(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="evening">Evening reminder</Label>
              <Input
                id="evening"
                type="time"
                value={evening}
                onChange={(e) => setEvening(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save reminder times"}
            </Button>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}
