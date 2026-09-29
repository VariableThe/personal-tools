"use client";

import React, { useState } from "react";
import {
  Upload,
  Presentation,
  Download,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  GripVertical,
  FileText,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { readPptxInfo, mergePptx } from "@/lib/pptx-merge";

interface PptxFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  slideCount: number | null;
}

type SortMode = "name-asc" | "name-desc" | "size-asc" | "size-desc";

interface ExportResult {
  pptxUrl: string;
  pptxSize: number;
  pdfUrl: string | null;
  pdfSize: number | null;
  totalSlides: number;
  skippedImages: number;
  emptySlides: number;
}

export function PptMergeTool() {
  const [files, setFiles] = useState<PptxFileItem[]>([]);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const clearResult = () => setResult(null);

  const loadInfo = async (id: string, file: File) => {
    try {
      const info = await readPptxInfo(await file.arrayBuffer());
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, slideCount: info.valid ? info.slideCount : null } : f))
      );
      if (!info.valid) setError(`Could not read ${file.name}: ${info.error ?? "invalid .pptx"}`);
    } catch (err) {
      setError(`Could not read ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;
    const picked = Array.from(uploaded).filter((f) => /\.pptx$/i.test(f.name));
    if (picked.length < uploaded.length) {
      setError("Only .pptx files are supported — other files were skipped.");
    }
    if (picked.length === 0) {
      e.target.value = "";
      return;
    }
    const newItems: PptxFileItem[] = picked.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      slideCount: null,
    }));
    setFiles((prev) => [...prev, ...newItems]);
    clearResult();
    newItems.forEach((item) => loadInfo(item.id, item.file));
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    clearResult();
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= files.length) return;
    const copy = [...files];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    setFiles(copy);
    clearResult();
  };

  const sortFiles = (mode: SortMode) => {
    const copy = [...files];
    switch (mode) {
      case "name-asc":
        copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
        break;
      case "name-desc":
        copy.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: "base" }));
        break;
      case "size-asc":
        copy.sort((a, b) => a.size - b.size);
        break;
      case "size-desc":
        copy.sort((a, b) => b.size - a.size);
        break;
    }
    setFiles(copy);
    clearResult();
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (idx !== dragOverIndex) setDragOverIndex(idx);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIdx) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const copy = [...files];
    const [moved] = copy.splice(dragIndex, 1);
    copy.splice(dropIdx, 0, moved);
    setFiles(copy);
    clearResult();
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const totalSlides = files.reduce((sum, f) => sum + (f.slideCount ?? 0), 0);
  const slidesKnown = files.some((f) => f.slideCount !== null);

  const orderedBuffers = async (): Promise<ArrayBuffer[]> => {
    const out: ArrayBuffer[] = [];
    for (const item of files) out.push(await item.file.arrayBuffer());
    return out;
  };

  const downloadBlob = (blob: Blob): string => URL.createObjectURL(blob);

  const handleExportPptx = async () => {
    if (files.length === 0) return;
    setProcessing("pptx");
    setError(null);
    try {
      const bytes = await mergePptx(await orderedBuffers());
      const blob = new Blob([bytes as unknown as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      setResult({
        pptxUrl: downloadBlob(blob),
        pptxSize: bytes.length,
        pdfUrl: result?.pdfUrl ?? null,
        pdfSize: result?.pdfSize ?? null,
        totalSlides: files.reduce((s, f) => s + (f.slideCount ?? 0), 0),
        skippedImages: result?.skippedImages ?? 0,
        emptySlides: result?.emptySlides ?? 0,
      });
    } catch (err) {
      setError("Failed to combine decks: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(null);
    }
  };

  const handleExportPdf = async () => {
    if (files.length === 0) return;
    setProcessing("pdf");
    setError(null);
    try {
      // One PDF per deck (preserves each deck's slide size), then join pages in order.
      // The export engine (fontkit + embedded fonts) loads on demand only.
      const { extractDeckContent, deckContentToPdf } = await import("@/lib/pptx-pdf");
      const docs: { doc: PDFDocument; skipped: number; slides: number; empty: number }[] = [];
      for (const item of files) {
        const deck = await extractDeckContent(await item.file.arrayBuffer());
        const bytes = await deckContentToPdf(deck, { deckName: item.name });
        docs.push({
          doc: await PDFDocument.load(bytes),
          skipped: deck.skippedImages,
          slides: deck.slides.length,
          empty: deck.slides.filter((s) => s.shapes.length === 0).length,
        });
      }
      const out = await PDFDocument.create();
      let pages = 0;
      for (const d of docs) {
        const copied = await out.copyPages(d.doc, d.doc.getPageIndices());
        copied.forEach((p) => out.addPage(p));
        pages += d.slides;
      }
      const bytes = await out.save();
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({
        pptxUrl: result?.pptxUrl ?? "",
        pptxSize: result?.pptxSize ?? 0,
        pdfUrl: downloadBlob(blob),
        pdfSize: bytes.length,
        totalSlides: pages,
        skippedImages: docs.reduce((s, d) => s + d.skipped, 0),
        emptySlides: docs.reduce((s, d) => s + d.empty, 0),
      });
    } catch (err) {
      setError("Failed to build PDF: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Presentation className="w-5 h-5 text-primary" />
            PPT Merge &amp; Export
          </CardTitle>
          <Badge variant="outline">100% On-Device · No Uploads</Badge>
        </div>
        <CardDescription>
          Upload multiple <code>.pptx</code> decks, order them, then download one combined deck or
          a slide-content PDF. Masters travel with their slides, so formatting is preserved.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-border hover:border-primary/80 rounded-2xl p-8 transition-all bg-muted/40 text-center">
          <input
            type="file"
            accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            multiple
            id="pptx-upload"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="pptx-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold">Select or Drag &amp; Drop .pptx Files</p>
              <p className="text-xs text-muted-foreground mt-1">You can select multiple decks at once.</p>
            </div>
            <Button className="pointer-events-none">Choose PPTX Files</Button>
          </label>
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>
                Decks ({files.length})
                {slidesKnown && (
                  <span className="ml-2 normal-case font-mono">
                    · {totalSlides} {totalSlides === 1 ? "slide" : "slides"} total
                  </span>
                )}
              </span>
              <span className="normal-case font-normal">Drag to reorder or use arrows</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">
                Sort:
              </span>
              <Button variant="outline" size="sm" onClick={() => sortFiles("name-asc")} title="Sort A to Z" className="h-7 text-xs">
                <ArrowDownAZ className="w-3.5 h-3.5 mr-1" /> A–Z
              </Button>
              <Button variant="outline" size="sm" onClick={() => sortFiles("name-desc")} title="Sort Z to A" className="h-7 text-xs">
                <ArrowDownZA className="w-3.5 h-3.5 mr-1" /> Z–A
              </Button>
              <Button variant="outline" size="sm" onClick={() => sortFiles("size-asc")} title="Smallest first" className="h-7 text-xs">
                <ArrowUpNarrowWide className="w-3.5 h-3.5 mr-1" /> Smallest
              </Button>
              <Button variant="outline" size="sm" onClick={() => sortFiles("size-desc")} title="Largest first" className="h-7 text-xs">
                <ArrowDownWideNarrow className="w-3.5 h-3.5 mr-1" /> Largest
              </Button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {files.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`flex items-center justify-between p-3.5 rounded-xl bg-muted/60 border transition-all cursor-grab active:cursor-grabbing ${
                    dragOverIndex === idx && dragIndex !== null && dragIndex !== idx
                      ? "border-primary border-t-2 -translate-y-px"
                      : "border-border"
                  } ${dragIndex === idx ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <GripVertical className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                    <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                      {idx + 1}
                    </span>
                    <Presentation className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {formatBytes(item.size)}
                        <span className="mx-1.5 opacity-50">·</span>
                        {item.slideCount === null ? (
                          <span className="opacity-60">counting slides…</span>
                        ) : (
                          <span className="text-primary">
                            {item.slideCount} {item.slideCount === 1 ? "slide" : "slides"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button variant="ghost" size="icon" disabled={idx === 0} onClick={() => move(idx, -1)} className="h-8 w-8">
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === files.length - 1}
                      onClick={() => move(idx, 1)}
                      className="h-8 w-8"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setFiles([]);
                  clearResult();
                }}
              >
                Clear All
              </Button>
              <Button onClick={handleExportPptx} disabled={processing !== null}>
                <FileText className="w-4 h-4 mr-2" />
                {processing === "pptx" ? "Combining…" : `Combine as PPTX`}
              </Button>
              <Button onClick={handleExportPdf} disabled={processing !== null} variant="secondary">
                <Download className="w-4 h-4 mr-2" />
                {processing === "pdf" ? "Building PDF…" : "Export as PDF"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              PPTX keeps full slide fidelity. PDF is a handout-style export (slide text, images and
              tables, one page per slide) — exact PowerPoint rendering is not preserved.
            </p>
          </div>
        )}

        {result && (result.pptxUrl || result.pdfUrl) && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Ready for download</h4>
                <p className="text-xs text-muted-foreground">
                  {result.totalSlides} {result.totalSlides === 1 ? "slide" : "slides"} in order
                  {result.skippedImages > 0 &&
                    ` · ${result.skippedImages} unsupported image(s) skipped in PDF`}
                  {result.emptySlides > 0 &&
                    ` · ${result.emptySlides} slide(s) had no extractable content`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {result.pptxUrl && (
                <a
                  href={result.pptxUrl}
                  download="combined_deck.pptx"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  PPTX{result.pptxSize > 0 ? ` (${formatBytes(result.pptxSize)})` : ""}
                </a>
              )}
              {result.pdfUrl && (
                <a
                  href={result.pdfUrl}
                  download="combined_deck.pdf"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl font-medium text-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  PDF{result.pdfSize ? ` (${formatBytes(result.pdfSize)})` : ""}
                </a>
              )}
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground font-mono text-center">
          Privacy: parsing, merging and PDF generation all run in this browser tab. Your decks are
          never uploaded anywhere.
        </p>
      </CardContent>
    </Card>
  );
}
