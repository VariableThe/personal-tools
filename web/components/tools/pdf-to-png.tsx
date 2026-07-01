"use client";

import React, { useState } from "react";
import { Upload, Download, RefreshCw, Layers, CheckCircle2 } from "lucide-react";
import JSZip from "jszip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

export function PdfToPngTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(2.0);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    setFile(uploaded);
    setLoading(true);
    setError(null);
    setPageImages([]);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await uploaded.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const images: string[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          images.push(canvas.toDataURL("image/png"));
        }
      }

      setPageImages(images);
    } catch (err: any) {
      setError("Failed to render PDF: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const downloadSingle = (imgUrl: string, idx: number) => {
    const a = document.createElement("a");
    a.href = imgUrl;
    a.setAttribute("download", `${file?.name.replace(/\.pdf$/i, "")}_page_${idx + 1}.png`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllZip = async () => {
    if (pageImages.length === 0 || !file) return;
    const zip = new JSZip();
    const baseName = file.name.replace(/\.pdf$/i, "");

    pageImages.forEach((imgData, idx) => {
      const base64Data = imgData.replace(/^data:image\/png;base64,/, "");
      zip.file(`${baseName}_page_${idx + 1}.png`, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `${baseName}_images.zip`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            PDF to PNG Images
          </CardTitle>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
            100% On-Device WASM
          </Badge>
        </div>
        <CardDescription className="text-zinc-400">
          Render document pages into crisp high-resolution PNG images directly in memory.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-zinc-700/60 hover:border-blue-500/80 rounded-2xl p-8 transition-all bg-zinc-950/40 text-center">
          <input
            type="file"
            accept=".pdf"
            id="pdf-to-png-upload"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="pdf-to-png-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-200">
                {file ? file.name : "Select a PDF Document"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Extracts every page at high DPI resolution.</p>
            </div>
            <Button variant="default" className="bg-blue-600 hover:bg-blue-500 pointer-events-none">
              Choose PDF File
            </Button>
          </label>
        </div>

        {loading && (
          <div className="p-8 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
            <p className="text-sm font-medium text-zinc-300">
              Rendering PDF pages on device... Please wait.
            </p>
          </div>
        )}

        {error && (
          <Alert className="border-red-500/40 bg-red-500/10 text-red-300 text-sm">
            {error}
          </Alert>
        )}

        {pageImages.length > 0 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h4 className="font-medium text-zinc-200">Rendered {pageImages.length} Pages</h4>
                  <p className="text-xs text-zinc-400">Ready for instant local download.</p>
                </div>
              </div>
              <Button
                onClick={downloadAllZip}
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Download All as ZIP
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pageImages.map((img, idx) => (
                <Card
                  key={idx}
                  className="border-zinc-800 bg-zinc-950/60 overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-300">Page {idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadSingle(img, idx)}
                      className="h-7 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Save PNG
                    </Button>
                  </div>
                  <div className="p-4 flex items-center justify-center bg-zinc-950 flex-grow">
                    <img src={img} alt={`Page ${idx + 1}`} className="max-h-72 object-contain rounded shadow" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
