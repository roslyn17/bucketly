"use client";

import { useEffect, useState, useTransition } from "react";
import { updateProfileVisibility } from "@/lib/profileActions";
import { generateProfileSnapshot } from "@/lib/shareSnapshot";

/** The "Make my profile public" toggle and the "Share" snapshot button,
 * combined into one component (they live right next to each other, and the
 * Share button needs to know the toggle's current state -- including a
 * toggle flipped this render, before any server revalidation lands).
 * `tone` picks the outer control colors for whichever card it's dropped
 * into -- the share preview popup itself is always a white overlay
 * regardless, same as ScoringInfoModal's panel. */
export default function ProfileSharingControls({
  tone = "dark",
  initialIsPublic,
  displayName,
  avatarUrl,
  levelName,
  totalPoints,
  totalVisited,
  totalListsTracked,
}: {
  tone?: "light" | "dark";
  initialIsPublic: boolean;
  /** The raw stored display_name -- null if never set. This doubles as the
   * public URL's handle, so sharing/going public both require it. */
  displayName: string | null;
  avatarUrl: string | null;
  levelName: string;
  totalPoints: number;
  totalVisited: number;
  totalListsTracked: number;
}) {
  const isDark = tone === "dark";
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
  // Works whether or not the profile is public -- downloading the card
  // doesn't require anyone else to be able to reach the profile link, only
  // that there's a name to put on the card.
  async function handleShare() {
    setShareError(null);

    if (!displayName || !publicPath) {
      setShareError("Set a display name above first -- it's used on your card.");
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
        totalListsTracked,
        publicUrl: `bucketly.app${publicPath}`,
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
    a.download = "bucketly-profile.png";
    a.click();
  }

  async function handleNativeShare() {
    if (!preview) return;
    const file = new File([preview.blob], "bucketly-profile.png", { type: "image/png" });

    // Only include the link if it'll actually resolve -- a private profile's
    // /u/[name] page just says "this profile is private" right now.
    const absoluteUrl =
      isPublic && publicPath && typeof window !== "undefined" ? `${window.location.origin}${publicPath}` : null;
    const text = absoluteUrl
      ? `Check out my Bucketly profile 🌍 ${absoluteUrl}`
      : `Check out my Bucketly profile 🌍`;

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Bucketly profile", text });
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
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={handleToggle}
            disabled={pending}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              isPublic ? "bg-brand-teal" : isDark ? "bg-brand-navy-3" : "bg-surface-sunken"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                isPublic ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-sm ${isDark ? "text-brand-navy-ink" : "text-text-2"}`}>
            Make my profile public
          </span>
        </label>
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className={`rounded-[10px] border px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
            isDark
              ? "border-brand-navy-3 text-white hover:bg-brand-navy-2"
              : "border-line-strong text-text-2 hover:bg-surface-sunken"
          }`}
        >
          {sharing ? "Generating..." : "Share"}
        </button>
      </div>

      {toggleError && <p className={`text-xs ${isDark ? "text-red-300" : "text-red-600"}`}>{toggleError}</p>}
      {shareError && <p className={`text-xs ${isDark ? "text-red-300" : "text-red-600"}`}>{shareError}</p>}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closePreview}
        >
          <div
            className="flex max-h-full w-full max-w-lg flex-col items-center gap-4 overflow-y-auto rounded-[20px] bg-surface-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ephemeral client-generated blob, not a Next-optimizable asset */}
            <img
              src={preview.url}
              alt="Your shareable profile card"
              className="aspect-square w-full rounded-[16px] object-cover"
            />
            <div className="flex w-full flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="rounded-[10px] bg-brand-coral px-4 py-2 text-sm font-semibold text-white hover:bg-brand-coral-hover"
              >
                Share
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-[10px] border border-line-strong px-4 py-2 text-sm font-semibold text-text-2 hover:bg-surface-sunken"
              >
                Download
              </button>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-[10px] px-4 py-2 text-sm font-semibold text-text-3 hover:bg-surface-sunken"
              >
                Close
              </button>
            </div>

            {publicPath && (
              <div className="w-full border-t border-line pt-4">
                {isPublic ? (
                  <>
                    <p className="mb-2 text-center text-xs text-text-3">Or share your profile link</p>
                    <div className="flex w-full gap-2 rounded-[12px] bg-surface-page p-2">
                      <input
                        type="text"
                        readOnly
                        value={
                          typeof window !== "undefined" ? `${window.location.origin}${publicPath}` : publicPath
                        }
                        onFocus={(e) => e.target.select()}
                        className="min-w-0 flex-1 rounded-[10px] border border-line bg-surface-card px-3 py-1.5 text-sm text-text-2"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="shrink-0 rounded-[10px] border border-line-strong px-3 py-1.5 text-sm font-semibold text-text-2 hover:bg-surface-card"
                      >
                        {linkCopied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="mb-2 text-xs text-text-3">
                      Your profile is private -- make it public to get a link others can open.
                    </p>
                    <button
                      type="button"
                      onClick={handleToggle}
                      disabled={pending}
                      className="rounded-[10px] border border-line-strong px-3 py-1.5 text-sm font-semibold text-text-2 hover:bg-surface-sunken disabled:opacity-50"
                    >
                      {pending ? "Making public..." : "Make my profile public"}
                    </button>
                    {toggleError && <p className="mt-2 text-xs text-red-600">{toggleError}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
