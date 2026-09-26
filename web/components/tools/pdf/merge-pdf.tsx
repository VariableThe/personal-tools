"use client";

import React, { useState } from "react";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  CheckCircle2,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  GripVertical,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

interface PdfFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number | null;
}

type SortMode = "name-asc" | "name-desc" | "size-asc" | "size-desc";

export function MergePdfTool() {
  const [files, setFiles] = useState<PdfFileItem[]>([]);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [mergedInfo, setMergedInfo] = useState<{ pages: number; size: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const loadPageCount = async (id: string, file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      const count = doc.getPageCount();
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, pageCount: count } : f)));
    } catch {
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, pageCount: null } : f)));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    const newItems: PdfFileItem[] = Array.from(uploaded).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      pageCount: null,
    }));

    setFiles((prev) => [...prev, ...newItems]);
    setMergedUrl(null);
    setMergedInfo(null);
    newItems.forEach((item) => loadPageCount(item.id, item.file));
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setMergedUrl(null);
    setMergedInfo(null);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const copy = [...files];
    const temp = copy[idx - 1];
    copy[idx - 1] = copy[idx];
    copy[idx] = temp;
    setFiles(copy);
    setMergedUrl(null);
    setMergedInfo(null);
  };

  const moveDown = (idx: number) => {
    if (idx === files.length - 1) return;
    const copy = [...files];
    const temp = copy[idx + 1];
    copy[idx + 1] = copy[idx];
    copy[idx] = temp;
    setFiles(copy);
    setMergedUrl(null);
    setMergedInfo(null);
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
    setMergedUrl(null);
    setMergedInfo(null);
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
    setMergedUrl(null);
    setMergedInfo(null);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const totalPages = files.reduce((sum, f) => sum + (f.pageCount ?? 0), 0);
  const pagesKnown = files.some((f) => f.pageCount !== null);

  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Please add at least 2 PDF files to merge.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        const arrayBuffer = await item.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setMergedUrl(url);
      setMergedInfo({ pages: mergedPdf.getPageCount(), size: mergedBytes.length });
    } catch (err: any) {
      setError("Failed to merge PDF files: " + (err.message || String(err)));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Merge PDF Documents
          </CardTitle>
          <Badge variant="outline">
            100% On-Device WASM
          </Badge>
        </div>
        <CardDescription className="text-muted-foreground">
          Combine multiple PDF files into a single unified document in any order you choose.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-none p-8 transition-all bg-muted/40 text-center">
          <input
            type="file"
            accept=".pdf"
            multiple
            id="merge-upload"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="merge-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-none bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Select or Drag & Drop PDF Files</p>
              <p className="text-xs text-muted-foreground mt-1">You can select multiple files at once.</p>
            </div>
            <Button variant="default">
              Choose PDF Files
            </Button>
          </label>
        </div>

        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>
                Selected Files ({files.length})
                {pagesKnown && (
                  <span className="ml-2 normal-case font-mono text-muted-foreground">
                    • {totalPages} {totalPages === 1 ? "page" : "pages"} total
                  </span>
                )}
              </span>
              <span className="normal-case font-normal">Drag to reorder or use arrows</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">
                Sort:
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sortFiles("name-asc")}
                title="Sort alphabetically A to Z"
                className="h-7 text-xs border-border text-muted-foreground hover:text-foreground"
              >
                <ArrowDownAZ className="w-3.5 h-3.5 mr-1" />
                A–Z
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sortFiles("name-desc")}
                title="Sort alphabetically Z to A"
                className="h-7 text-xs border-border text-muted-foreground hover:text-foreground"
              >
                <ArrowDownZA className="w-3.5 h-3.5 mr-1" />
                Z–A
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sortFiles("size-asc")}
                title="Sort by file size, smallest first"
                className="h-7 text-xs border-border text-muted-foreground hover:text-foreground"
              >
                <ArrowUpNarrowWide className="w-3.5 h-3.5 mr-1" />
                Smallest
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sortFiles("size-desc")}
                title="Sort by file size, largest first"
                className="h-7 text-xs border-border text-muted-foreground hover:text-foreground"
              >
                <ArrowDownWideNarrow className="w-3.5 h-3.5 mr-1" />
                Largest
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
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between p-3.5 rounded-none bg-muted/60 border transition-all cursor-grab active:cursor-grabbing ${
                    dragOverIndex === idx && dragIndex !== null && dragIndex !== idx
                      ? "border-primary border-t-2 -translate-y-px"
                      : "border-border hover:border-foreground/30"
                  } ${dragIndex === idx ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="w-6 h-6 rounded-none bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                      {idx + 1}
                    </span>
                    <FileText className="w-4 h-4 text-destructive flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {formatBytes(item.size)}
                        <span className="mx-1.5 text-muted-foreground">•</span>
                        {item.pageCount === null ? (
                          <span className="text-muted-foreground">counting pages…</span>
                        ) : (
                          <span className="text-primary">
                            {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => moveUp(idx)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === files.length - 1}
                      onClick={() => moveDown(idx)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setFiles([]);
                  setMergedUrl(null);
                  setMergedInfo(null);
                }}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                Clear All
              </Button>
              <Button
                onClick={handleMerge}
                disabled={processing || files.length < 2}
                className="bg-primary hover:bg-primary/80 text-primary-foreground font-medium px-6"
              >
                {processing ? "Merging PDFs..." : `Merge ${files.length} PDFs Now`}
              </Button>
            </div>
          </div>
        )}

        {mergedUrl && (
          <div className="p-4 rounded-none bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">PDFs Merged Successfully!</h4>
                <p className="text-xs text-muted-foreground">
                  Combined {files.length} files
                  {mergedInfo && (
                    <>
                      {" "}
                      • {mergedInfo.pages} {mergedInfo.pages === 1 ? "page" : "pages"} •{" "}
                      {formatBytes(mergedInfo.size)}
                    </>
                  )}{" "}
                  into one seamless document.
                </p>
              </div>
            </div>
            <a
              href={mergedUrl}
              download="merged_document.pdf"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-none font-medium text-sm transition-all"
            >
              <Download className="w-4 h-4" />
              Download Merged PDF
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
