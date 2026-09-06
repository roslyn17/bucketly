import { LIST_EMOJI, LIST_ICON_TINT } from "@/lib/listEmoji";

/**
 * A list's emoji, centered in a rounded tinted tile. One shared
 * implementation used by the dashboard cards, catalog cards, public profile
 * cards, and the list detail header, so the icon treatment can't drift
 * between screens.
 */
export default function ListIcon({ slug, size = 32 }: { slug: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: LIST_ICON_TINT[slug] ?? "var(--surface-sunken)",
        fontSize: size * 0.55,
      }}
      className="flex shrink-0 items-center justify-center rounded-[10px]"
      aria-hidden="true"
    >
      {LIST_EMOJI[slug] ?? "📍"}
    </div>
  );
}
