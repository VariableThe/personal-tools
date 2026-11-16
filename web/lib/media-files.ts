// Shared on-device media intake: images + videos picked from disk, with
// HEIC/HEIF preview support for browsers without native HEIC decode.
// The ORIGINAL File is always preserved (for faithful export); only the
// preview URL may point at an on-device JPEG conversion.

import { convertHeicToJpeg, runPool } from "@/lib/heic-convert";

export interface MediaItem {
  id: string;
  /** Original file bytes — what gets exported. Never a conversion. */
  file: File;
  kind: "image" | "video";
  /** Renderable URL: original object URL, or converted-JPEG URL for HEIC. */
  previewUrl: string;
  name: string;
  size: number;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const HEIC_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);
const HEIC_EXT = /\.(heic|heif|hif)$/i;
const VIDEO_EXT = /\.(mp4|m4v|mov|webm|ogv)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i;

function blankType(t: string): boolean {
  return t === "" || t === "application/octet-stream";
}

export function looksHeic(name: string, type: string): boolean {
  return HEIC_TYPES.has(type) || (blankType(type) && HEIC_EXT.test(name));
}

/** True when this browser can natively decode the image at url. */
export function canDecodeImage(url: string, timeoutMs = 9000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.src = "";
      resolve(false);
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img.naturalWidth > 0);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

export interface IntakeResult {
  items: MediaItem[];
  failed: string[];
  skipped: string[];
}

/**
 * Turn picked Files into preview-ready MediaItems. Fast batch (video +
 * natively-decodable images) resolves first; HEIC conversions stream in
 * after via `onHeicItem`. All work stays on-device.
 */
export async function buildMediaItems(
  files: FileList | File[],
  onHeicItem: (item: MediaItem) => void,
  onHeicProgress?: (done: number, total: number) => void
): Promise<IntakeResult> {
  const list = Array.from(files);
  const items: MediaItem[] = [];
  const heicQueue: { f: File; url: string }[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const f of list) {
    const t = f.type.toLowerCase();
    const isHeic = looksHeic(f.name, t);
    const isVideo =
      t.startsWith("video/") || (blankType(t) && VIDEO_EXT.test(f.name) && !isHeic);
    const isImage =
      (t.startsWith("image/") && !HEIC_TYPES.has(t)) ||
      (blankType(t) && IMAGE_EXT.test(f.name));
    const url = URL.createObjectURL(f);
    if (isVideo) {
      items.push({ id: uid(), file: f, kind: "video", previewUrl: url, name: f.name, size: f.size });
    } else if (isHeic) {
      heicQueue.push({ f, url });
    } else if (isImage) {
      items.push({ id: uid(), file: f, kind: "image", previewUrl: url, name: f.name, size: f.size });
    } else {
      URL.revokeObjectURL(url);
      skipped.push(f.name);
    }
  }

  if (heicQueue.length > 0) {
    let done = 0;
    onHeicProgress?.(0, heicQueue.length);
    await runPool(heicQueue, 3, async ({ f, url }) => {
      try {
        if (await canDecodeImage(url, 8000)) {
          onHeicItem({ id: uid(), file: f, kind: "image", previewUrl: url, name: f.name, size: f.size });
        } else {
          const jpeg = await convertHeicToJpeg(f);
          URL.revokeObjectURL(url);
          onHeicItem({
            id: uid(),
            file: f,
            kind: "image",
            previewUrl: URL.createObjectURL(jpeg),
            name: f.name,
            size: f.size,
          });
        }
      } catch {
        URL.revokeObjectURL(url);
        failed.push(f.name);
      } finally {
        done += 1;
        onHeicProgress?.(done, heicQueue.length);
      }
    });
  }

  return { items, failed, skipped };
}

/** Revoke every preview URL held by items (call on reset/unmount). */
export function revokeItems(items: MediaItem[]) {
  for (const it of items) {
    try {
      URL.revokeObjectURL(it.previewUrl);
    } catch {
      // already revoked — harmless
    }
  }
}
