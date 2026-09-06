"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ItemWithProgress } from "@/lib/types";
import Confetti from "@/components/Confetti";
import ResetListButton from "./ResetListButton";
import ItemRow from "./ItemRow";

export default function ListItemsClient({
  listId,
  listSlug,
  listName,
  items,
  pointsPerItem,
}: {
  listId: string;
  listSlug: string;
  listName: string;
  items: ItemWithProgress[];
  pointsPerItem: number;
}) {
  const [query, setQuery] = useState("");

  // Tracked independently of each ItemRow's own local state so this
  // component can tell when the *last* item gets checked off, regardless of
  // which row it was. ItemRow reports each toggle via onToggle below, which
  // keeps this in sync optimistically -- but "Reset progress" clears
  // everyone's progress server-side without going through onToggle at all,
  // so this also has to resync whenever the server's own visited set (via
  // the revalidated `items` prop) disagrees with what we're holding, the
  // same during-render-adjustment pattern SortableListGrid uses for order.
  const visitedKey = items
    .filter(({ progress }) => progress?.visited)
    .map(({ item }) => item.id)
    .sort()
    .join(",");
  const [visitedIds, setVisitedIds] = useState(() => new Set(visitedKey ? visitedKey.split(",") : []));
  const [lastVisitedKey, setLastVisitedKey] = useState(visitedKey);
  if (visitedKey !== lastVisitedKey) {
    setLastVisitedKey(visitedKey);
    setVisitedIds(new Set(visitedKey ? visitedKey.split(",") : []));
  }

  const [celebrating, setCelebrating] = useState(false);
  const total = items.length;
  const isComplete = total > 0 && visitedIds.size === total;
  // Starts at whatever the initial load's completion state is, so landing
  // on an already-complete list doesn't immediately fire the celebration.
  const wasComplete = useRef(isComplete);

  useEffect(() => {
    if (isComplete && !wasComplete.current) setCelebrating(true);
    wasComplete.current = isComplete;
  }, [isComplete]);

  function handleToggle(itemId: string, visited: boolean) {
    setVisitedIds((prev) => {
      const next = new Set(prev);
      if (visited) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      ({ item }) =>
        item.name.toLowerCase().includes(q) ||
        item.metadata?.team?.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div>
      {celebrating && <Confetti onDone={() => setCelebrating(false)} />}
      {celebrating && (
        <div className="mb-4 rounded-[16px] border border-done-border bg-done-bg p-4 text-center text-sm font-semibold text-brand-navy">
          🎉 List complete! You&apos;ve checked off everything in {listName}.
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <input
          type="search"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-[12px] border border-line bg-surface-card px-3 py-2 text-sm text-text-1 focus:border-brand-teal focus:outline-none"
        />
        {visitedIds.size > 0 && <ResetListButton listId={listId} listSlug={listSlug} />}
      </div>

      <ul className="divide-y divide-[#F3F0E6] rounded-[16px] border border-line bg-surface-card">
        {filtered.map(({ item, progress }) => (
          // Keying on the progress row's own id (not just the item's) forces
          // a remount -- and a fresh local state -- whenever that row is
          // deleted out from under it, e.g. by "Reset progress".
          <ItemRow
            key={`${item.id}:${progress?.id ?? "none"}`}
            listSlug={listSlug}
            item={item}
            initialProgress={progress}
            points={pointsPerItem}
            onToggle={handleToggle}
          />
        ))}
        {filtered.length === 0 && (
          <li className="py-6 text-center text-sm text-text-3">No matches.</li>
        )}
      </ul>
    </div>
  );
}
