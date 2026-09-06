"use client";

import { useState, useTransition } from "react";
import type { DatePrecision, ListItem, UserProgress } from "@/lib/types";
import { formatVisitedDate } from "@/lib/date";
import { clearVisitedDate, setVisited, setVisitedDate } from "./actions";

const CURRENT_YEAR = new Date().getFullYear();
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ItemRow({
  listSlug,
  item,
  initialProgress,
  points,
  onToggle,
}: {
  listSlug: string;
  item: ListItem;
  initialProgress: UserProgress | null;
  points: number;
  /** Reports a check/uncheck up to the list so it can tell when every item
   * is visited (see ListItemsClient's completion celebration). */
  onToggle?: (itemId: string, visited: boolean) => void;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [editingDate, setEditingDate] = useState(false);
  const initialFields = toFields(initialProgress);
  const [year, setYear] = useState(initialFields.year);
  const [month, setMonth] = useState(initialFields.month);
  const [day, setDay] = useState(initialFields.day);
  const [isPending, startTransition] = useTransition();
  // Bumped on every check (not uncheck) to re-trigger the pop/points CSS
  // animations -- changing `key` on the animated elements restarts them.
  const [checkEffect, setCheckEffect] = useState(0);

  const visited = progress?.visited ?? false;
  const savedDateLabel =
    progress?.visited_on && progress.visited_precision
      ? formatVisitedDate(progress.visited_on, progress.visited_precision)
      : null;

  function toggleVisited(next: boolean) {
    if (next) setCheckEffect((n) => n + 1);
    onToggle?.(item.id, next);
    startTransition(async () => {
      await setVisited(item.id, listSlug, next);
      setProgress((prev) =>
        next
          ? { ...(prev ?? emptyProgress(item.id)), visited: true }
          : { ...(prev ?? emptyProgress(item.id)), visited: false, visited_on: null, visited_precision: null },
      );
      if (!next) setEditingDate(false);
    });
  }

  function saveDate() {
    if (!year) return;
    const precision: DatePrecision = day && month ? "day" : month ? "month" : "year";
    const visitedOn = `${year.padStart(4, "0")}-${(month || "01").padStart(2, "0")}-${(day || "01").padStart(2, "0")}`;

    startTransition(async () => {
      await setVisitedDate(item.id, listSlug, visitedOn, precision);
      setProgress((prev) => ({
        ...(prev ?? emptyProgress(item.id)),
        visited: true,
        visited_on: visitedOn,
        visited_precision: precision,
      }));
      setEditingDate(false);
    });
  }

  function clearDate() {
    startTransition(async () => {
      await clearVisitedDate(item.id, listSlug);
      setProgress((prev) => ({
        ...(prev ?? emptyProgress(item.id)),
        visited: true,
        visited_on: null,
        visited_precision: null,
      }));
      setYear("");
      setMonth("");
      setDay("");
      setEditingDate(false);
    });
  }

  return (
    <li
      onClick={() => !isPending && toggleVisited(!visited)}
      className="cursor-pointer px-4 py-3.5 transition-colors hover:bg-surface-page"
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <label className="relative flex h-[23px] w-[23px] cursor-pointer items-center justify-center">
            <input
              key={checkEffect}
              type="checkbox"
              checked={visited}
              disabled={isPending}
              onChange={(e) => toggleVisited(e.target.checked)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <span
              className={`pointer-events-none flex h-full w-full items-center justify-center rounded-[7px] border-2 ${
                visited ? "border-brand-teal bg-brand-teal" : "border-line-strong bg-white"
              } ${checkEffect > 0 && visited ? "checkbox-pop" : ""}`}
            >
              {visited && (
                <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true">
                  <path d="M1 5L4.5 8.5L12 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </label>
          {checkEffect > 0 && visited && (
            <span
              key={checkEffect}
              aria-hidden="true"
              className="points-pop pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 text-xs font-bold text-brand-coral"
            >
              +{points}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {item.metadata?.team ? (
            <>
              <div className="text-sm font-semibold text-text-1">
                {item.metadata.team} — {item.name}
                <span className="ml-2 text-xs font-normal text-text-3">
                  {points} pt{points === 1 ? "" : "s"}
                </span>
              </div>
              {item.metadata.city && <div className="text-xs text-text-3">{item.metadata.city}</div>}
            </>
          ) : (
            <div className="text-sm font-semibold text-text-1">
              {item.name}
              {(item.metadata?.state ?? item.metadata?.location) && (
                <span className="ml-2 text-xs font-normal text-text-3">
                  {item.metadata.state ?? item.metadata.location}
                </span>
              )}
              <span className="ml-2 text-xs font-normal text-text-3">
                {points} pt{points === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
        {visited && !editingDate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingDate(true);
            }}
            className={`shrink-0 text-xs underline ${
              savedDateLabel ? "font-semibold text-brand-teal-ink" : "text-text-3 hover:text-text-1"
            }`}
          >
            {savedDateLabel ?? "Add date"}
          </button>
        )}
      </div>

      {visited && editingDate && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2 ml-9 flex flex-wrap items-center gap-2"
        >
          <input
            type="number"
            placeholder="Year"
            value={year}
            min={1900}
            max={CURRENT_YEAR}
            onChange={(e) => setYear(e.target.value)}
            className="w-20 rounded-[10px] border border-line px-2 py-1 text-xs text-text-1"
          />
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              if (!e.target.value) setDay("");
            }}
            className="rounded-[10px] border border-line px-2 py-1 text-xs text-text-1"
          >
            <option value="">Month (optional)</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={String(i + 1).padStart(2, "0")}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Day"
            value={day}
            min={1}
            max={31}
            disabled={!month}
            onChange={(e) => setDay(e.target.value)}
            className="w-16 rounded-[10px] border border-line px-2 py-1 text-xs text-text-1 disabled:opacity-50"
          />

          <button
            onClick={saveDate}
            disabled={isPending || !year}
            className="rounded-[10px] bg-brand-coral px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
          {progress?.visited_on && (
            <button onClick={clearDate} disabled={isPending} className="text-xs text-text-3 underline hover:text-text-1">
              Clear
            </button>
          )}
          <button onClick={() => setEditingDate(false)} className="text-xs text-text-3 hover:text-text-1">
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}

function emptyProgress(listItemId: string): UserProgress {
  return {
    id: "",
    user_id: "",
    list_item_id: listItemId,
    visited: false,
    visited_on: null,
    visited_precision: null,
  };
}

/** Splits a saved visited_on/visited_precision into the Year/Month/Day
 * fields the form shows, leaving out whatever precision didn't capture. */
function toFields(progress: UserProgress | null): { year: string; month: string; day: string } {
  if (!progress?.visited_on || !progress.visited_precision) {
    return { year: "", month: "", day: "" };
  }
  const [year, month, day] = progress.visited_on.split("-");
  if (progress.visited_precision === "year") return { year, month: "", day: "" };
  if (progress.visited_precision === "month") return { year, month, day: "" };
  return { year, month, day };
}
