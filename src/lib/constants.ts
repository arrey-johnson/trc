import type { RoutineType } from "./types";

export const DEFAULT_TIMEZONE = "Africa/Douala";

export const MORNING_TEMPLATE_ITEMS = [
  "Wake up on time",
  "Pray/Meditate",
  "Drink water",
  "Exercise/stretch",
  "Plan top 3 tasks for the day",
] as const;

export const EVENING_TEMPLATE_ITEMS = [
  "Reflect on the day",
  "Review tomorrow's tasks",
  "No screens 30 min before bed",
  "Gratitude note",
] as const;

export const ROUTINE_LABELS: Record<RoutineType, string> = {
  morning: "Morning Routine",
  evening: "Evening Routine",
};

export const DEFAULT_REMINDER_TIMES: Record<RoutineType, string> = {
  morning: "07:00",
  evening: "21:00",
};
