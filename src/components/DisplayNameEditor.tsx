"use client";

import { useState } from "react";
import { updateDisplayName } from "@/lib/profileActions";

const MAX_LENGTH = 40;

/** Shows the user's display name with a hover-revealed "Edit" control that
 * swaps in a text input. Saving an empty value clears the name, falling
 * back to `fallbackName` (the local part of their email) elsewhere. Styled
 * as a small muted label -- it's the header line above the big points
 * number, not the focal point of the navy progress band, so it stays
 * deliberately understated. It's the only place this renders. */
export default function DisplayNameEditor({
  initialName,
  fallbackName,
}: {
  initialName: string | null;
  fallbackName: string;
}) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await updateDisplayName(value);
      setName(value.trim() || null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save name. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setValue(name ?? "");
    setError(null);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col items-start gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          placeholder={fallbackName}
          maxLength={MAX_LENGTH}
          autoFocus
          disabled={busy}
          className="rounded-md border border-brand-navy-3 bg-brand-navy-2 px-2 py-1 text-sm font-semibold text-white placeholder:text-brand-navy-ink focus:border-brand-teal focus:outline-none disabled:opacity-50"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="text-xs font-semibold text-white underline disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={busy}
            className="text-xs text-brand-navy-ink underline disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <p className="text-sm font-semibold tracking-[.01em] text-brand-navy-ink">{name || fallbackName}</p>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-[11px] text-brand-navy-ink underline opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
      >
        Edit
      </button>
    </div>
  );
}
