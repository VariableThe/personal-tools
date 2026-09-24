"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  BookOpenText,
  Upload,
  Download,
  Trash2,
  FileText,
  Copy,
  Check,
  AlertTriangle,
  CircleAlert,
  Printer,
  FlaskConical,
  Info,
} from "lucide-react";
import "katex/dist/katex.min.css";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeNotebookLmMarkdown } from "@/lib/notebooklm-latex";
import { renderNotebookLmHtml } from "@/lib/notebooklm-render";
import {
  NOTEBOOKLM_PROMPT_TITLE,
  NOTEBOOKLM_PROMPT_HINT,
  NOTEBOOKLM_PROMPT_TEMPLATE,
} from "@/lib/notebooklm-prompt";

/** Paper-document styles: used for the on-screen preview AND the printed PDF. */
const NLM_DOC_CSS = `
.nlm-doc { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.6; color: #111; }
.nlm-doc h1 { font-size: 20pt; font-weight: 800; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 2px solid #111; line-height: 1.25; }
.nlm-doc h2 { font-size: 15pt; font-weight: 700; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #999; line-height: 1.3; }
.nlm-doc h3 { font-size: 12.5pt; font-weight: 700; margin: 18px 0 6px; }
.nlm-doc h4, .nlm-doc h5, .nlm-doc h6 { font-size: 11pt; font-weight: 700; margin: 14px 0 4px; }
.nlm-doc p { margin: 8px 0; }
.nlm-doc ul, .nlm-doc ol { margin: 8px 0; padding-left: 26px; }
.nlm-doc li { margin: 3px 0; }
.nlm-doc blockquote { margin: 10px 0; padding: 8px 14px; border-left: 3px solid #666; background: #f4f4f4; color: #222; }
.nlm-doc table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
.nlm-doc th, .nlm-doc td { border: 1px solid #555; padding: 6px 8px; text-align: left; vertical-align: top; }
.nlm-doc th { background: #eee; font-weight: 700; }
.nlm-doc tr:nth-child(even) td { background: #fafafa; }
.nlm-doc code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; background: #f0f0f0; padding: 1px 5px; border: 1px solid #ddd; }
.nlm-doc pre { background: #f5f5f5; border: 1px solid #ccc; padding: 12px; overflow-x: auto; font-size: 9.5pt; line-height: 1.5; }
.nlm-doc pre code { background: none; border: none; padding: 0; }
.nlm-doc a { color: #0b5fff; }
.nlm-doc hr { border: none; border-top: 1px solid #999; margin: 18px 0; }
.nlm-doc img { max-width: 100%; }
.nlm-doc .nlm-display { margin: 12px 0; overflow-x: auto; overflow-y: hidden; text-align: center; }
.nlm-doc .katex-display { margin: 0; }
.nlm-doc .nlm-math-error { background: #fde8e8; border: 1px solid #e11d48; color: #9f1239; padding: 8px; font-size: 9pt; white-space: pre-wrap; }
.nlm-doc .nlm-math-error-inline { background: #fde8e8; border: 1px solid #e11d48; color: #9f1239; }
.nlm-doc .nlm-render-error { background: #fde8e8; border: 1px solid #e11d48; color: #9f1239; padding: 8px; }
`;

/** Extra rules applied only when printing (page geometry, break control). */
const NLM_PRINT_CSS = `
@page { size: A4; margin: 18mm 15mm 18mm 15mm; }
body { background: #fff !important; }
.nlm-print-title { font-family: Georgia, 'Times New Roman', serif; font-size: 22pt; font-weight: 800; margin: 0 0 4px; color: #111; }
.nlm-print-meta { font-family: Georgia, serif; font-size: 9pt; color: #555; margin: 0 0 14px; border-bottom: 2px solid #111; padding-bottom: 8px; }
.nlm-doc h1, .nlm-doc h2, .nlm-doc h3 { break-after: avoid; break-inside: avoid; }
.nlm-doc pre, .nlm-doc table, .nlm-doc blockquote, .nlm-doc .nlm-display { break-inside: avoid; }
`;

const SAMPLE_MD = `# Soft Computing — Revision Notes (Sample)

## Backpropagation

The **weight update** rule for output neuron $j$ uses the error signal $\\delta_j = (t_j - o_j) \\cdot f'(net_j)$.

$$w_{ij}^{new} = w_{ij}^{old} + \\eta \\cdot \\delta_j \\cdot x_i$$

| Step | Formula | Purpose |
| --- | --- | --- |
| 1 | $net_j = \\sum_i w_{ij} x_i$ | Weighted sum |
| 2 | $o_j = f(net_j)$ | Activation |

> Remember: the learning rate $\\eta$ is chosen small (e.g. $0.01$) to avoid overshooting.

\`\`\`python
for epoch in range(1000):
    output = forward(X)
    backward(output, target)
\`\`\`
`;

export function NotebookLmToPdfTool() {
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("Study Notes");
  const [mounted, setMounted] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => setMounted(true), []);

  const normalized = useMemo(() => normalizeNotebookLmMarkdown(source), [source]);
  const rendered = useMemo(
    () => (mounted ? renderNotebookLmHtml(normalized.markdown) : { html: "", mathErrors: [] as string[] }),
    [normalized.markdown, mounted]
  );
  const allErrors = useMemo(
    () => [...normalized.errors, ...rendered.mathErrors],
    [normalized.errors, rendered.mathErrors]
  );

  const wordCount = useMemo(() => (source.trim() ? source.trim().split(/\s+/).length : 0), [source]);
  const headingCount = useMemo(() => (source.match(/^#{1,6}\s+\S/gm) || []).length, [source]);

  const hasContent = source.trim().length > 0;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setSource(text);
      setFileName(file.name);
      if (!docTitle || docTitle === "Study Notes") {
        setDocTitle(file.name.replace(/\.(md|markdown|txt)$/i, "").replace(/[-_]+/g, " "));
      }
    } catch {
      // errors from file.text() are surfaced via normalized.errors path instead
      setSource("");
    } finally {
      e.target.value = "";
    }
  };

  const loadSample = () => {
    setSource(SAMPLE_MD);
    setFileName(null);
    setDocTitle("Study Notes (Sample)");
  };

  const clearAll = () => {
    setSource("");
    setFileName(null);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(NOTEBOOKLM_PROMPT_TEMPLATE);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      // clipboard unavailable (permissions) — user can still select manually
    }
  };

  const downloadMarkdown = () => {
    const blob = new Blob([normalized.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `${slugify(docTitle) || "study-notes"}_normalized.md`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /** Local-only PDF export: render the exact preview HTML in a hidden
   *  iframe (with the app's own stylesheets cloned in, so KaTeX renders
   *  identically) and print it to PDF. Nothing leaves the browser. */
  const exportPdf = () => {
    if (!hasContent) return;
    setExporting(true);
    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) throw new Error("Could not create the print document.");

      const clonedStyles = Array.from(
        document.querySelectorAll("style, link[rel='stylesheet']")
      )
        .map((n) => (n as HTMLElement).outerHTML)
        .join("\n");

      const meta = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      const prevTitle = document.title;
      const pdfName = slugify(docTitle) || "study-notes";
      doc.open();
      doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtmlAttr(pdfName)}</title>
${clonedStyles}
<style>${NLM_DOC_CSS}\n${NLM_PRINT_CSS}</style>
</head>
<body>
<h1 class="nlm-print-title">${escapeHtml(docTitle)}</h1>
<p class="nlm-print-meta">Converted locally with NotebookLM &rarr; PDF &middot; ${escapeHtml(meta)}${
        fileName ? ` &middot; Source: ${escapeHtml(fileName)}` : ""
      }</p>
<article class="nlm-doc">${rendered.html}</article>
</body>
</html>`);
      doc.close();
      document.title = pdfName;

      const win = iframe.contentWindow;
      if (!win) throw new Error("Could not open the print document.");
      win.focus();
      // Let KaTeX fonts/layout settle before printing.
      setTimeout(() => {
        win.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          document.title = prevTitle;
          setExporting(false);
        }, 500);
      }, 250);
    } catch (err) {
      setExporting(false);
      alert(`PDF export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <BookOpenText className="w-5 h-5 text-primary" />
            NotebookLM &rarr; PDF
          </CardTitle>
          <Badge variant="outline">100% On-Device · No Uploads</Badge>
        </div>
        <CardDescription>
          Paste NotebookLM output or upload a raw <code>.md</code> file. LaTeX is normalized and
          rendered locally, then exported as a clean study-document PDF.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Keep paper styles in the document so the print iframe can clone them. */}
        <style>{NLM_DOC_CSS}</style>

        {/* ---- inputs ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="nlm-title">Document title</Label>
            <Input
              id="nlm-title"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Soft Computing — Module 1"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Raw Markdown file</Label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                className="hidden"
                onChange={handleFile}
              />
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {fileName ? fileName : "Upload .md file"}
              </Button>
            </div>
          </div>
        </div>

        {/* ---- editor + preview ---- */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label htmlFor="nlm-source" className="text-xs font-bold uppercase tracking-widest">
                NotebookLM output
              </Label>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={loadSample} title="Load a sample document">
                  <FlaskConical className="w-3.5 h-3.5 mr-1" /> Sample
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  disabled={!hasContent}
                  title="Clear the editor"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              </div>
            </div>
            <Textarea
              id="nlm-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={"Paste raw NotebookLM Markdown here…\n\nHeadings, lists, tables, $inline math$ and $$display equations$$ are all supported."}
              className="min-h-[320px] xl:min-h-[480px] font-mono text-sm leading-relaxed resize-y"
            />
            <p className="text-xs text-muted-foreground">
              {wordCount.toLocaleString()} words · {headingCount} headings ·{" "}
              {normalized.mathCounts.inline} inline + {normalized.mathCounts.display} display equations
              {fileName ? ` · source file: ${fileName}` : ""}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Live preview — exactly what the PDF contains
              </span>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={downloadMarkdown} disabled={!hasContent}>
                  <Download className="w-3.5 h-3.5 mr-1" /> .md
                </Button>
                <Button size="sm" onClick={exportPdf} disabled={!hasContent || exporting}>
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  {exporting ? "Preparing…" : "Export PDF"}
                </Button>
              </div>
            </div>
            <div className="border border-border bg-white min-h-[320px] xl:min-h-[480px] max-h-[640px] overflow-y-auto p-5 sm:p-8">
              {rendered.html ? (
                <article
                  className="nlm-doc"
                  dangerouslySetInnerHTML={{ __html: rendered.html }}
                />
              ) : (
                <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center gap-2 text-neutral-400">
                  <FileText className="w-8 h-8" />
                  <p className="text-sm font-mono">
                    Paste Markdown on the left to see the formatted document here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- diagnostics ---- */}
        {normalized.warnings.length > 0 && (
          <Alert>
            <Info className="w-4 h-4" />
            <AlertTitle>Auto-fixes applied (content untouched)</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                {normalized.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {allErrors.length > 0 && (
          <Alert variant="destructive">
            <CircleAlert className="w-4 h-4" />
            <AlertTitle>
              {allErrors.length} problem{allErrors.length === 1 ? "" : "s"} to fix before exporting
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                {allErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* ---- prompt section ---- */}
        <div className="border border-border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              {NOTEBOOKLM_PROMPT_TITLE}
            </h3>
            <Button variant="outline" size="sm" onClick={copyPrompt}>
              {promptCopied ? (
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1" />
              )}
              {promptCopied ? "Copied!" : "Copy prompt"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{NOTEBOOKLM_PROMPT_HINT}</p>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-card border border-border p-3 max-h-64 overflow-y-auto">
            {NOTEBOOKLM_PROMPT_TEMPLATE}
          </pre>
          <p className="text-[11px] text-muted-foreground font-mono">
            To change this template, edit <code>lib/notebooklm-prompt.ts</code> — no other file
            needs to change.
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground font-mono text-center">
          Privacy: parsing, math rendering and PDF generation all run in this browser tab. Your notes
          are never uploaded anywhere.
        </p>
      </CardContent>
    </Card>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
