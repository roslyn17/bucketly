import Link from "next/link";
import Image from "next/image";

/** Next's fallback for any unmatched route, and for notFound() calls (e.g.
 * a list slug that doesn't exist). "/" rather than "/dashboard" so this
 * doesn't need to know whether the visitor is signed in -- the root page
 * already redirects to /dashboard or /login as appropriate. */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <Image src="/bucketly-lockup.png" alt="Bucketly" width={100} height={99} />
      <h1 className="font-display text-2xl font-extrabold text-text-1">Page not found</h1>
      <p className="max-w-sm text-sm text-text-2">
        The page you&apos;re looking for doesn&apos;t exist, or may have moved.
      </p>
      <Link
        href="/"
        className="rounded-[11px] bg-brand-coral px-4 py-2 text-sm font-semibold text-white hover:bg-brand-coral-hover"
      >
        ← Back to Bucketly
      </Link>
    </div>
  );
}
