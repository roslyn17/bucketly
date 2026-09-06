import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { DifficultyTier, List, Profile } from "@/lib/types";
import { getLevelProgress } from "@/lib/level";
import { computeProfileStats } from "@/lib/profileStats";
import AvatarDisplay from "@/components/AvatarDisplay";
import ListIcon from "@/components/ListIcon";
import ScoringInfoModal from "@/components/ScoringInfoModal";
import StatTile from "@/components/StatTile";
import type { DashboardListCard } from "@/components/SortableListGrid";

/**
 * Read-only public profile at /u/[display_name] -- display_name doubles as
 * the public handle (see the unique index in
 * 20260904000001_add_profile_public_sharing.sql), so this looks a profile
 * up by it rather than by a separate username field. Private profiles (or a
 * name that doesn't match any public profile) render the same "this
 * profile is private" message -- never a hard 404/error -- so a visitor
 * can't tell the difference between "wrong name" and "exists but private".
 */
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  // Escape LIKE metacharacters so a display name containing "%" or "_"
  // can't turn this lookup into a wildcard match.
  const escaped = decoded.replace(/[%_]/g, (c) => `\\${c}`);

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, is_public")
    .eq("is_public", true)
    .ilike("display_name", escaped)
    .maybeSingle<Profile>();

  if (!profile) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-lg font-bold text-text-1">This profile is private</p>
        <p className="mt-2 text-sm text-text-3">
          Either it doesn&apos;t exist, or the owner hasn&apos;t made it public.
        </p>
        <Link href="/" className="mt-6 text-sm font-semibold text-brand-teal-ink underline">
          ← Back home
        </Link>
      </div>
    );
  }

  const displayName = profile.display_name!;

  const [
    { data: userListRows, error: userListsError },
    { data: items, error: itemsError },
    { data: progress, error: progressError },
    { data: listTiers, error: listTiersError },
    { count: catalogCount },
  ] = await Promise.all([
    supabase
      .from("user_lists")
      .select("sort_order, list:lists(*)")
      .eq("user_id", profile.id)
      .order("sort_order", { ascending: true })
      .returns<{ sort_order: number; list: List }[]>(),
    supabase.from("list_items").select("id, list_id"),
    supabase.from("user_progress").select("list_item_id").eq("user_id", profile.id).eq("visited", true),
    supabase.from("lists").select("id, difficulty_tier").returns<{ id: string; difficulty_tier: DifficultyTier }[]>(),
    supabase.from("lists").select("id", { count: "exact", head: true }),
  ]);

  const queryError = userListsError ?? itemsError ?? progressError ?? listTiersError;
  if (queryError) throw queryError;

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
      <div className="mb-8 rounded-[18px] border border-line bg-surface-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4 sm:min-w-0 sm:flex-1">
            <AvatarDisplay avatarUrl={profile.avatar_url} name={displayName} size={76} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-extrabold text-text-1">{displayName}</h1>
                <span className="rounded-full bg-brand-yellow px-3 py-1 text-xs font-bold tracking-[.04em] text-brand-navy uppercase">
                  {level.name}
                </span>
                <ScoringInfoModal />
              </div>

              <div className="mt-3 max-w-md">
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progressPct}%`,
                      background: "linear-gradient(90deg, var(--brand-teal), #8BE0EA)",
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-text-3">
                  {nextLevel
                    ? `${pointsToNext} pt${pointsToNext === 1 ? "" : "s"} to ${nextLevel.name}`
                    : "Max level reached!"}
                </p>
              </div>
            </div>
          </div>

          <div className={`grid gap-3 sm:w-auto sm:shrink-0 ${stats.listsCompleted > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
            <StatTile label="points" value={stats.totalPoints} tone="coral" />
            <StatTile label="items" value={stats.totalVisited} tone="navy" />
            {stats.listsCompleted > 0 && <StatTile label="lists done" value={stats.listsCompleted} tone="teal" />}
          </div>
        </div>
      </div>

      <h2 className="mb-6 font-display text-xl font-extrabold text-text-1">
        {displayName}&apos;s bucket lists
      </h2>

      {lists.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line-strong p-10 text-center">
          <p className="text-sm text-text-3">{displayName} hasn&apos;t added any bucket lists yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {lists.map((list) => {
            const total = itemsByList.get(list.id) ?? 0;
            const visited = visitedByList.get(list.id) ?? 0;
            const pct = total > 0 ? Math.round((visited / total) * 100) : 0;
            const card: DashboardListCard = {
              id: list.id,
              slug: list.slug,
              name: list.name,
              actionVerb: list.action_verb,
              visited,
              total,
              pct,
              difficultyTier: list.difficulty_tier,
              pointsPerItem: 0,
            };
            return <PublicListCard key={card.id} list={card} />;
          })}
        </div>
      )}

      <div className="mt-10 flex flex-col items-center gap-4 rounded-[18px] bg-brand-navy p-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="font-display text-xl font-extrabold text-white">Start your own bucket list</p>
          <p className="mt-1 text-sm text-brand-navy-ink">
            {catalogCount ?? 0} ready-made lists — national parks, stadiums, films. Free.
          </p>
        </div>
        <Link
          href="/signup"
          className="shrink-0 rounded-[10px] bg-brand-coral px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white hover:bg-brand-coral-hover"
        >
          Create my list
        </Link>
      </div>
    </div>
  );
}

function PublicListCard({ list }: { list: DashboardListCard }) {
  const completed = list.total > 0 && list.visited === list.total;
  return (
    <div className={`rounded-[16px] border p-4 ${completed ? "border-done-border bg-done-bg" : "border-line bg-surface-card"}`}>
      <div className="mb-2 flex items-center gap-2">
        <ListIcon slug={list.slug} size={28} />
        <h3 className="min-w-0 flex-1 truncate font-display text-sm font-extrabold text-text-1">{list.name}</h3>
        {completed && <span className="shrink-0 text-brand-teal-ink">✓</span>}
      </div>

      <p className="mb-2 text-xs text-text-2">
        {list.visited} / {list.total} {list.actionVerb.toLowerCase()}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full"
          style={{
            width: `${list.pct}%`,
            background: completed ? "var(--brand-teal)" : "linear-gradient(90deg, var(--brand-teal), #8BE0EA)",
          }}
        />
      </div>
    </div>
  );
}
