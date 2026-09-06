import { getAvatarColorHex, getInitials } from "@/lib/avatarDisplay";

export type SnapshotOptions = {
  name: string;
  avatarUrl: string | null;
  levelName: string;
  totalPoints: number;
  totalVisited: number;
  /** Lists currently tracked (added), not lists *completed* -- matches the
   * dashboard progress band's "tracking" stat. Kept separate from
   * totalVisited/totalPoints since it's a newer addition to the card. */
  totalListsTracked: number;
  /** Display string for the footer, e.g. "bucketly.app/u/Jane". */
  publicUrl: string;
};

const SIZE = 1080;

/**
 * Draws a 1080x1080 shareable "teaser" snapshot of a profile onto a canvas
 * and returns it as a PNG blob. Deliberately excludes list-level detail
 * (names, progress bars) -- that's what the linked public profile is for.
 * Client-only (uses `document`/`Image`); call from a "use client" component.
 */
export async function generateProfileSnapshot(opts: SnapshotOptions): Promise<Blob> {
  // Nunito is used for headings/numbers below -- make sure it's actually
  // loaded before drawing, or a first-ever share click could rasterize the
  // fallback font instead (next/font injects the @font-face, but the file
  // itself loads async).
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser.");

  ctx.textAlign = "center";

  // Navy background with a soft tonal circle bleeding off the top-right.
  ctx.fillStyle = "#1B2559";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.beginPath();
  ctx.arc(SIZE * 0.88, SIZE * 0.04, 260, 0, Math.PI * 2);
  ctx.fillStyle = "#232E5C";
  ctx.fill();

  // Brand mark + wordmark ("bucket" white, "ly" teal).
  try {
    const mark = await loadImage("/bucketly-mark.png");
    const markSize = 40;
    ctx.font = "800 34px Nunito, sans-serif";
    const bucketWidth = ctx.measureText("bucket").width;
    const lyWidth = ctx.measureText("ly").width;
    const wordmarkStart = SIZE / 2 - (bucketWidth + lyWidth) / 2;
    const markX = wordmarkStart - markSize - 12;
    ctx.drawImage(mark, markX, 90 - markSize / 2, markSize, markSize);
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("bucket", wordmarkStart, 100);
    ctx.fillStyle = "#2FC4D6";
    ctx.fillText("ly", wordmarkStart + bucketWidth, 100);
    ctx.textAlign = "center";
  } catch {
    // Mark image failed to load (offline, etc.) -- fall back to text-only.
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "600 32px Nunito, sans-serif";
    ctx.fillText("bucketly", SIZE / 2, 100);
  }

  // Avatar.
  const avatarSize = 240;
  const avatarTop = 190;
  const cx = SIZE / 2;
  const cy = avatarTop + avatarSize / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  let drewImage = false;
  if (opts.avatarUrl) {
    try {
      const img = await loadImage(opts.avatarUrl);
      ctx.drawImage(img, cx - avatarSize / 2, cy - avatarSize / 2, avatarSize, avatarSize);
      drewImage = true;
    } catch {
      // Network hiccup, CORS-tainted source, whatever -- fall back to
      // initials below rather than failing the whole snapshot.
    }
  }
  if (!drewImage) {
    const { bg: avatarBg, fg } = getAvatarColorHex(opts.name);
    ctx.fillStyle = avatarBg;
    ctx.fillRect(cx - avatarSize / 2, cy - avatarSize / 2, avatarSize, avatarSize);
    ctx.fillStyle = fg;
    ctx.font = "800 96px Nunito, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(getInitials(opts.name), cx, cy + 4);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  // Name.
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 52px Nunito, sans-serif";
  ctx.fillText(opts.name, cx, avatarTop + avatarSize + 70);

  // Level pill (yellow, navy text).
  const chipLabel = opts.levelName.toUpperCase();
  ctx.font = "800 24px Nunito, sans-serif";
  const chipPaddingX = 26;
  const chipWidth = ctx.measureText(chipLabel).width + chipPaddingX * 2;
  const chipHeight = 50;
  const chipTop = avatarTop + avatarSize + 100;
  roundRect(ctx, cx - chipWidth / 2, chipTop, chipWidth, chipHeight, chipHeight / 2);
  ctx.fillStyle = "#F9C63C";
  ctx.fill();
  ctx.fillStyle = "#1B2559";
  ctx.textBaseline = "middle";
  ctx.fillText(chipLabel, cx, chipTop + chipHeight / 2 + 2);
  ctx.textBaseline = "alphabetic";

  // Stats row -- points (teal), items completed (yellow), lists tracked
  // (white).
  const statsY = chipTop + chipHeight + 90;
  drawStat(ctx, cx - 220, statsY, String(opts.totalPoints), "points", "#2FC4D6");
  drawStat(ctx, cx, statsY, String(opts.totalVisited), "items done", "#F9C63C");
  drawStat(ctx, cx + 220, statsY, String(opts.totalListsTracked), "lists", "#ffffff");

  // Divider + footer.
  ctx.strokeStyle = "#2E3968";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SIZE * 0.2, SIZE - 150);
  ctx.lineTo(SIZE * 0.8, SIZE - 150);
  ctx.stroke();

  ctx.fillStyle = "#A6AECF";
  ctx.font = "500 24px 'DM Sans', sans-serif";
  ctx.fillText("See the full profile", cx, SIZE - 100);
  ctx.fillStyle = "#e4e4e7";
  ctx.font = "700 28px Nunito, sans-serif";
  ctx.fillText(opts.publicUrl, cx, SIZE - 60);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Couldn't generate the image."));
    }, "image/png");
  });
}

function drawStat(ctx: CanvasRenderingContext2D, x: number, y: number, value: string, label: string, color: string) {
  ctx.fillStyle = color;
  ctx.font = "800 46px Nunito, sans-serif";
  ctx.fillText(value, x, y);
  ctx.fillStyle = "#A6AECF";
  ctx.font = "500 22px 'DM Sans', sans-serif";
  ctx.fillText(label, x, y + 36);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
