import { formatReportDate } from "./dates";
import type { ReportItem, RoutineType } from "./types";

const ROUTINE_REPORT_TITLES: Record<RoutineType, string> = {
  morning: "Morning Report",
  evening: "Evening Report",
};

export interface NonNegotiableReportSection {
  items: ReportItem[];
  completedAll?: boolean;
  reflection?: string;
}

/**
 * Pure string template for WhatsApp-ready accountability reports.
 * Uses single-asterisk bold (WhatsApp native formatting).
 */
export function generateReport(params: {
  routineType: RoutineType;
  displayName: string;
  date: string;
  items: ReportItem[];
  streak: number;
  timezone?: string;
  nonNegotiables?: NonNegotiableReportSection;
}): string {
  const { routineType, displayName, date, items, streak, timezone, nonNegotiables } =
    params;
  const title = ROUTINE_REPORT_TITLES[routineType];
  const formattedDate = formatReportDate(date, timezone);
  const completed = items.filter((i) => i.wasDone).length;
  const total = items.length;

  const lines: string[] = [
    `*THE RESET CIRCLE APP — ${title}*`,
    `👤 ${displayName} | 📅 ${formattedDate}`,
    "",
  ];

  if (nonNegotiables && nonNegotiables.items.length > 0) {
    lines.push("*Daily Non-Negotiables*");
    for (const item of nonNegotiables.items) {
      lines.push(item.wasDone ? `✅ ${item.label}` : `❌ ${item.label}`);
    }
    lines.push("");

    if (nonNegotiables.completedAll === true) {
      lines.push("✅ Completed all non-negotiables today");
    } else if (nonNegotiables.completedAll === false) {
      lines.push("❌ Did not complete all non-negotiables today");
      if (nonNegotiables.reflection?.trim()) {
        lines.push(`   ↳ ${nonNegotiables.reflection.trim()}`);
      }
    }
    lines.push("");
  }

  for (const item of items) {
    if (item.wasDone) {
      lines.push(`✅ ${item.label}`);
    } else {
      lines.push(`❌ ${item.label}`);
      if (item.reason?.trim()) {
        lines.push(`   ↳ Reason: ${item.reason.trim()}`);
      }
    }
  }

  lines.push("");
  lines.push(`📊 ${completed}/${total} completed`);
  lines.push(`🔥 Streak: ${streak} day${streak === 1 ? "" : "s"}`);

  return lines.join("\n");
}
