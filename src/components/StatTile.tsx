const TONE_CLASSES = {
  coral: "text-brand-coral",
  navy: "text-brand-navy",
  teal: "text-brand-teal-ink",
} as const;

/** Inset stat block on the cream surface -- used by the public profile's
 * header card (the dashboard absorbed its own stats into the navy progress
 * band instead, see SortableListGrid/dashboard page.tsx). */
export default function StatTile({
  label,
  value,
  tone = "navy",
}: {
  label: string;
  value: number;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <div className="rounded-[12px] bg-surface-page p-4 text-center">
      <p className={`font-display text-2xl font-extrabold ${TONE_CLASSES[tone]}`}>{value}</p>
      <p className="mt-1 text-xs text-text-3">{label}</p>
    </div>
  );
}
