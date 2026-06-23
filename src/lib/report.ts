import { formatReportDate } from "./dates";
import type { ReportItem, RoutineType } from "./types";

const ROUTINE_REPORT_TITLES: Record<RoutineType, string> = {
  morning: "Morning Report",
  evening: "Evening Report",
};

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
}): string {
  const { routineType, displayName, date, items, streak, timezone } = params;
  const title = ROUTINE_REPORT_TITLES[routineType];
  const formattedDate = formatReportDate(date, timezone);
  const completed = items.filter((i) => i.wasDone).length;
  const total = items.length;

  const lines: string[] = [
    `*THE RESET CIRCLE APP — ${title}*`,
    `👤 ${displayName} | 📅 ${formattedDate}`,
    "",
  ];

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
