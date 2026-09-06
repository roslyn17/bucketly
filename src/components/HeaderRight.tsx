"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AvatarDisplay from "@/components/AvatarDisplay";
import SignOutButton from "@/components/SignOutButton";

/** The right-hand side of the top bar. Route-aware (not just auth-aware):
 * on a public profile page, everyone sees a "viewing a public profile"
 * indicator instead of account info -- even a signed-in visitor looking at
 * someone else's page shouldn't see their own points/avatar there, since
 * that reads as if it belongs to the profile being viewed. Otherwise shows
 * a points pill and an avatar with sign-out tucked into its dropdown,
 * instead of the raw email sitting in the bar. */
export default function HeaderRight({
  email,
  displayName,
  avatarUrl,
  totalPoints,
}: {
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  totalPoints: number;
}) {
  const pathname = usePathname();
  const isPublicProfile = pathname?.startsWith("/u/");
  const [menuOpen, setMenuOpen] = useState(false);

  if (isPublicProfile) {
    return <span className="text-sm font-medium text-brand-navy-ink">👀 Viewing a public profile</span>;
  }

  if (!email) return null;

  const name = displayName || email.split("@")[0] || "Explorer";

  return (
    <div className="flex items-center gap-3">
      <span className="rounded-full bg-brand-yellow px-3 py-1 text-sm font-bold text-brand-navy">
        {totalPoints} pts
      </span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Account menu"
          aria-expanded={menuOpen}
          className="block rounded-full"
        >
          <AvatarDisplay avatarUrl={avatarUrl} name={name} size={36} />
        </button>

        {menuOpen && (
          <>
            {/* Click-away layer */}
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-[10px] border border-line bg-surface-card py-1 shadow-[var(--shadow-card-hover)]">
              <p className="truncate px-3 py-2 text-xs text-text-3">{email}</p>
              <div className="border-t border-line px-3 py-2">
                <SignOutButton />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
