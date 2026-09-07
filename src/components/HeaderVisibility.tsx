"use client";

import { usePathname } from "next/navigation";

/** Login/signup center their own form, which carries its own "bucketly"
 * logo -- the persistent top bar would just be a redundant second wordmark
 * stacked above it, so it's hidden on those two routes only. `header` is
 * rendered by the (server)
 * root layout and passed in as a node rather than rendered here, so its
 * data fetching still happens in the server tree as usual. */
export default function HeaderVisibility({ header }: { header: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/signup") return null;
  return <>{header}</>;
}
