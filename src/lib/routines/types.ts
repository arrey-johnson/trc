import type { RoutineType } from "@/lib/types";

export interface RoutineItemDraft {
  id: string;
  label: string;
}

export interface RoutineEditorData {
  routineIds: Record<RoutineType, string | null>;
  morningItems: RoutineItemDraft[];
  eveningItems: RoutineItemDraft[];
}
