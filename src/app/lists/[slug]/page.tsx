import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ItemWithProgress, List, ListItem, UserProgress } from "@/lib/types";
import { POINTS_BY_TIER } from "@/lib/difficulty";
import { addList } from "@/lib/listActions";
import ListItemsClient from "./ListItemsClient";
import ResetListButton from "./ResetListButton";

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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/dashboard" className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50">
        ← All lists
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{list.name}</h1>
      <div className="mt-1 mb-6 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {visitedCount} / {itemsWithProgress.length} {list.action_verb.toLowerCase()}
          <span className="text-zinc-400"> · {POINTS_BY_TIER[list.difficulty_tier]} pts each</span>
        </p>
        {visitedCount > 0 && <ResetListButton listId={list.id} listSlug={list.slug} />}
      </div>

      {!isAdded && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <p className="text-sm text-zinc-500">This list isn&apos;t on your dashboard yet.</p>
          <form
            action={async () => {
              "use server";
              await addList(list.id, list.slug);
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium whitespace-nowrap text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + Add to my lists
            </button>
          </form>
        </div>
      )}

      <ListItemsClient
        listSlug={list.slug}
        listName={list.name}
        items={itemsWithProgress}
        pointsPerItem={POINTS_BY_TIER[list.difficulty_tier]}
      />
    </div>
  );
}
