"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Pipette, Download, RefreshCw } from "lucide-react";

export function ColorExtractorTool() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [targetHex, setTargetHex] = useState("#3B82F6");
  const [tolerance, setTolerance] = useState(40);
  const [isPicking, setIsPicking] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState("extracted_mask.png");

  const origCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const procCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name.replace(/\.[^/.]+$/, "") + "_cutout.png");
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const origCanvas = origCanvasRef.current;
      if (!origCanvas) return;
      origCanvas.width = img.width;
      origCanvas.height = img.height;
      const ctx = origCanvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      processColorMask();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (imageSrc) {
      processColorMask();
    }
  }, [targetHex, tolerance]);

  const hexToRgb = (hex: string) => {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  };

  const processColorMask = () => {
    const origCanvas = origCanvasRef.current;
    const procCanvas = procCanvasRef.current;
    if (!origCanvas || !procCanvas) return;

    setProcessing(true);
    setTimeout(() => {
      const width = origCanvas.width;
      const height = origCanvas.height;
      procCanvas.width = width;
      procCanvas.height = height;

      const origCtx = origCanvas.getContext("2d");
      const procCtx = procCanvas.getContext("2d");
      if (!origCtx || !procCtx) return;

      const imgData = origCtx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const target = hexToRgb(targetHex);

      const tolSq = tolerance * tolerance * 3; // approximation Euclidean distance threshold

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const distSq =
          (r - target.r) * (r - target.r) +
          (g - target.g) * (g - target.g) +
          (b - target.b) * (b - target.b);

        if (distSq > tolSq) {
          data[i + 3] = 0; // set transparent
        }
      }

      procCtx.putImageData(imgData, 0, 0);
      setProcessedUrl(procCanvas.toDataURL("image/png"));
      setProcessing(false);
    }, 10);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPicking) return;
    const canvas = origCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex =
      "#" +
      ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
        .toString(16)
        .slice(1)
        .toUpperCase();

    setTargetHex(hex);
    setIsPicking(false);
  };

  const downloadCutout = () => {
    if (!processedUrl) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.setAttribute("download", fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {!imageSrc ? (
        <div className="border-2 border-dashed border-zinc-700/60 hover:border-blue-500/80 rounded-2xl p-8 transition-all bg-zinc-900/40 text-center">
          <input
            type="file"
            accept="image/*"
            id="img-upload"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="img-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Select an Image to Isolate Colors</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Supports PNG, JPG, WEBP. All processing executes locally on your graphics canvas.
              </p>
            </div>
            <span className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all">
              Choose Image
            </span>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={targetHex}
                  onChange={(e) => setTargetHex(e.target.value.toUpperCase())}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={targetHex}
                  onChange={(e) => setTargetHex(e.target.value.toUpperCase())}
                  className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm font-mono text-zinc-200"
                />
              </div>

              <button
                onClick={() => setIsPicking(!isPicking)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                  isPicking
                    ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30 animate-pulse"
                    : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300"
                }`}
              >
                <Pipette className="w-3.5 h-3.5" />
                {isPicking ? "Click Image to Pick Color..." : "Pick Color from Canvas"}
              </button>

              <div className="flex items-center gap-3 bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-zinc-800">
                <span className="text-xs font-medium text-zinc-400">Tolerance: {tolerance}</span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                  className="w-28 accent-blue-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setImageSrc(null)}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-all"
              >
                Change Image
              </button>
              <button
                onClick={downloadCutout}
                disabled={!processedUrl}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-medium shadow-lg shadow-emerald-600/20 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Transparent Cutout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Original Image {isPicking && <span className="text-purple-400 font-normal">(Click anywhere on image to select color)</span>}
              </span>
              <div
                className={`border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/80 flex items-center justify-center p-2 min-h-[300px] ${
                  isPicking ? "cursor-crosshair ring-2 ring-purple-500" : ""
                }`}
              >
                <canvas
                  ref={origCanvasRef}
                  onClick={handleCanvasClick}
                  className="max-w-full max-h-[450px] object-contain rounded-lg shadow-md"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex justify-between items-center">
                <span>Transparent Cutout Preview</span>
                {processing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />}
              </span>
              <div
                className="border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center p-2 min-h-[300px]"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  backgroundColor: "#09090b",
                }}
              >
                <canvas
                  ref={procCanvasRef}
                  className="max-w-full max-h-[450px] object-contain rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
