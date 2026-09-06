import type { DifficultyTier, List } from "@/lib/types";
import { POINTS_BY_TIER } from "@/lib/difficulty";

export type ProfileStats = {
  /** Total items checked off across all of the user's lists. */
  totalVisited: number;
  /** Total points across all lists and categories combined (Travel,
   * Experiences & Challenges, Culture & Media aren't tracked separately) --
   * drives the level system, see lib/level.ts. */
  totalPoints: number;
  /** Count of the user's tracked lists (via user_lists) where every item is checked off. */
  listsCompleted: number;
};

/**
 * Computes profile stats from data the caller has already fetched, rather
 * than re-querying. Dashboard-page data (user_lists, list_items,
 * user_progress, lists) is needed for other things on the page anyway --
 * querying it a second time here just for stats used to fire a redundant,
 * duplicate set of requests in the same burst as the page's own queries,
 * which made the whole page's data fetch more likely to trip over a
 * transient network hiccup right after login (cold connection, no pool
 * warm-up yet).
 *
 * `listTiers` covers every list, not just the ones on `user_lists` --
 * removing a list preserves progress on it (see listActions.removeList), so
 * a checked-off item on a since-removed list must still count.
 */
/**
 * Just the points sum, for contexts that don't need the rest of
 * ProfileStats (the header's points pill, which -- unlike the dashboard --
 * has no reason to also fetch user_lists just to compute listsCompleted).
 * Shared with computeProfileStats below so the accumulation logic can't
 * drift between the two call sites.
 */
export function computeTotalPoints(
  items: { id: string; list_id: string }[],
  progress: { list_item_id: string }[],
  listTiers: { id: string; difficulty_tier: DifficultyTier }[],
): number {
  const tierByListId = new Map(listTiers.map((l) => [l.id, l.difficulty_tier]));
  const itemToList = new Map(items.map((item) => [item.id, item.list_id]));

  let totalPoints = 0;
  for (const p of progress) {
    const listId = itemToList.get(p.list_item_id);
    const tier = listId ? tierByListId.get(listId) : undefined;
    if (tier) totalPoints += POINTS_BY_TIER[tier];
  }
  return totalPoints;
}

export function computeProfileStats(
  userListRows: { list: Pick<List, "id"> }[],
  items: { id: string; list_id: string }[],
  progress: { list_item_id: string }[],
  listTiers: { id: string; difficulty_tier: DifficultyTier }[],
): ProfileStats {
  const addedListIds = new Set(userListRows.map((row) => row.list.id));

  const itemsByList = new Map<string, number>();
  const itemToList = new Map<string, string>();
  for (const item of items) {
    itemsByList.set(item.list_id, (itemsByList.get(item.list_id) ?? 0) + 1);
    itemToList.set(item.id, item.list_id);
  }

  const visitedItemIds = new Set(progress.map((p) => p.list_item_id));

  const visitedByList = new Map<string, number>();
  for (const itemId of visitedItemIds) {
    const listId = itemToList.get(itemId);
    if (listId) visitedByList.set(listId, (visitedByList.get(listId) ?? 0) + 1);
  }

  let listsCompleted = 0;
  for (const listId of addedListIds) {
    const total = itemsByList.get(listId) ?? 0;
    const visited = visitedByList.get(listId) ?? 0;
    if (total > 0 && visited === total) listsCompleted++;
  }

  return {
    totalVisited: visitedItemIds.size,
    totalPoints: computeTotalPoints(items, progress, listTiers),
    listsCompleted,
  };
}
