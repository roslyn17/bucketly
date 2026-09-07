"use client";

import { useState, useTransition } from "react";
import type { List, ListGroup } from "@/lib/types";
import { POINTS_BY_TIER } from "@/lib/difficulty";
import DifficultyBadge from "@/components/DifficultyBadge";
import ListIcon from "@/components/ListIcon";
import ScoringInfoModal from "@/components/ScoringInfoModal";
import { addList } from "@/lib/listActions";

type CatalogList = List & { itemCount: number };
export type CatalogGroup = { key: ListGroup; label: string; lists: CatalogList[] };

/**
 * The interactive part of the browse page: the category filter pills and
 * the list cards. Client-side filtering only -- all lists are already on
 * the page, switching pills just shows/hides group sections. Unlike the
 * old behavior, adding a list no longer makes its card vanish -- the
 * button flips to a non-primary "on your dashboard" state instead, tracked
 * optimistically (rolled back if the server action fails).
 */
export default function CatalogClient({
  groups,
  initialAddedIds,
}: {
  groups: CatalogGroup[];
  initialAddedIds: string[];
}) {
  // Resynced against the server-confirmed set whenever it actually changes
  // (e.g. once addList's revalidatePath lands, or the list was added/removed
  // in another tab) -- the same during-render-adjustment pattern
  // SortableListGrid uses for order, so a stale optimistic add/rollback
  // can't get stuck disagreeing with the server indefinitely.
  const addedKey = [...initialAddedIds].sort().join(",");
  const [addedIds, setAddedIds] = useState(() => new Set(initialAddedIds));
  const [lastAddedKey, setLastAddedKey] = useState(addedKey);
  if (addedKey !== lastAddedKey) {
    setLastAddedKey(addedKey);
    setAddedIds(new Set(initialAddedIds));
  }

  const [filter, setFilter] = useState<"all" | ListGroup>("all");
  const [, startTransition] = useTransition();

  const totalCount = groups.reduce((sum, g) => sum + g.lists.length, 0);
  const visibleGroups = filter === "all" ? groups : groups.filter((g) => g.key === filter);

  function handleAdd(list: CatalogList) {
    setAddedIds((prev) => new Set(prev).add(list.id));
    startTransition(() => {
      addList(list.id, list.slug).catch(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(list.id);
          return next;
        });
      });
    });
  }

  return (
    <div>
      {/* A <div>, not a <p> -- ScoringInfoModal's modal overlay (a <div> with
          its own <p>/<ul> inside) always exists in the tree, just hidden
          until opened, and a <p> can't legally contain block content like
          that. It used to be a <p> here, which browsers silently "fixed" by
          closing it early, causing a hydration mismatch. */}
      <div className="mb-6 text-sm text-text-2">
        {totalCount} lists across {groups.length} categories. Harder lists are worth more per item —{" "}
        <ScoringInfoModal variant="link" />
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label={`All ${totalCount}`} />
        {groups.map((group) => (
          <FilterPill
            key={group.key}
            active={filter === group.key}
            onClick={() => setFilter(group.key)}
            label={`${group.label} ${group.lists.length}`}
          />
        ))}
      </div>

      {visibleGroups.map((group) => (
        <div key={group.key} className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-display text-lg font-extrabold text-text-1">{group.label}</h2>
            <div className="h-px flex-1 bg-line" />
            <span className="text-sm text-text-3">
              {group.lists.length} list{group.lists.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {group.lists.map((list) => (
              <CatalogCard key={list.id} list={list} added={addedIds.has(list.id)} onAdd={() => handleAdd(list)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-brand-navy text-white" : "border border-line-strong text-text-2 hover:bg-surface-sunken"
      }`}
    >
      {label}
    </button>
  );
}

function CatalogCard({ list, added, onAdd }: { list: CatalogList; added: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col rounded-[16px] border border-line bg-surface-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <ListIcon slug={list.slug} size={32} />
          <h3 className="font-display font-extrabold text-text-1">{list.name}</h3>
        </div>
        <p className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-text-3">
          <DifficultyBadge tier={list.difficulty_tier} />
          <span>
            {POINTS_BY_TIER[list.difficulty_tier]} pts / item · {list.itemCount} item{list.itemCount === 1 ? "" : "s"}
          </span>
        </p>
        {list.description && <p className="text-sm text-text-2">{list.description}</p>}
      </div>
      {added ? (
        <span className="self-start rounded-[10px] border border-line-strong px-4 py-2 text-sm font-semibold text-text-2">
          ✓ On your dashboard
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="self-start rounded-[10px] bg-brand-coral px-4 py-2 text-sm font-semibold text-white hover:bg-brand-coral-hover"
        >
          + Add to my lists
        </button>
      )}
    </div>
  );
}
