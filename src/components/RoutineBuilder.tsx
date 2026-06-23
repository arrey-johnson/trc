"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Button, Input, Label } from "./ui";

export interface RoutineItemDraft {
  id: string;
  label: string;
}

interface RoutineBuilderProps {
  title: string;
  items: RoutineItemDraft[];
  onChange: (items: RoutineItemDraft[]) => void;
}

function newId() {
  return crypto.randomUUID();
}

function DragHandle({ listeners, attributes }: {
  listeners: ReturnType<typeof useSortable>["listeners"];
  attributes: ReturnType<typeof useSortable>["attributes"];
}) {
  return (
    <button
      type="button"
      className="flex min-h-12 min-w-11 shrink-0 touch-none cursor-grab items-center justify-center rounded-xl text-[var(--muted)] active:cursor-grabbing active:bg-[var(--elevated)]"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <span className="grid grid-cols-2 gap-1" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" />
        ))}
      </span>
    </button>
  );
}

function SortableRoutineItem({
  item,
  index,
  onLabelChange,
  onRemove,
}: {
  item: RoutineItemDraft;
  index: number;
  onLabelChange: (label: string) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl border bg-[var(--card)] p-2 ${
        isDragging
          ? "z-10 border-emerald-400 shadow-lg ring-2 ring-emerald-200 dark:ring-emerald-800"
          : "border-[var(--border)]"
      }`}
    >
      <DragHandle listeners={listeners} attributes={attributes} />
      <Input
        value={item.label}
        onChange={(e) => onLabelChange(e.target.value)}
        aria-label={`Routine item ${index + 1}`}
      />
      <button
        type="button"
        onClick={onRemove}
        className="min-h-12 min-w-12 shrink-0 rounded-xl text-red-600 hover:bg-red-50"
        aria-label="Remove item"
      >
        ✕
      </button>
    </li>
  );
}

export function RoutineBuilder({ title, items, onChange }: RoutineBuilderProps) {
  const [newLabel, setNewLabel] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(items, oldIndex, newIndex));
  }

  function updateLabel(id: string, label: string) {
    onChange(items.map((item) => (item.id === id ? { ...item, label } : item)));
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  function addItem() {
    const label = newLabel.trim();
    if (!label) return;
    onChange([...items, { id: newId(), label }]);
    setNewLabel("");
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="text-xs text-[var(--muted)]">Press and drag the handle to reorder</p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {items.map((item, index) => (
              <SortableRoutineItem
                key={item.id}
                item={item}
                index={index}
                onLabelChange={(label) => updateLabel(item.id, label)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="space-y-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--elevated)] p-3">
        <Label htmlFor="new-routine-item">Add a new habit</Label>
        <Input
          id="new-routine-item"
          placeholder="e.g. Read 10 pages"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="bg-[var(--input-bg)] text-left"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        {newLabel.trim() ? (
          <p className="text-sm text-[var(--muted)]">
            Adding:{" "}
            <span className="font-medium text-[var(--foreground)]">{newLabel.trim()}</span>
          </p>
        ) : (
          <p className="text-sm text-[var(--muted)]">Type above, then tap Add</p>
        )}
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={addItem}
          disabled={!newLabel.trim()}
        >
          Add to list
        </Button>
      </div>
    </div>
  );
}

export function templateToDrafts(labels: readonly string[]): RoutineItemDraft[] {
  return labels.map((label) => ({ id: newId(), label }));
}
