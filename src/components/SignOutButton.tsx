"use client";

import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // A full page navigation, not router.push -- this tears down every
    // client-side cache, including Next's Router Cache for other pages
    // visited earlier in the tab (e.g. a specific bucket list). A soft
    // navigation only refreshes the page you land on, so a page you'd
    // checked items off on could still be served from that stale client
    // cache after logging back in, even though the server-side data is
    // fine the whole time.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm font-medium text-text-2 hover:text-text-1"
    >
      Sign out
    </button>
  );
}
