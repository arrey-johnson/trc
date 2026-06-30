export interface CheckinPageData {
  today: string;
  timezone: string;
  eveningReminderTime: string;
  routineId: string | null;
  items: { id: string; label: string }[];
  existingCheckinId: string | null;
  eveningBlocked: boolean;
  eveningUnlockLabel: string;
  hasNonNegotiables: boolean;
  error: string | null;
}
