import Link from "next/link";
import Image from "next/image";
import { LEVELS } from "@/lib/level";
import type { MarketingStats } from "@/lib/marketingStats";

/** The navy hero panel shared by login and signup's split-screen layout.
 * Counts are live (see getMarketingStats) rather than hardcoded, so the
 * copy can't drift from the catalog as lists are added. */
export default function AuthHeroPanel({ stats }: { stats: MarketingStats }) {
  const remaining = Math.max(0, stats.totalLists - 3);

  return (
    <div className="flex flex-1 flex-col justify-between bg-brand-navy p-10">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/bucketly-mark.png" alt="" width={32} height={32} />
        <span className="font-display text-lg font-extrabold text-white">
          bucket<span className="text-brand-teal">ly</span>
        </span>
      </Link>

      <div>
        <p className="font-display text-3xl font-extrabold text-white">
          Every park, stadium and continent you&apos;ve ever meant to see — in one bucket.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Pill>{stats.spotlightCounts["national-parks"] ?? 0} national parks</Pill>
          <Pill>{stats.spotlightCounts["countries"] ?? 0} countries</Pill>
          <Pill>{stats.spotlightCounts["mlb-stadiums"] ?? 0} MLB stadiums</Pill>
          {remaining > 0 && <Pill>+{remaining} more lists</Pill>}
        </div>
      </div>

      <p className="text-sm text-brand-navy-ink">Earn points, climb {LEVELS.length} tiers, share your card.</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-brand-navy-2 px-4 py-2 text-sm font-semibold text-white">{children}</span>
  );
}
