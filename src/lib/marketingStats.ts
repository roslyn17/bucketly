import { createClient } from "@/lib/supabase/server";

/** Lists + list_items are both publicly readable (RLS: "readable by
 * everyone"), so this works for the logged-out login/signup pages too. */
const SPOTLIGHT_SLUGS = ["national-parks", "countries", "mlb-stadiums"] as const;

export type MarketingStats = {
  totalLists: number;
  /** slug -> item count, for the three lists called out by name on the
   * login/signup hero panel. Live-fetched rather than hardcoded so the
   * copy can't go stale as the catalog grows. */
  spotlightCounts: Record<string, number>;
};

export async function getMarketingStats(): Promise<MarketingStats> {
  const supabase = await createClient();

  const [{ count: totalLists }, { data: spotlightLists }] = await Promise.all([
    supabase.from("lists").select("id", { count: "exact", head: true }),
    supabase.from("lists").select("id, slug").in("slug", [...SPOTLIGHT_SLUGS]),
  ]);

  const slugByListId = new Map((spotlightLists ?? []).map((l) => [l.id, l.slug]));
  const spotlightCounts: Record<string, number> = {};

  if (slugByListId.size > 0) {
    const { data: items } = await supabase
      .from("list_items")
      .select("list_id")
      .in("list_id", [...slugByListId.keys()]);
    for (const item of items ?? []) {
      const slug = slugByListId.get(item.list_id);
      if (slug) spotlightCounts[slug] = (spotlightCounts[slug] ?? 0) + 1;
    }
  }

  return { totalLists: totalLists ?? 0, spotlightCounts };
}
