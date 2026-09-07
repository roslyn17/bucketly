"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarUrl } from "@/lib/profileActions";
import ImageCropModal from "@/components/ImageCropModal";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function AvatarPicker({
  initialAvatarUrl,
}: {
  initialAvatarUrl: string | null;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please choose a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setError(null);
    setOpen(false);
    setCropImageSrc(URL.createObjectURL(file));
  }

  function closeCropModal() {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
  }

  async function handleCropSave(blob: Blob) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in.");

    const path = `${user.id}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { contentType: "image/png" });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    await updateAvatarUrl(publicUrl);
    setAvatarUrl(publicUrl);
    closeCropModal();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full border border-white/20 bg-brand-navy-2"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="Your avatar" fill sizes="76px" className="object-cover" unoptimized />
        ) : (
          <DefaultAvatarIcon />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          Change
        </span>
      </button>

      {open && (
        <>
          {/* Click-away layer */}
          <button
            type="button"
            aria-label="Close avatar picker"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-20 mt-2 w-64 rounded-[10px] border border-line bg-surface-card p-4 shadow-[var(--shadow-card-hover)]">
            <p className="mb-2 text-xs font-bold tracking-wide text-text-3 uppercase">Upload a photo</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-[10px] border border-dashed border-line-strong px-3 py-2 text-sm text-text-2 hover:bg-surface-sunken"
            >
              Choose an image...
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />

            {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
          </div>
        </>
      )}

      {cropImageSrc && (
        <ImageCropModal imageSrc={cropImageSrc} onCancel={closeCropModal} onSave={handleCropSave} />
      )}
    </div>
  );
}

function DefaultAvatarIcon() {
  return (
    <svg viewBox="0 0 80 80" className="h-full w-full text-brand-navy-ink" fill="currentColor" aria-hidden="true">
      <circle cx="40" cy="30" r="14" />
      <path d="M12 72c0-15.5 12.5-26 28-26s28 10.5 28 26" />
    </svg>
  );
}
