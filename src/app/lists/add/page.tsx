import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List } from "@/lib/types";
import { LIST_GROUPS } from "@/lib/listGroups";
import CatalogClient, { type CatalogGroup } from "./CatalogClient";

export default async function AddListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: allLists }, { data: userLists }, { data: listItems }] = await Promise.all([
    supabase.from("lists").select("*").order("name"),
    supabase.from("user_lists").select("list_id").eq("user_id", user.id),
    supabase.from("list_items").select("id, list_id"),
  ]);

  const itemCounts = new Map<string, number>();
  for (const item of listItems ?? []) {
    itemCounts.set(item.list_id, (itemCounts.get(item.list_id) ?? 0) + 1);
  }

  const byGroup = new Map<string, List[]>();
  for (const list of (allLists as List[] | null) ?? []) {
    const bucket = byGroup.get(list.list_group) ?? [];
    bucket.push(list);
    byGroup.set(list.list_group, bucket);
  }

  // Hide a group's section entirely if it has no list types at all yet.
  const groups: CatalogGroup[] = LIST_GROUPS.filter((group) => byGroup.has(group.key)).map((group) => ({
    key: group.key,
    label: group.label,
    lists: (byGroup.get(group.key) ?? []).map((list) => ({ ...list, itemCount: itemCounts.get(list.id) ?? 0 })),
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link href="/dashboard" className="mb-4 inline-block text-sm text-text-3 hover:text-text-1">
        ← Your bucket lists
      </Link>
      <h1 className="mb-2 font-display text-3xl font-extrabold text-text-1">Browse bucket lists</h1>

      <CatalogClient groups={groups} initialAddedIds={(userLists ?? []).map((ul) => ul.list_id)} />
    </div>
  );
}
