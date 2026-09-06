"use client";

import { useState } from "react";
import { DIFFICULTY_TIERS } from "@/lib/difficulty";
import DifficultyBadge from "@/components/DifficultyBadge";

/** Info button + modal explaining how points and levels work, opened from
 * next to the level display. Used both on the dashboard's navy progress
 * band and the public profile's white header card, so the trigger icon's
 * color adapts via `tone` -- the modal panel itself is always a white
 * popup regardless. */
export default function ScoringInfoModal({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How scoring works"
        className={tone === "dark" ? "text-brand-navy-ink hover:text-white" : "text-text-3 hover:text-text-1"}
      >
        ⓘ
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[16px] border border-line bg-surface-card p-5 shadow-[var(--shadow-card-hover)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-sm font-bold text-text-1">How scoring works</p>
            <p className="mb-4 text-sm text-text-2">
              Points are earned by completing items — harder or rarer items are worth more,
              from 1 pt (easy) up to 20 pts (very hard). Level up as you rack up points across
              all your bucket lists.
            </p>

            <ul className="divide-y divide-line text-sm">
              {DIFFICULTY_TIERS.map(({ tier, points }) => (
                <li key={tier} className="flex items-center justify-between py-1.5">
                  <DifficultyBadge tier={tier} />
                  <span className="font-semibold text-text-1">
                    {points} pt{points === 1 ? "" : "s"}/item
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-[10px] bg-brand-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-coral-hover"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
