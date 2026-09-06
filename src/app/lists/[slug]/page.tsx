import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ItemWithProgress, List, ListItem, UserProgress } from "@/lib/types";
import { POINTS_BY_TIER } from "@/lib/difficulty";
import { addList } from "@/lib/listActions";
import DifficultyBadge from "@/components/DifficultyBadge";
import ListIcon from "@/components/ListIcon";
import ListItemsClient from "./ListItemsClient";

export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: list } = await supabase
    .from("lists")
    .select("*")
    .eq("slug", slug)
    .single<List>();
  if (!list) notFound();

  const [{ data: items }, { data: progress }, { data: membership }] = await Promise.all([
    supabase
      .from("list_items")
      .select("*")
      .eq("list_id", list.id)
      .order("sort_order")
      .returns<ListItem[]>(),
    supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id)
      .returns<UserProgress[]>(),
    supabase
      .from("user_lists")
      .select("list_id")
      .eq("user_id", user.id)
      .eq("list_id", list.id)
      .maybeSingle(),
  ]);
  const isAdded = !!membership;

  const progressByItemId = new Map((progress ?? []).map((p) => [p.list_item_id, p]));
  const itemsWithProgress: ItemWithProgress[] = (items ?? []).map((item) => ({
    item,
    progress: progressByItemId.get(item.id) ?? null,
  }));

  const visitedCount = itemsWithProgress.filter((i) => i.progress?.visited).length;
  const pointsPerItem = POINTS_BY_TIER[list.difficulty_tier];
  const pct = itemsWithProgress.length > 0 ? Math.round((visitedCount / itemsWithProgress.length) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/dashboard" className="mb-4 inline-block text-sm text-text-3 hover:text-text-1">
        ← Your bucket lists
      </Link>

      <div className="mb-4 rounded-[18px] border border-line bg-surface-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <ListIcon slug={list.slug} size={52} />
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-extrabold text-text-1">{list.name}</h1>
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm whitespace-nowrap text-text-2">
                <DifficultyBadge tier={list.difficulty_tier} />
                <span>
                  {pointsPerItem} pts / item · {visitedCount} of {itemsWithProgress.length}{" "}
                  {list.action_verb.toLowerCase()}
                </span>
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl font-extrabold text-brand-coral">{visitedCount * pointsPerItem}</p>
            <p className="text-xs text-text-3">pts from this list</p>
          </div>
        </div>
      </div>

      <div className="mb-6 h-3 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--brand-teal), #8BE0EA)" }}
        />
      </div>

      {!isAdded && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-[16px] border border-dashed border-line-strong p-4">
          <p className="text-sm text-text-2">This list isn&apos;t on your dashboard yet.</p>
          <form
            action={async () => {
              "use server";
              await addList(list.id, list.slug);
            }}
          >
            <button
              type="submit"
              className="rounded-[10px] bg-brand-coral px-4 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-brand-coral-hover"
            >
              + Add to my lists
            </button>
          </form>
        </div>
      )}

      <ListItemsClient
        listId={list.id}
        listSlug={list.slug}
        listName={list.name}
        items={itemsWithProgress}
        pointsPerItem={pointsPerItem}
      />
    </div>
  );
}
