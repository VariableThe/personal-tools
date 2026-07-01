"use client";

import React, { useState } from "react";
import { Upload, FileText, Download, Trash2, ArrowUp, ArrowDown, Layers, CheckCircle2 } from "lucide-react";
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
}

export function MergePdfTool() {
  const [files, setFiles] = useState<PdfFileItem[]>([]);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    const newItems: PdfFileItem[] = Array.from(uploaded).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
    }));

    setFiles((prev) => [...prev, ...newItems]);
    setMergedUrl(null);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setMergedUrl(null);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const copy = [...files];
    const temp = copy[idx - 1];
    copy[idx - 1] = copy[idx];
    copy[idx] = temp;
    setFiles(copy);
    setMergedUrl(null);
  };

  const moveDown = (idx: number) => {
    if (idx === files.length - 1) return;
    const copy = [...files];
    const temp = copy[idx + 1];
    copy[idx + 1] = copy[idx];
    copy[idx] = temp;
    setFiles(copy);
    setMergedUrl(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

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
    } catch (err: any) {
      setError("Failed to merge PDF files: " + (err.message || String(err)));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            Merge PDF Documents
          </CardTitle>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
            100% On-Device WASM
          </Badge>
        </div>
        <CardDescription className="text-zinc-400">
          Combine multiple PDF files into a single unified document in any order you choose.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-zinc-700/60 hover:border-blue-500/80 rounded-2xl p-8 transition-all bg-zinc-950/40 text-center">
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
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-200">Select or Drag & Drop PDF Files</p>
              <p className="text-xs text-zinc-400 mt-1">You can select multiple files at once.</p>
            </div>
            <Button variant="default" className="bg-blue-600 hover:bg-blue-500 pointer-events-none">
              Choose PDF Files
            </Button>
          </label>
        </div>

        {error && (
          <Alert className="border-red-500/40 bg-red-500/10 text-red-300 text-sm">
            {error}
          </Alert>
        )}

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <span>Selected Files ({files.length})</span>
              <span>Reorder using arrows</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {files.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-medium text-zinc-200 truncate">{item.name}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">{formatBytes(item.size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => moveUp(idx)}
                      className="h-8 w-8 text-zinc-400 hover:text-white"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === files.length - 1}
                      onClick={() => moveDown(idx)}
                      className="h-8 w-8 text-zinc-400 hover:text-white"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(item.id)}
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => setFiles([])}
                className="border-zinc-800 text-zinc-400 hover:text-white"
              >
                Clear All
              </Button>
              <Button
                onClick={handleMerge}
                disabled={processing || files.length < 2}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 shadow-lg shadow-blue-600/20"
              >
                {processing ? "Merging PDFs..." : `Merge ${files.length} PDFs Now`}
              </Button>
            </div>
          </div>
        )}

        {mergedUrl && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-300">PDFs Merged Successfully!</h4>
                <p className="text-xs text-zinc-400">Combined {files.length} files into one seamless document.</p>
              </div>
            </div>
            <a
              href={mergedUrl}
              download="merged_document.pdf"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-600/20 transition-all"
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
