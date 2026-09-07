"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

/** Catches uncaught errors anywhere under the root layout (a failed data
 * fetch, a thrown query error, etc.). Errors in the root layout itself skip
 * this and hit global-error.tsx instead, since a broken layout can't render
 * this page's chrome around itself.
 *
 * Uses `retry`, not `reset` -- this Next.js version (16.3+) split the two:
 * `retry()` re-fetches and re-renders the failed segment, while `reset()`
 * just clears the error and re-renders without re-fetching. For a page that
 * failed because a data fetch threw, retry is the one that can actually
 * fix it. */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <Image src="/bucketly-lockup.png" alt="Bucketly" width={100} height={99} />
      <h1 className="font-display text-2xl font-extrabold text-text-1">Something went wrong</h1>
      <p className="max-w-sm text-sm text-text-2">
        An unexpected error occurred. Try again, or come back later if it keeps happening.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-[11px] bg-brand-coral px-4 py-2 text-sm font-semibold text-white hover:bg-brand-coral-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-[11px] border border-line-strong px-4 py-2 text-sm font-semibold text-text-2 hover:bg-surface-sunken"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
