"use client";

import React, { useState, useRef } from "react";
import { Upload, Zap, Download, Loader2, RefreshCw, Maximize2 } from "lucide-react";

export function ImageUpscalerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [upscaledUrl, setUpscaledUrl] = useState<string | null>(null);
  const [scaleFactor, setScaleFactor] = useState<number>(2);
  const [mode, setMode] = useState<"sharp" | "smooth">("sharp");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dimensions, setDimensions] = useState<{ origW: number; origH: number; newW: number; newH: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setOriginalUrl(url);
      setUpscaledUrl(null);

      const img = new Image();
      img.onload = () => {
        setDimensions({
          origW: img.width,
          origH: img.height,
          newW: img.width * scaleFactor,
          newH: img.height * scaleFactor,
        });
      };
      img.src = url;
    }
  };

  const handleScaleChange = (factor: number) => {
    setScaleFactor(factor);
    if (dimensions) {
      setDimensions({
        ...dimensions,
        newW: dimensions.origW * factor,
        newH: dimensions.origH * factor,
      });
    }
  };

  const processUpscale = async () => {
    if (!originalUrl || !dimensions) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = originalUrl;
      await new Promise((res) => { img.onload = res; });

      const targetW = dimensions.origW * scaleFactor;
      const targetH = dimensions.origH * scaleFactor;

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Canvas 2D context unavailable");

      // High quality interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (mode === "sharp") {
        // Multi-step stepping for better fidelity
        let curW = dimensions.origW;
        let curH = dimensions.origH;
        let tempCanvas = document.createElement("canvas");
        tempCanvas.width = curW;
        tempCanvas.height = curH;
        let tempCtx = tempCanvas.getContext("2d")!;
        tempCtx.drawImage(img, 0, 0);

        while (curW < targetW * 0.75) {
          curW = Math.min(targetW, curW * 1.5);
          curH = Math.min(targetH, curH * 1.5);
          const nextCanvas = document.createElement("canvas");
          nextCanvas.width = curW;
          nextCanvas.height = curH;
          const nextCtx = nextCanvas.getContext("2d")!;
          nextCtx.imageSmoothingEnabled = true;
          nextCtx.imageSmoothingQuality = "high";
          nextCtx.drawImage(tempCanvas, 0, 0, curW, curH);
          tempCanvas = nextCanvas;
        }

        ctx.drawImage(tempCanvas, 0, 0, targetW, targetH);

        // Apply unsharp mask filter for crisp detail
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;
        const width = targetW;
        const height = targetH;
        const factor = 0.35; // Sharpening strength

        // Basic convolution sharpening kernel pass
        const output = new Uint8ClampedArray(data);
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const i = (y * width + x) * 4;
            for (let c = 0; c < 3; c++) {
              const center = data[i + c];
              const top = data[((y - 1) * width + x) * 4 + c];
              const bottom = data[((y + 1) * width + x) * 4 + c];
              const left = data[(y * width + x - 1) * 4 + c];
              const right = data[(y * width + x + 1) * 4 + c];
              const sharp = center * (1 + 4 * factor) - factor * (top + bottom + left + right);
              output[i + c] = Math.min(255, Math.max(0, sharp));
            }
          }
        }
        ctx.putImageData(new ImageData(output, width, height), 0, 0);
      } else {
        ctx.drawImage(img, 0, 0, targetW, targetH);
      }

      canvas.toBlob((blob) => {
        if (blob) {
          setUpscaledUrl(URL.createObjectURL(blob));
        }
        setIsProcessing(false);
      }, file?.type || "image/png", 0.98);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <Maximize2 className="w-3.5 h-3.5" />
            On-Device Super Resolution
          </div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            HD Image Upscaler
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Increase image resolution up to 4x with multi-step crisp sharpening directly in your browser.
          </p>
        </div>
      </div>

      {!file ? (
        <label className="border-2 border-dashed border-zinc-700/80 hover:border-blue-500/50 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all bg-zinc-950/40 group">
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-zinc-400 group-hover:text-blue-400 group-hover:scale-110 transition-all">
            <Upload className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-zinc-200">Drop low-res image here or click to browse</p>
            <p className="text-xs text-zinc-400 mt-1">Supports PNG, JPG, WEBP icons & photos</p>
          </div>
        </label>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950/40 border border-zinc-800/60 p-4 rounded-2xl">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Upscale Scale Factor</span>
              <div className="flex gap-2">
                {[2, 3, 4].map((f) => (
                  <button
                    key={f}
                    onClick={() => handleScaleChange(f)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                      scaleFactor === f
                        ? "bg-blue-600 border-blue-500 text-white shadow-md"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {f}x Resolution
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Enhancement Mode</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("sharp")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    mode === "sharp"
                      ? "bg-purple-600 border-purple-500 text-white shadow-md"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  ✨ Crisp Detail (Sharpen)
                </button>
                <button
                  onClick={() => setMode("smooth")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    mode === "smooth"
                      ? "bg-purple-600 border-purple-500 text-white shadow-md"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  🌊 Smooth HD
                </button>
              </div>
            </div>
          </div>

          {dimensions && (
            <div className="flex items-center justify-center gap-4 text-xs sm:text-sm font-mono text-zinc-300 bg-zinc-900/40 py-2.5 px-4 rounded-xl border border-zinc-800/60">
              <span>Original: <strong className="text-white">{dimensions.origW} × {dimensions.origH}px</strong></span>
              <span className="text-blue-400">➔</span>
              <span>Upscaled Target: <strong className="text-emerald-400">{dimensions.newW} × {dimensions.newH}px</strong></span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs font-medium text-zinc-400 self-start mb-3 uppercase tracking-wider">Original Input</span>
              <div className="w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-zinc-900/40 flex items-center justify-center border border-zinc-800/40">
                {originalUrl && (
                  <img src={originalUrl} alt="Original" className="max-h-full max-w-full object-contain" />
                )}
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs font-medium text-blue-400 self-start mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Upscaled Result ({scaleFactor}x)
              </span>
              <div className="w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-zinc-900/40 flex items-center justify-center border border-zinc-800/40">
                {upscaledUrl ? (
                  <img src={upscaledUrl} alt="Upscaled Result" className="max-h-full max-w-full object-contain" />
                ) : isProcessing ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-sm font-medium text-blue-300">Applying multi-step resolution enhancement...</p>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 font-medium">Click Upscale Image below to generate</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-800/80">
            <button
              onClick={() => { setFile(null); setOriginalUrl(null); setUpscaledUrl(null); }}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Change Image
            </button>

            {!upscaledUrl ? (
              <button
                onClick={processUpscale}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {isProcessing ? "Upscaling..." : `Upscale ${scaleFactor}x Now`}
              </button>
            ) : (
              <a
                href={upscaledUrl}
                download={`upscaled_${scaleFactor}x.png`}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" /> Download {scaleFactor}x HD Image
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
