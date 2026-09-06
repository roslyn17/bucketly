"use client";

import { usePathname } from "next/navigation";

/** Login/signup are a full-bleed split-screen layout with their own
 * navy-panel branding (see AuthHeroPanel) -- the persistent top bar would
 * just be a redundant second "bucketly" wordmark stacked above it, so it's
 * hidden on those two routes only. `header` is rendered by the (server)
 * root layout and passed in as a node rather than rendered here, so its
 * data fetching still happens in the server tree as usual. */
export default function HeaderVisibility({ header }: { header: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/signup") return null;
  return <>{header}</>;
}
