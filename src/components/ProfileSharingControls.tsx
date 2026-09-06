"use client";

import { useEffect, useState, useTransition } from "react";
import { updateProfileVisibility } from "@/lib/profileActions";
import { generateProfileSnapshot } from "@/lib/shareSnapshot";

/** The "Make my profile public" toggle and the "Share" snapshot button,
 * combined into one component (they live right next to each other, and the
 * Share button needs to know the toggle's current state -- including a
 * toggle flipped this render, before any server revalidation lands). */
export default function ProfileSharingControls({
  initialIsPublic,
  displayName,
  avatarUrl,
  levelName,
  totalPoints,
  totalVisited,
}: {
  initialIsPublic: boolean;
  /** The raw stored display_name -- null if never set. This doubles as the
   * public URL's handle, so sharing/going public both require it. */
  displayName: string | null;
  avatarUrl: string | null;
  levelName: string;
  totalPoints: number;
  totalVisited: number;
}) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [pending, startTransition] = useTransition();
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const publicPath = displayName ? `/u/${encodeURIComponent(displayName)}` : null;

  // The preview holds an object URL -- revoke it once it's no longer shown
  // (either the card closes or a fresh one replaces it), so blobs don't pile
  // up across repeated shares.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function handleToggle() {
    const next = !isPublic;
    setToggleError(null);

    if (next && !displayName) {
      setToggleError("Set a display name above first -- it's used as your public profile's URL.");
      return;
    }

    setIsPublic(next);
    startTransition(async () => {
      try {
        await updateProfileVisibility(next);
      } catch (err) {
        setIsPublic(!next);
        setToggleError(err instanceof Error ? err.message : "Couldn't update sharing setting.");
      }
    });
  }

  // "Share" generates the card and shows it in a preview overlay -- actually
  // sharing/downloading it is a separate step the user takes from there,
  // rather than firing the OS share sheet (or a silent download) immediately.
  async function handleShare() {
    setShareError(null);

    if (!isPublic || !displayName || !publicPath) {
      setShareError("Make your profile public first -- otherwise the link on the card won't lead anywhere.");
      return;
    }

    setSharing(true);
    try {
      const blob = await generateProfileSnapshot({
        name: displayName,
        avatarUrl,
        levelName,
        totalPoints,
        totalVisited,
        publicUrl: `travelbucketlist.app${publicPath}`,
      });
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { blob, url: URL.createObjectURL(blob) };
      });
    } catch {
      setShareError("Couldn't generate the share image. Please try again.");
    } finally {
      setSharing(false);
    }
  }

  function closePreview() {
    setPreview(null);
    setLinkCopied(false);
  }

  function handleDownload() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = "travel-bucket-list-profile.png";
    a.click();
  }

  async function handleNativeShare() {
    if (!preview) return;
    const file = new File([preview.blob], "travel-bucket-list-profile.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Travel Bucket List" });
      } else {
        handleDownload();
      }
    } catch (err) {
      // A cancelled share sheet isn't a real failure.
      if (err instanceof Error && err.name !== "AbortError") {
        setShareError("Couldn't share the image. Please try again.");
      }
    }
  }

  async function handleCopyLink() {
    if (!publicPath) return;
    const absoluteUrl = `${window.location.origin}${publicPath}`;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setShareError("Couldn't copy the link. Please try again.");
    }
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-2 sm:items-start">
      <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={isPublic}
            disabled={pending}
            onChange={handleToggle}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          Make my profile public
        </label>
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          {sharing ? "Generating..." : "Share"}
        </button>
      </div>

      {isPublic && publicPath && (
        <p className="text-xs text-zinc-500">
          Public at{" "}
          <a href={publicPath} target="_blank" rel="noopener noreferrer" className="underline">
            {publicPath}
          </a>
        </p>
      )}
      {toggleError && <p className="text-xs text-red-600 dark:text-red-400">{toggleError}</p>}
      {shareError && <p className="text-xs text-red-600 dark:text-red-400">{shareError}</p>}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closePreview}
        >
          <div
            className="flex max-h-full w-full max-w-lg flex-col items-center gap-4 overflow-y-auto rounded-lg bg-white p-4 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ephemeral client-generated blob, not a Next-optimizable asset */}
            <img
              src={preview.url}
              alt="Your shareable profile card"
              className="aspect-square w-full rounded-md object-cover"
            />
            <div className="flex w-full flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Share
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Download
              </button>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-md px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>

            {publicPath && (
              <div className="w-full border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <p className="mb-2 text-center text-xs text-zinc-500">Or share your profile link</p>
                <div className="flex w-full gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}${publicPath}` : publicPath}
                    onFocus={(e) => e.target.select()}
                    className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {linkCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
