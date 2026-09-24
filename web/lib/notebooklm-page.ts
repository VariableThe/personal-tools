/**
 * Page-setup options for the PDF export (size / orientation / margins).
 * A4 portrait stays the default; wider geometries (landscape, A3, narrow
 * margins) give wide tables and long equations more room.
 */

export const PAGE_SIZES = {
  A4: { label: "A4", widthMm: 210, heightMm: 297 },
  Letter: { label: "Letter", widthMm: 215.9, heightMm: 279.4 },
  Legal: { label: "Legal", widthMm: 215.9, heightMm: 355.6 },
  A3: { label: "A3", widthMm: 297, heightMm: 420 },
} as const;
export type PageSizeId = keyof typeof PAGE_SIZES;

export const ORIENTATIONS = {
  portrait: { label: "Portrait" },
  landscape: { label: "Landscape" },
} as const;
export type OrientationId = keyof typeof ORIENTATIONS;

export const MARGIN_PRESETS = {
  normal: { label: "Normal margins", verticalMm: 18, sideMm: 15 },
  narrow: { label: "Narrow margins", verticalMm: 12, sideMm: 10 },
  minimal: { label: "Minimal margins", verticalMm: 8, sideMm: 6 },
} as const;
export type MarginId = keyof typeof MARGIN_PRESETS;

/** Content width in mm for the chosen geometry (what fit-to-width targets). */
export function contentWidthMm(size: PageSizeId, orientation: OrientationId, margins: MarginId): number {
  const s = PAGE_SIZES[size];
  const m = MARGIN_PRESETS[margins];
  const width = orientation === "landscape" ? s.heightMm : s.widthMm;
  return width - m.sideMm * 2;
}

export function buildPageCss(size: PageSizeId, orientation: OrientationId, margins: MarginId): string {
  const s = PAGE_SIZES[size];
  const m = MARGIN_PRESETS[margins];
  const w = orientation === "landscape" ? s.heightMm : s.widthMm;
  const h = orientation === "landscape" ? s.widthMm : s.heightMm;
  return `@page { size: ${w}mm ${h}mm; margin: ${m.verticalMm}mm ${m.sideMm}mm ${m.verticalMm}mm ${m.sideMm}mm; }`;
}
