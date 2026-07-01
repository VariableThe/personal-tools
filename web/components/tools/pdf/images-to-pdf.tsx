"use client";

import React, { useState } from "react";
import { Upload, FileImage, Download, Trash2, ArrowUp, ArrowDown, Layers, CheckCircle2 } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

interface ImgItem {
  id: string;
  file: File;
  name: string;
  dataUrl: string;
}

export function ImagesToPdfTool() {
  const [images, setImages] = useState<ImgItem[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    Array.from(uploaded).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            file,
            name: file.name,
            dataUrl: event.target?.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    setPdfUrl(null);
  };

  const removeImg = (id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
    setPdfUrl(null);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const copy = [...images];
    const temp = copy[idx - 1];
    copy[idx - 1] = copy[idx];
    copy[idx] = temp;
    setImages(copy);
    setPdfUrl(null);
  };

  const moveDown = (idx: number) => {
    if (idx === images.length - 1) return;
    const copy = [...images];
    const temp = copy[idx + 1];
    copy[idx + 1] = copy[idx];
    copy[idx] = temp;
    setImages(copy);
    setPdfUrl(null);
  };

  const handleCreatePdf = async () => {
    if (images.length === 0) return;

    setProcessing(true);
    setError(null);

    try {
      const doc = await PDFDocument.create();

      for (const item of images) {
        const buffer = await item.file.arrayBuffer();
        let embeddedImg;

        if (item.file.type.includes("png")) {
          embeddedImg = await doc.embedPng(buffer);
        } else if (item.file.type.includes("jpeg") || item.file.type.includes("jpg")) {
          embeddedImg = await doc.embedJpg(buffer);
        } else {
          // Fallback convert webp/other to png canvas first
          const canvas = document.createElement("canvas");
          const imgEl = new Image();
          await new Promise<void>((resolve) => {
            imgEl.onload = () => {
              canvas.width = imgEl.width;
              canvas.height = imgEl.height;
              canvas.getContext("2d")?.drawImage(imgEl, 0, 0);
              resolve();
            };
            imgEl.src = item.dataUrl;
          });
          const pngDataUrl = canvas.toDataURL("image/png");
          const pngBytes = Uint8Array.from(atob(pngDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
          embeddedImg = await doc.embedPng(pngBytes);
        }

        const { width, height } = embeddedImg.scale(1);
        const page = doc.addPage([width, height]);
        page.drawImage(embeddedImg, { x: 0, y: 0, width, height });
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setError("Failed to create PDF from images: " + (err.message || String(err)));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <FileImage className="w-5 h-5 text-blue-400" />
            Images to PDF Converter
          </CardTitle>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
            100% On-Device WASM
          </Badge>
        </div>
        <CardDescription className="text-zinc-400">
          Convert multiple JPG, PNG, or WEBP photos into a single well-structured PDF album.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-zinc-700/60 hover:border-blue-500/80 rounded-2xl p-8 transition-all bg-zinc-950/40 text-center">
          <input
            type="file"
            accept="image/*"
            multiple
            id="img-to-pdf-upload"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="img-to-pdf-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-200">Select or Drag & Drop Image Files</p>
              <p className="text-xs text-zinc-400 mt-1">Select multiple images at once to combine.</p>
            </div>
            <Button variant="default" className="bg-blue-600 hover:bg-blue-500 pointer-events-none">
              Choose Image Files
            </Button>
          </label>
        </div>

        {error && (
          <Alert className="border-red-500/40 bg-red-500/10 text-red-300 text-sm">
            {error}
          </Alert>
        )}

        {images.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <span>Selected Images ({images.length})</span>
              <span>Reorder sequence</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-80 overflow-y-auto p-1">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col justify-between group"
                >
                  <div className="h-32 bg-zinc-900/60 flex items-center justify-center p-2">
                    <img src={img.dataUrl} alt={img.name} className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="p-2 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-300 truncate max-w-[80px]">
                      {idx + 1}. {img.name}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={idx === 0}
                        onClick={() => moveUp(idx)}
                        className="h-6 w-6 text-zinc-400"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={idx === images.length - 1}
                        onClick={() => moveDown(idx)}
                        className="h-6 w-6 text-zinc-400"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeImg(img.id)}
                        className="h-6 w-6 text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => setImages([])}
                className="border-zinc-800 text-zinc-400 hover:text-white"
              >
                Clear All
              </Button>
              <Button
                onClick={handleCreatePdf}
                disabled={processing || images.length === 0}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 shadow-lg shadow-blue-600/20"
              >
                {processing ? "Generating PDF..." : `Convert ${images.length} Images to PDF`}
              </Button>
            </div>
          </div>
        )}

        {pdfUrl && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-300">PDF Created Successfully!</h4>
                <p className="text-xs text-zinc-400">All photos embedded and sized accurately.</p>
              </div>
            </div>
            <a
              href={pdfUrl}
              download="images_album.pdf"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Download Generated PDF
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
