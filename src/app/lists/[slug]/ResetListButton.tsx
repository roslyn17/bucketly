"use client";

import { useTransition } from "react";
import { resetListProgress } from "@/lib/listActions";

export default function ResetListButton({ listId, listSlug }: { listId: string; listSlug: string }) {
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    const confirmed = window.confirm(
      "This will permanently remove every item you've checked off on this list. This can't be undone. Continue?",
    );
    if (!confirmed) return;
    startTransition(async () => {
      await resetListProgress(listId, listSlug);
    });
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={isPending}
      className="shrink-0 rounded-[12px] border border-line-strong px-4 py-2 text-sm font-semibold whitespace-nowrap text-text-2 hover:bg-surface-sunken disabled:opacity-50"
    >
      {isPending ? "Resetting..." : "Reset progress"}
    </button>
  );
}
