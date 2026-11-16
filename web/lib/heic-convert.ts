// On-device HEIC/HEIF → JPEG conversion for browsers without native HEIC decode.
// The WASM decoder (~3MB) is lazy-loaded on first HEIC only — never for other files.

export const HEIC_MAX_EDGE = 2048;

/** Decode a HEIC blob to JPEG, downscaling the long edge to `maxEdge`. */
export async function convertHeicToJpeg(
  input: Blob,
  maxEdge = HEIC_MAX_EDGE,
  quality = 0.85
): Promise<Blob> {
  const { heicTo } = await import("heic-to");
  const decoded = await heicTo({ blob: input, type: "image/jpeg", quality: 0.92 });
  const bmp = await createImageBitmap(decoded);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    if (scale >= 1) return decoded;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return decoded;
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", quality)
    );
    return out ?? decoded;
  } finally {
    bmp.close();
  }
}

/** Run async jobs with at most `limit` in flight. */
export async function runPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let i = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (i < items.length) {
        const item = items[i++];
        await fn(item);
      }
    }
  );
  await Promise.all(workers);
}
