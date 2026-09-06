import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAuthError } from "@/lib/authError";
import type { DifficultyTier, List, Profile } from "@/lib/types";
import { POINTS_BY_TIER } from "@/lib/difficulty";
import { getLevelProgress } from "@/lib/level";
import { computeProfileStats } from "@/lib/profileStats";
import AvatarPicker from "@/components/AvatarPicker";
import DisplayNameEditor from "@/components/DisplayNameEditor";
import ScoringInfoModal from "@/components/ScoringInfoModal";
import ProfileSharingControls from "@/components/ProfileSharingControls";
import TierLadder from "@/components/TierLadder";
import SortableListGrid, { type DashboardListCard } from "@/components/SortableListGrid";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: userListRows, error: userListsError },
    { data: items, error: itemsError },
    { data: progress, error: progressError },
    { data: profile, error: profileError },
    { data: listTiers, error: listTiersError },
  ] = await Promise.all([
    supabase
      .from("user_lists")
      .select("sort_order, list:lists(*)")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .returns<{ sort_order: number; list: List }[]>(),
    supabase.from("list_items").select("id, list_id"),
    supabase.from("user_progress").select("list_item_id").eq("user_id", user.id).eq("visited", true),
    supabase.from("profiles").select("id, email, display_name, avatar_url, is_public").eq("id", user.id).single(),
    // Every list, not just the user's added ones -- a checked-off item on a
    // since-removed list still counts toward points (see profileStats.ts).
    supabase.from("lists").select("id, difficulty_tier").returns<{ id: string; difficulty_tier: DifficultyTier }[]>(),
  ]);

  // A silently-swallowed error here (data null, coerced to []) is exactly
  // what previously made checked-off items appear to vanish after login --
  // surface it as a real error instead of rendering a false "0". The one
  // exception is a stale/invalid session token (getUser() above can return a
  // user even when the token then fails verification on this DB round-trip)
  // -- that's not a real data error, just an expired session, so send the
  // user back to log in again instead of crashing with the raw error.
  const queryError = userListsError ?? itemsError ?? progressError ?? profileError ?? listTiersError;
  if (queryError) {
    if (isAuthError(queryError)) redirect("/login");
    throw queryError;
  }

  const lists = (userListRows ?? []).map((row) => row.list);
  const stats = computeProfileStats(userListRows ?? [], items ?? [], progress ?? [], listTiers ?? []);

  const itemsByList = new Map<string, number>();
  for (const item of items ?? []) {
    itemsByList.set(item.list_id, (itemsByList.get(item.list_id) ?? 0) + 1);
  }

  const visitedItemIds = new Set((progress ?? []).map((p) => p.list_item_id));
  const itemToList = new Map((items ?? []).map((i) => [i.id, i.list_id]));
  const visitedByList = new Map<string, number>();
  for (const itemId of visitedItemIds) {
    const listId = itemToList.get(itemId);
    if (listId) visitedByList.set(listId, (visitedByList.get(listId) ?? 0) + 1);
  }

  const { level, nextLevel, progressPct, pointsToNext } = getLevelProgress(stats.totalPoints);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="mb-6 rounded-[18px] bg-brand-navy p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4 sm:min-w-0 sm:flex-1">
            <AvatarPicker initialAvatarUrl={(profile as Profile | null)?.avatar_url ?? null} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DisplayNameEditor
                  initialName={(profile as Profile | null)?.display_name ?? null}
                  fallbackName={user.email?.split("@")[0] || "Explorer"}
                />
                <span className="rounded-full bg-brand-yellow px-3 py-1 text-xs font-bold tracking-[.04em] text-brand-navy uppercase">
                  {level.name}
                </span>
                <ScoringInfoModal tone="dark" />
              </div>

              <div className="mt-3 max-w-md">
                <div className="h-[11px] w-full overflow-hidden rounded-full bg-brand-navy-3">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progressPct}%`,
                      background: "linear-gradient(90deg, var(--brand-teal), #8BE0EA)",
                    }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-brand-navy-ink">
                  <span>{stats.totalPoints} pts</span>
                  {nextLevel ? (
                    <>
                      <span>
                        <span className="font-bold text-brand-yellow">
                          {pointsToNext} more
                        </span>{" "}
                        to {nextLevel.name}
                      </span>
                      <span>{nextLevel.minPoints} pts</span>
                    </>
                  ) : (
                    <span className="font-bold text-brand-yellow">Max level reached! 🏆</span>
                  )}
                </div>
              </div>

              <ProfileSharingControls
                initialIsPublic={(profile as Profile | null)?.is_public ?? false}
                displayName={(profile as Profile | null)?.display_name ?? null}
                avatarUrl={(profile as Profile | null)?.avatar_url ?? null}
                levelName={level.name}
                totalPoints={stats.totalPoints}
                totalVisited={stats.totalVisited}
                totalListsTracked={lists.length}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 border-t border-brand-navy-3 pt-6 sm:justify-start sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
            <BandStat value={stats.totalVisited} label="items" />
            <BandStat value={stats.listsCompleted} label="lists done" />
            <BandStat value={lists.length} label="tracking" />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <TierLadder currentLevelName={level.name} />
      </div>

      <SortableListGrid
        lists={lists.map((list): DashboardListCard => {
          const total = itemsByList.get(list.id) ?? 0;
          const visited = visitedByList.get(list.id) ?? 0;
          const pct = total > 0 ? Math.round((visited / total) * 100) : 0;
          return {
            id: list.id,
            slug: list.slug,
            name: list.name,
            actionVerb: list.action_verb,
            visited,
            total,
            pct,
            difficultyTier: list.difficulty_tier,
            pointsPerItem: POINTS_BY_TIER[list.difficulty_tier],
          };
        })}
      />
    </div>
  );
}

function BandStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-2xl font-extrabold text-white">{value}</p>
      <p className="text-xs text-brand-navy-ink">{label}</p>
    </div>
  );
}
