import Image from "next/image";
import { getAvatarColorHex, getInitials } from "@/lib/avatarDisplay";

/** Read-only avatar circle for contexts with no picker -- the public
 * profile page. Falls back to initials on a colored circle when there's no
 * avatar_url, rather than leaving a blank/generic silhouette. */
export default function AvatarDisplay({
  avatarUrl,
  name,
  size = 80,
}: {
  avatarUrl: string | null;
  name: string;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="relative shrink-0 overflow-hidden rounded-full border border-line"
      >
        <Image src={avatarUrl} alt={`${name}'s avatar`} fill sizes={`${size}px`} className="object-cover" unoptimized />
      </div>
    );
  }

  const { bg, fg } = getAvatarColorHex(name);
  return (
    <div
      style={{ width: size, height: size, backgroundColor: bg, color: fg, fontSize: size * 0.32 }}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      role="img"
      aria-label={`${name}'s avatar`}
    >
      {getInitials(name)}
    </div>
  );
}
