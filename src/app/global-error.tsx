"use client";

// global-error replaces the entire root layout when it renders, so none of
// layout.tsx's setup (fonts, <HeaderVisibility>, etc.) carries over -- it
// has to bring its own <html>/<body> and its own styles. Re-importing
// globals.css here (same pattern Next's own global-not-found.tsx example
// uses) is enough to get the brand color tokens and Tailwind utilities;
// it's just missing the custom fonts, which isn't worth the extra
// next/font setup for a page this rare.
import "./globals.css";

/** Catches errors thrown by the root layout itself -- much rarer than the
 * page/segment errors error.tsx handles, since layout.tsx doesn't do much
 * beyond rendering the header and fonts. Uses `retry`, not `reset` -- see
 * error.tsx's comment on why. */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-page px-4 text-center font-sans">
        <h1 className="text-2xl font-extrabold text-text-1">Something went wrong</h1>
        <p className="max-w-sm text-sm text-text-2">
          An unexpected error occurred. Try again, or come back later if it keeps happening.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-[11px] bg-brand-coral px-4 py-2 text-sm font-semibold text-white hover:bg-brand-coral-hover"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
