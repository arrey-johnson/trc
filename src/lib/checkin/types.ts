export interface CheckinPageData {
  today: string;
  timezone: string;
  eveningReminderTime: string;
  routineId: string | null;
  items: { id: string; label: string }[];
  /** Submitted (non-draft) check-in for today */
  existingCheckinId: string | null;
  /** In-progress draft check-in */
  draftCheckinId: string | null;
  savedAnswers: Record<
    string,
    { wasDone: boolean; reasonIfNotDone: string }
  >;
  eveningBlocked: boolean;
  eveningUnlockLabel: string;
  hasNonNegotiables: boolean;
  error: string | null;
}
