"use client";

import React, { useState } from "react";
import { Upload, Hash, Download, CheckCircle2 } from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

export function PageNumbersPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<"bottom-center" | "bottom-right" | "top-center">("bottom-center");
  const [numberedUrl, setNumberedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    setFile(uploaded);
    setNumberedUrl(null);
    setError(null);
  };

  const handleApplyNumbers = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const totalPages = pages.length;

      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();
        const text = `Page ${idx + 1} of ${totalPages}`;
        const fontSize = 10;
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        let x = width / 2 - textWidth / 2;
        let y = 20;

        if (position === "bottom-right") {
          x = width - textWidth - 30;
          y = 20;
        } else if (position === "top-center") {
          x = width / 2 - textWidth / 2;
          y = height - 25;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      });

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      setNumberedUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setError("Failed to add page numbers: " + (err.message || String(err)));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-400" />
            Add Page Numbers to PDF
          </CardTitle>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
            100% On-Device WASM
          </Badge>
        </div>
        <CardDescription className="text-zinc-400">
          Insert clean page numbering (`Page X of Y`) to document headers or footers.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-zinc-700/60 hover:border-blue-500/80 rounded-2xl p-8 transition-all bg-zinc-950/40 text-center">
          <input
            type="file"
            accept=".pdf"
            id="number-upload"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="number-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-200">
                {file ? file.name : "Select a PDF Document"}
              </p>
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

        {file && (
          <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-3">
                Numbering Placement Position
              </span>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { id: "bottom-center", label: "Bottom Center" },
                    { id: "bottom-right", label: "Bottom Right" },
                    { id: "top-center", label: "Top Center" },
                  ] as const
                ).map((pos) => (
                  <Button
                    key={pos.id}
                    variant={position === pos.id ? "default" : "outline"}
                    onClick={() => setPosition(pos.id)}
                    className={`py-6 text-sm font-semibold ${
                      position === pos.id
                        ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-600/20"
                        : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-700"
                    }`}
                  >
                    {pos.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleApplyNumbers}
              disabled={processing}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-6 shadow-lg shadow-blue-600/20"
            >
              {processing ? "Adding Numbers..." : "Apply Page Numbers"}
            </Button>
          </div>
        )}

        {numberedUrl && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-300">Page Numbers Added!</h4>
                <p className="text-xs text-zinc-400">Formatted and stamped across all document pages.</p>
              </div>
            </div>
            <a
              href={numberedUrl}
              download={`${file?.name.replace(/\.pdf$/i, "")}_numbered.pdf`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Download Numbered PDF
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
