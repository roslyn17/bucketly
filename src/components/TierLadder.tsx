import { LEVELS } from "@/lib/level";

/**
 * The seven LEVELS as a connector-and-label ladder: reached tiers get a
 * teal connector and teal-ink label, the current tier is a coral pill,
 * unreached tiers are muted. Collapses the tail to "+N more" once there's
 * more than one unreached tier past the current one, so it fits on one
 * line regardless of how many tiers exist above the user's current one.
 */
export default function TierLadder({ currentLevelName }: { currentLevelName: string }) {
  const currentIndex = Math.max(
    0,
    LEVELS.findIndex((level) => level.name === currentLevelName),
  );
  // Show every reached tier, the current one, and one tier ahead --
  // collapse anything past that into a "+N more" chip.
  const visibleCount = Math.min(currentIndex + 2, LEVELS.length);
  const visible = LEVELS.slice(0, visibleCount);
  const remaining = LEVELS.length - visibleCount;

  return (
    <div className="rounded-[16px] border border-line bg-surface-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="mr-2 text-xs font-bold tracking-[.08em] text-text-3 uppercase">Tiers</span>
        {visible.map((level, i) => (
          <div key={level.name} className="flex items-center gap-2">
            {i > 0 && <span className={`h-0.5 w-8 rounded-full ${i - 1 < currentIndex ? "bg-brand-teal" : "bg-surface-sunken"}`} />}
            {i === currentIndex ? (
              <span className="rounded-full bg-brand-coral px-3 py-1 text-xs font-bold text-white">{level.name}</span>
            ) : (
              <span className={`font-semibold ${i < currentIndex ? "text-brand-teal-ink" : "text-text-3"}`}>
                {level.name}
              </span>
            )}
          </div>
        ))}
        {remaining > 0 && (
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-8 rounded-full bg-surface-sunken" />
            <span className="text-text-3">+{remaining} more</span>
          </div>
        )}
      </div>
    </div>
  );
}
