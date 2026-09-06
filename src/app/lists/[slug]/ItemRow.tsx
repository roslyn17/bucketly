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
    <li className="py-3">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <input
            key={checkEffect}
            type="checkbox"
            checked={visited}
            disabled={isPending}
            onChange={(e) => toggleVisited(e.target.checked)}
            className={`h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 ${checkEffect > 0 && visited ? "checkbox-pop" : ""}`}
          />
          {checkEffect > 0 && visited && (
            <span
              key={checkEffect}
              aria-hidden="true"
              className="points-pop pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
            >
              +{points}
            </span>
          )}
        </div>
        <div className="flex-1">
          {item.metadata?.team ? (
            <>
              <div className={visited ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-300"}>
                {item.metadata.team} — {item.name}
                <span className="ml-2 text-xs text-zinc-400">
                  {points} pt{points === 1 ? "" : "s"}
                </span>
              </div>
              {item.metadata.city && (
                <div className="text-xs text-zinc-400">{item.metadata.city}</div>
              )}
            </>
          ) : (
            <span className={visited ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-300"}>
              {item.name}
              {(item.metadata?.state ?? item.metadata?.location) && (
                <span className="ml-2 text-xs text-zinc-400">
                  {item.metadata.state ?? item.metadata.location}
                </span>
              )}
              <span className="ml-2 text-xs text-zinc-400">
                {points} pt{points === 1 ? "" : "s"}
              </span>
            </span>
          )}
        </div>
        {visited && !editingDate && (
          <button
            onClick={() => setEditingDate(true)}
            className="text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            {savedDateLabel ?? "Add date"}
          </button>
        )}
      </div>

      {visited && editingDate && (
        <div className="mt-2 ml-7 flex flex-wrap items-center gap-2">
          <input
            type="number"
            placeholder="Year"
            value={year}
            min={1900}
            max={CURRENT_YEAR}
            onChange={(e) => setYear(e.target.value)}
            className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          />
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              if (!e.target.value) setDay("");
            }}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
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
            className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          />

          <button
            onClick={saveDate}
            disabled={isPending || !year}
            className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Save
          </button>
          {progress?.visited_on && (
            <button
              onClick={clearDate}
              disabled={isPending}
              className="text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setEditingDate(false)}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
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
