"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DifficultyTier } from "@/lib/types";
import DifficultyBadge from "@/components/DifficultyBadge";
import { LIST_EMOJI } from "@/lib/listEmoji";
import { removeList, reorderLists } from "@/lib/listActions";

export type DashboardListCard = {
  id: string;
  slug: string;
  name: string;
  actionVerb: string;
  visited: number;
  total: number;
  pct: number;
  difficultyTier: DifficultyTier;
  pointsPerItem: number;
};

function isListComplete(list: DashboardListCard): boolean {
  return list.total > 0 && list.visited === list.total;
}

/** Reorders `groupIds` (a subsequence of `flat`) and splices the result back
 * into `flat` at the same absolute positions those ids occupied -- so
 * reordering within one group (in-progress or completed) can't disturb the
 * other group's relative order. */
function reorderWithinGroup(flat: string[], groupIds: string[], oldIndex: number, newIndex: number): string[] {
  const reorderedGroup = arrayMove(groupIds, oldIndex, newIndex);
  const groupSet = new Set(groupIds);
  let i = 0;
  return flat.map((id) => (groupSet.has(id) ? reorderedGroup[i++] : id));
}

/** Drag-and-drop-reorderable grid of the user's bucket list cards, split
 * into "In progress" and "Completed" sections. Order is kept optimistically
 * in local state and persisted via reorderLists -- syncing back to the
 * server-given order only when the *set* of lists changes (add/remove), so
 * a pending drag or in-flight save is never clobbered by an unrelated
 * re-render. Dragging only reorders within a section -- completion is
 * derived from progress, not something a drag should be able to change. */
export default function SortableListGrid({ lists }: { lists: DashboardListCard[] }) {
  const propIds = lists.map((l) => l.id);
  // Only the *set* of ids -- order-independent -- so a pure reorder's
  // eventual revalidated props (which will match what we already set
  // optimistically) doesn't fight with local drag state.
  const setKey = [...propIds].sort().join(",");

  const [orderedIds, setOrderedIds] = useState(propIds);
  const [lastSetKey, setLastSetKey] = useState(setKey);
  // Adjusting state during render (not in an effect) when the set of lists
  // actually changed -- e.g. a list was added or removed elsewhere.
  if (setKey !== lastSetKey) {
    setLastSetKey(setKey);
    setOrderedIds(propIds);
  }

  const [, startTransition] = useTransition();
  const byId = new Map(lists.map((l) => [l.id, l]));

  const completedIds = orderedIds.filter((id) => {
    const list = byId.get(id);
    return list && isListComplete(list);
  });
  const inProgressIds = orderedIds.filter((id) => {
    const list = byId.get(id);
    return list && !isListComplete(list);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const group = completedIds.includes(activeId) ? completedIds : inProgressIds;
    if (!group.includes(overId)) return; // no reordering across sections

    const next = reorderWithinGroup(orderedIds, group, group.indexOf(activeId), group.indexOf(overId));

    setOrderedIds(next);
    startTransition(() => {
      reorderLists(next).catch(() => {
        // Best-effort: on failure, fall back to whatever the server last
        // confirmed rather than leaving a card order that didn't save.
        setOrderedIds(lists.map((l) => l.id));
      });
    });
  }

  return (
    <DndContext id="dashboard-lists" sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={inProgressIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {inProgressIds.map((id) => {
            const list = byId.get(id);
            if (!list) return null;
            return <SortableListCard key={id} list={list} />;
          })}
        </div>
      </SortableContext>

      {completedIds.length > 0 && (
        <>
          <h3 className="mt-8 mb-4 flex items-center gap-1.5 text-sm font-medium text-zinc-500">
            <span aria-hidden="true">✅</span> Completed
          </h3>
          <SortableContext items={completedIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {completedIds.map((id) => {
                const list = byId.get(id);
                if (!list) return null;
                return <SortableListCard key={id} list={list} />;
              })}
            </div>
          </SortableContext>
        </>
      )}
    </DndContext>
  );
}

function SortableListCard({ list }: { list: DashboardListCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
  });
  const [isPending, startTransition] = useTransition();
  const completed = isListComplete(list);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-label={`${list.name}, draggable to reorder`}
      className={`touch-none cursor-grab rounded-lg border p-5 transition-colors active:cursor-grabbing ${
        completed
          ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 dark:border-emerald-900 dark:bg-emerald-950/20 dark:hover:border-emerald-700"
          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
      } ${isDragging ? "z-10 opacity-70" : ""}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">{LIST_EMOJI[list.slug] ?? "📍"}</span>
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">{list.name}</h2>
        {completed && (
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            ✓ Done
          </span>
        )}
      </div>

      <p className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-zinc-400">
        <DifficultyBadge tier={list.difficultyTier} />
        <span>
          {list.visited * list.pointsPerItem} pts earned · {list.pointsPerItem} pts / item
        </span>
      </p>

      <Link href={`/lists/${list.slug}`} className="block">
        <p className="mb-3 text-sm text-zinc-500">
          {list.visited} / {list.total} {list.actionVerb.toLowerCase()}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full ${completed ? "bg-emerald-500 dark:bg-emerald-500" : "bg-zinc-900 dark:bg-zinc-50"}`}
            style={{ width: `${list.pct}%` }}
          />
        </div>
      </Link>

      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => removeList(list.id, list.slug))}
        className="mt-3 text-xs text-zinc-400 underline hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
      >
        Remove
      </button>
    </div>
  );
}
