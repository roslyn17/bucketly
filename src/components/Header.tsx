import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { computeTotalPoints } from "@/lib/profileStats";
import type { DifficultyTier } from "@/lib/types";
import HeaderRight from "@/components/HeaderRight";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  let totalPoints = 0;

  if (user) {
    // A dedicated, lean fetch for the header's points pill -- not reusing
    // the dashboard's full stats query, since this runs on every page via
    // the root layout and has no reason to also pull user_lists just to
    // compute listsCompleted (see computeTotalPoints in profileStats.ts).
    const [{ data: profile }, { data: items }, { data: progress }, { data: listTiers }] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("list_items").select("id, list_id"),
      supabase.from("user_progress").select("list_item_id").eq("user_id", user.id).eq("visited", true),
      supabase.from("lists").select("id, difficulty_tier").returns<{ id: string; difficulty_tier: DifficultyTier }[]>(),
    ]);
    displayName = profile?.display_name ?? null;
    avatarUrl = profile?.avatar_url ?? null;
    totalPoints = computeTotalPoints(items ?? [], progress ?? [], listTiers ?? []);
  }

  return (
    <header className="border-b border-line bg-surface-card">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <Image src="/bucketly-mark.png" alt="" width={32} height={32} priority />
          <span className="font-display text-lg font-extrabold text-brand-navy">
            bucket<span className="text-brand-teal">ly</span>
          </span>
        </Link>
        <HeaderRight
          email={user?.email ?? null}
          displayName={displayName}
          avatarUrl={avatarUrl}
          totalPoints={totalPoints}
        />
      </div>
    </header>
  );
}
