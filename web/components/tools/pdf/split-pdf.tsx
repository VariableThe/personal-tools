"use client";

import React, { useState } from "react";
import { Upload, Scissors, Download, CheckCircle2 } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

export function SplitPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [rangeStr, setRangeStr] = useState<string>("");
  const [splitUrl, setSplitUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    setFile(uploaded);
    setSplitUrl(null);
    setError(null);

    try {
      const buffer = await uploaded.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      const total = doc.getPageCount();
      setNumPages(total);
      setRangeStr(`1-${total > 1 ? total : 1}`);
    } catch (err: any) {
      setError("Failed to read PDF pages: " + (err.message || String(err)));
    }
  };

  const parseRange = (str: string, maxPages: number): number[] => {
    const indices = new Set<number>();
    const parts = str.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [startStr, endStr] = trimmed.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
            indices.add(i - 1); // 0-indexed
          }
        }
      } else {
        const val = parseInt(trimmed, 10);
        if (!isNaN(val) && val >= 1 && val <= maxPages) {
          indices.add(val - 1);
        }
      }
    }
    return Array.from(indices).sort((a, b) => a - b);
  };

  const handleSplit = async () => {
    if (!file || numPages === 0) return;

    setProcessing(true);
    setError(null);

    try {
      const targetIndices = parseRange(rangeStr, numPages);
      if (targetIndices.length === 0) {
        throw new Error("Invalid page range specified. Example: 1-3, 5");
      }

      const buffer = await file.arrayBuffer();
      const origDoc = await PDFDocument.load(buffer);
      const newDoc = await PDFDocument.create();

      const copiedPages = await newDoc.copyPages(origDoc, targetIndices);
      copiedPages.forEach((page) => newDoc.addPage(page));

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setSplitUrl(url);
    } catch (err: any) {
      setError(err.message || "Failed to split PDF document.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Scissors className="w-5 h-5 text-blue-400" />
            Split & Extract PDF Pages
          </CardTitle>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
            100% On-Device WASM
          </Badge>
        </div>
        <CardDescription className="text-zinc-400">
          Extract specific pages or page ranges from your PDF document into a clean new file.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-zinc-700/60 hover:border-blue-500/80 rounded-2xl p-8 transition-all bg-zinc-950/40 text-center">
          <input
            type="file"
            accept=".pdf"
            id="split-upload"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="split-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-200">
                {file ? file.name : "Select a PDF File to Split"}
              </p>
              {file && (
                <p className="text-xs text-emerald-400 mt-1 font-medium">
                  Document loaded: {numPages} total pages.
                </p>
              )}
            </div>
            <Button variant="default" className="bg-blue-600 hover:bg-blue-500 pointer-events-none">
              Choose PDF File
            </Button>
          </label>
        </div>

        {error && (
          <Alert className="border-red-500/40 bg-red-500/10 text-red-300 text-sm">
            {error}
          </Alert>
        )}

        {file && numPages > 0 && (
          <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="page-range" className="text-sm font-semibold text-zinc-200">
                Page Range to Extract
              </Label>
              <Input
                id="page-range"
                value={rangeStr}
                onChange={(e) => setRangeStr(e.target.value)}
                placeholder="e.g. 1-3, 5, 8-10"
                className="bg-zinc-900 border-zinc-800 font-mono text-zinc-100"
              />
              <p className="text-xs text-zinc-400">
                Enter page numbers and/or ranges separated by commas (Total Pages: {numPages}).
              </p>
            </div>

            <Button
              onClick={handleSplit}
              disabled={processing || !rangeStr}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-6 shadow-lg shadow-blue-600/20"
            >
              {processing ? "Extracting Pages..." : "Extract Specified Pages"}
            </Button>
          </div>
        )}

        {splitUrl && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-300">Pages Extracted Successfully!</h4>
                <p className="text-xs text-zinc-400">Ready for instant local download.</p>
              </div>
            </div>
            <a
              href={splitUrl}
              download={`${file?.name.replace(/\.pdf$/i, "")}_extracted.pdf`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Download Extracted PDF
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
