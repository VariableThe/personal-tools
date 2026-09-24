/**
 * Renders normalized NotebookLM Markdown (with $...$ / $$...$$ math)
 * to sanitized HTML for the live preview and the PDF export.
 *
 * Everything runs locally: marked (Markdown) + KaTeX (math) + DOMPurify.
 */
import { marked } from "marked";
import katex from "katex";
import DOMPurify from "dompurify";

export interface RenderResult {
  html: string;
  mathErrors: string[];
}

const DISP_PH = "@@NLMDISP";
const INL_PH = "@@NLMINL";

export function renderNotebookLmHtml(normalizedMarkdown: string): RenderResult {
  const mathErrors: string[] = [];
  if (!normalizedMarkdown.trim()) return { html: "", mathErrors };

  // 1. Pull display math out (so the Markdown parser never touches it).
  const displaySegs: string[] = [];
  let work = normalizedMarkdown.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
    displaySegs.push(String(inner).trim());
    return `\n\n${DISP_PH}${displaySegs.length - 1}@\n\n`;
  });

  // 2. Pull inline math out ("\$" is a literal dollar, never a delimiter).
  const inlineSegs: string[] = [];
  work = work.replace(/(?<!\$)(?<!\\)\$(?!\$|\s)([^$\n]*?)(?<!\s)(?<!\\)\$(?!\$|\d)/g, (_, inner) => {
    inlineSegs.push(String(inner));
    return `${INL_PH}${inlineSegs.length - 1}@`;
  });

  // 3. Markdown -> HTML (GFM: tables, strikethrough, fenced code).
  let html: string;
  try {
    html = marked.parse(work, { async: false }) as unknown as string;
  } catch (err) {
    return {
      html: `<p class="nlm-render-error">Could not parse Markdown: ${escapeHtml(
        err instanceof Error ? err.message : String(err)
      )}</p>`,
      mathErrors: ["Markdown parse failed — the preview shows the error above."],
    };
  }

  // 4. Restore display math (tolerating a wrapping <p> from the parser).
  html = html.replace(/(?:<p>)?@@NLMDISP(\d+)@(?:<\/p>)?/g, (_, i) => {
    const tex = displaySegs[Number(i)] ?? "";
    try {
      return `<div class="nlm-display">${katex.renderToString(tex, {
        displayMode: true,
        throwOnError: true,
        strict: false,
        trust: false,
      })}</div>`;
    } catch (err) {
      mathErrors.push(
        `Display equation #${Number(i) + 1} failed to render (${err instanceof Error ? err.message : String(err)}). Check its LaTeX syntax.`
      );
      return `<pre class="nlm-math-error">$$${escapeHtml(tex)}$$</pre>`;
    }
  });

  // 5. Restore inline math.
  html = html.replace(/@@NLMINL(\d+)@/g, (_, i) => {
    const tex = inlineSegs[Number(i)] ?? "";
    try {
      return katex.renderToString(tex, {
        displayMode: false,
        throwOnError: true,
        strict: false,
        trust: false,
      });
    } catch (err) {
      mathErrors.push(
        `Inline equation #${Number(i) + 1} failed to render (${err instanceof Error ? err.message : String(err)}). Check its LaTeX syntax.`
      );
      return `<code class="nlm-math-error-inline">$${escapeHtml(tex)}$</code>`;
    }
  });

  // 6. Sanitize (client only — during SSR return the raw HTML; the
  // preview mounts client-side and re-renders with sanitization).
  if (typeof window !== "undefined") {
    html = DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel"] });
  }

  return { html, mathErrors };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
