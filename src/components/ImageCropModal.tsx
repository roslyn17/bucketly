"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { getCroppedImageBlob } from "@/lib/cropImage";

/** Full-screen modal for cropping a locally-selected image into a square
 * avatar before it's uploaded. `onSave` receives the cropped PNG blob and
 * should throw on failure (the modal surfaces the error and stays open so
 * the user can retry); on success it's expected to close the modal. */
export default function ImageCropModal({
  imageSrc,
  onCancel,
  onSave,
}: {
  imageSrc: string;
  onCancel: () => void;
  onSave: (blob: Blob) => void | Promise<void>;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      await onSave(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save photo. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-[16px] border border-line bg-surface-card p-4 shadow-[var(--shadow-card-hover)]">
        <p className="mb-3 text-sm font-bold text-text-1">Adjust your photo</p>

        <div className="relative h-64 w-full overflow-hidden rounded-[10px] bg-surface-sunken">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <label className="mt-4 flex items-center gap-3 text-xs text-text-2">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
        </label>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-[10px] px-3 py-1.5 text-sm text-text-2 hover:bg-surface-sunken disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !croppedAreaPixels}
            className="rounded-[10px] bg-brand-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-coral-hover disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
