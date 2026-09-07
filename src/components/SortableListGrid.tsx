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

/**
 * Owns the whole "Your bucket lists" section: the heading, the
 * in-progress/completed segmented control, the "+ Add bucket list" button,
 * and the drag-and-drop-reorderable card grid itself. Order is kept
 * optimistically in local state and persisted via reorderLists -- syncing
 * back to the server-given order only when the *set* of lists changes
 * (add/remove), so a pending drag or in-flight save is never clobbered by
 * an unrelated re-render. Dragging only reorders within a section --
 * completion is derived from progress, not something a drag should change.
 */
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

  const addButton = (
    <Link
      href="/lists/add"
      className="rounded-[10px] bg-brand-coral px-4 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-brand-coral-hover"
    >
      + Add bucket list
    </Link>
  );

  if (lists.length === 0) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-extrabold text-text-1">Your bucket lists</h2>
          {addButton}
        </div>
        <div className="rounded-[16px] border border-dashed border-line-strong p-10 text-center">
          <p className="text-sm text-text-2">
            You haven&apos;t added any bucket lists yet. Click &ldquo;+ Add bucket list&rdquo; above to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-xl font-extrabold text-text-1">Your bucket lists</h2>
        {addButton}
      </div>

      {/* Trying both groups on one page instead of behind an in-progress/
          completed tab toggle -- easy to revert to tabs if this reads as too
          long once someone has a lot of completed lists. */}
      <DndContext id="dashboard-lists" sensors={sensors} onDragEnd={handleDragEnd}>
        <h3 className="mb-3 text-sm font-bold tracking-[.02em] text-text-2">In progress ({inProgressIds.length})</h3>
        <SortableContext items={inProgressIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {inProgressIds.length === 0 ? (
              <p className="col-span-full text-sm text-text-3">
                Nothing in progress -- everything you&apos;re tracking is done!
              </p>
            ) : (
              inProgressIds.map((id) => {
                const list = byId.get(id);
                if (!list) return null;
                return <SortableListCard key={id} list={list} />;
              })
            )}
          </div>
        </SortableContext>

        <h3 className="mt-8 mb-3 text-sm font-bold tracking-[.02em] text-text-2">Completed ({completedIds.length})</h3>
        <SortableContext items={completedIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {completedIds.length === 0 ? (
              <p className="col-span-full text-sm text-text-3">No completed lists yet -- keep checking things off!</p>
            ) : (
              completedIds.map((id) => {
                const list = byId.get(id);
                if (!list) return null;
                return <SortableListCard key={id} list={list} />;
              })
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

/** The ring shows a list's emoji rather than its raw percentage -- the
 * fraction just underneath ("12 of 63 visited") already gives the precise
 * count, so the ring's job is to be an at-a-glance identity + progress
 * indicator, the same idea as the catalog's list tiles. */
function ProgressRing({ pct, slug }: { pct: number; slug: string }) {
  return (
    <div
      className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(var(--brand-teal) 0 ${pct}%, var(--surface-sunken) ${pct}% 100%)` }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-card text-2xl">
        {LIST_EMOJI[slug] ?? "📍"}
      </div>
    </div>
  );
}

function GripIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
      <circle cx="2" cy="2" r="1.5" />
      <circle cx="8" cy="2" r="1.5" />
      <circle cx="2" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="2" cy="14" r="1.5" />
      <circle cx="8" cy="14" r="1.5" />
    </svg>
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
      className={`group relative rounded-[16px] border p-6 transition-colors ${
        completed
          ? "border-done-border bg-done-bg"
          : "border-line bg-surface-card hover:border-brand-teal hover:shadow-[var(--shadow-card-hover)]"
      } ${isDragging ? "z-10 opacity-70" : ""}`}
    >
      {/* Drag listeners live only on this handle -- not the whole card --
          so clicking the card to open the list (or hitting Remove) isn't
          fighting the sortable's pointer-down handling. Both buttons sit
          outside the Link below (siblings, not nested inside it) so they
          stay independently clickable without needing to fight its
          navigation via stopPropagation. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${list.name} to reorder`}
        className="absolute top-3 right-3 z-10 cursor-grab touch-none rounded p-1 text-line-strong hover:text-brand-coral active:cursor-grabbing"
      >
        <GripIcon />
      </button>
      {/* Kept out of the header row (it used to compete with the progress
          info for attention) -- only appears on hover, near the handle. */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => removeList(list.id, list.slug))}
        className="absolute top-9 right-3 z-10 text-[11px] text-text-3 opacity-0 underline transition-opacity hover:text-brand-coral disabled:opacity-50 group-hover:opacity-100"
      >
        Remove
      </button>

      {/* The whole card is the way in now -- no separate "Continue"/"View"
          link competing for attention; the hover border/shadow above is the
          only affordance needed. */}
      <Link href={`/lists/${list.slug}`} className="flex items-center gap-5">
        <ProgressRing pct={list.pct} slug={list.slug} />

        <div className="min-w-0 flex-1 pr-6">
          <h3 className="mb-1.5 truncate font-display text-lg font-extrabold text-text-1">{list.name}</h3>

          <p className="mb-2.5 truncate text-sm text-text-2">
            {list.visited} of {list.total} {list.actionVerb.toLowerCase()}
          </p>

          <div className="flex items-center justify-between gap-2">
            <DifficultyBadge tier={list.difficultyTier} pointsPerItem={list.pointsPerItem} />
            <span className="shrink-0 text-sm font-bold text-text-1">{list.visited * list.pointsPerItem} pts</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
