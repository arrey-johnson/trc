import Link from "next/link";
import { WhatsAppShare } from "@/components/WhatsAppShare";
import { Button, Card, PageShell } from "@/components/ui";
import { generateReport } from "@/lib/report";
import { calculateStreak } from "@/lib/streak";
import { createClient } from "@/lib/supabase/server";
import type { ReportItem, RoutineType } from "@/lib/types";

interface SharePageProps {
  params: { checkinId: string };
}

export default async function SharePage({ params }: SharePageProps) {
  const { checkinId } = params;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: checkin } = await supabase
    .from("checkins")
    .select("id, date, user_id, routine_id, status")
    .eq("id", checkinId)
    .eq("user_id", user.id)
    .single();

  if (!checkin) {
    return (
      <PageShell title="Report not found">
        <Card>
          <p className="text-stone-600">This check-in doesn&apos;t exist.</p>
          <Link href="/" className="mt-4 block">
            <Button>Back home</Button>
          </Link>
        </Card>
      </PageShell>
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, timezone")
    .eq("id", user.id)
    .single();

  const { data: routine } = await supabase
    .from("routines")
    .select("type")
    .eq("id", checkin.routine_id)
    .single();

  const { data: checkinItems } = await supabase
    .from("checkin_items")
    .select("was_done, reason_if_not_done, routine_item_id")
    .eq("checkin_id", checkin.id);

  const routineItemIds = (checkinItems ?? []).map((ci) => ci.routine_item_id);
  const { data: routineItems } = await supabase
    .from("routine_items")
    .select("id, label, sort_order")
    .in("id", routineItemIds.length ? routineItemIds : ["00000000-0000-0000-0000-000000000000"])
    .order("sort_order");

  const itemMap = new Map((routineItems ?? []).map((ri) => [ri.id, ri.label]));

  const reportItems: ReportItem[] = (checkinItems ?? [])
    .map((ci) => ({
      label: itemMap.get(ci.routine_item_id) ?? "Item",
      wasDone: ci.was_done,
      reason: ci.reason_if_not_done ?? undefined,
      sortOrder:
        routineItems?.find((ri) => ri.id === ci.routine_item_id)?.sort_order ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ label, wasDone, reason }) => ({ label, wasDone, reason }));

  const routineType = (routine?.type ?? "morning") as RoutineType;
  const timezone = profile?.timezone ?? "Africa/Douala";

  const { data: pastCheckins } = await supabase
    .from("checkins")
    .select("date")
    .eq("user_id", user.id)
    .eq("routine_id", checkin.routine_id)
    .lte("date", checkin.date)
    .order("date", { ascending: false });

  const streak = calculateStreak(pastCheckins ?? [], checkin.date);

  let nonNegotiablesSection:
    | {
        items: ReportItem[];
        completedAll?: boolean;
        reflection?: string;
      }
    | undefined;

  if (routineType === "evening") {
    const [{ data: nnItems }, { data: nnReview }] = await Promise.all([
      supabase
        .from("daily_non_negotiables")
        .select("label, target_time, is_completed, sort_order")
        .eq("user_id", user.id)
        .eq("date", checkin.date)
        .order("target_time")
        .order("sort_order"),
      supabase
        .from("daily_non_negotiable_reviews")
        .select("completed_all, reflection")
        .eq("user_id", user.id)
        .eq("date", checkin.date)
        .maybeSingle(),
    ]);

    if ((nnItems ?? []).length > 0) {
      nonNegotiablesSection = {
        items: (nnItems ?? []).map((item) => ({
          label: item.label,
          wasDone: item.is_completed,
        })),
        completedAll: nnReview?.completed_all,
        reflection: nnReview?.reflection ?? undefined,
      };
    }
  }

  const report = generateReport({
    routineType,
    displayName: profile?.display_name ?? "Member",
    date: checkin.date,
    items: reportItems,
    streak,
    timezone,
    nonNegotiables: nonNegotiablesSection,
  });

  return (
    <PageShell
      title="Share your report"
      subtitle="Send this to your WhatsApp group"
    >
      <WhatsAppShare report={report} />
      <div className="mt-4">
        <Link href="/">
          <Button variant="ghost">Back home</Button>
        </Link>
      </div>
    </PageShell>
  );
}
