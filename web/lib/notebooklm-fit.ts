/**
 * Fit-to-width for wide tables, display equations and code blocks.
 *
 * Preview panes and A4 pages have a fixed content width, but KaTeX
 * equations and wide tables don't wrap — they overflow and get clipped
 * in the PDF. This shrinks each overflowing element's font-size just
 * enough to fit (KaTeX scales with font-size, so equations stay crisp).
 * Runs on the live preview AND inside the print iframe, so WYSIWYG holds.
 */
export function fitNotebookLmContent(container: HTMLElement): void {
  const avail = container.clientWidth;
  if (!avail) return;

  const els = container.querySelectorAll("table, .nlm-display, pre");
  els.forEach((node) => {
    const el = node as HTMLElement;
    try {
      // Reset for idempotent re-runs (resize, re-render, font load).
      el.style.fontSize = "";
      const view = el.ownerDocument.defaultView;
      if (!view) return;
      // Two passes: shrinking can re-wrap content, so re-measure once.
      for (let pass = 0; pass < 2; pass++) {
        const natural = el.scrollWidth;
        if (natural <= avail + 1) break;
        const base = parseFloat(view.getComputedStyle(el).fontSize) || 16;
        const scale = avail / natural;
        // Don't shrink below ~45% — beyond that it becomes unreadable;
        // the element keeps overflow-x: auto in the preview instead.
        if (scale < 0.45) break;
        el.style.fontSize = `${base * scale}px`;
      }
    } catch {
      // Measurement can fail on detached/hidden nodes — leave them alone.
    }
  });
}
