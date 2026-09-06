import type { DifficultyTier } from "@/lib/types";

/**
 * Points awarded per item checked off, by the item's list's difficulty
 * tier. No completion bonus -- a list's total score is just this value
 * times however many of its items are checked off.
 *
 * `satisfies Record<DifficultyTier, number>` means adding a new tier to
 * the `DifficultyTier` union without adding it here is a compile error --
 * see lib/types.ts for the other half of that guarantee (every list row
 * must have a tier at all).
 */
export const POINTS_BY_TIER = {
  low: 1,
  "medium-low": 3,
  medium: 5,
  "medium-high": 10,
  high: 15,
  "very-high": 20,
} as const satisfies Record<DifficultyTier, number>;

/** Tiers in ascending difficulty order, with display labels -- for the
 * scoring legend shown to users (see ScoringInfoModal). */
export const DIFFICULTY_TIERS: { tier: DifficultyTier; label: string; points: number }[] = [
  { tier: "low", label: "Low", points: POINTS_BY_TIER.low },
  { tier: "medium-low", label: "Medium-low", points: POINTS_BY_TIER["medium-low"] },
  { tier: "medium", label: "Medium", points: POINTS_BY_TIER.medium },
  { tier: "medium-high", label: "Medium-high", points: POINTS_BY_TIER["medium-high"] },
  { tier: "high", label: "High", points: POINTS_BY_TIER.high },
  { tier: "very-high", label: "Very high", points: POINTS_BY_TIER["very-high"] },
];

/** tier -> display label, e.g. for a "Medium" badge on a list card. */
export const DIFFICULTY_TIER_LABELS = Object.fromEntries(
  DIFFICULTY_TIERS.map(({ tier, label }) => [tier, label]),
) as Record<DifficultyTier, string>;

/** tier -> badge color classes -- Bucketly's tint set (see the redesign
 * prompt's brand tokens table), ramping teal (easy) to indigo (hardest).
 * See components/DifficultyBadge.tsx, the one place these get applied. */
export const DIFFICULTY_TIER_COLORS: Record<DifficultyTier, string> = {
  low: "bg-[#E6F8FB] text-[#1E7C8A]",
  "medium-low": "bg-[#F3F9E2] text-[#5E7A16]",
  medium: "bg-[#FEF4D6] text-[#8A6A11]",
  "medium-high": "bg-[#FDEEDC] text-[#9A5A11]",
  high: "bg-[#FDECEA] text-[#B33B36]",
  "very-high": "bg-[#EDEBFB] text-[#4A3E9E]",
};
