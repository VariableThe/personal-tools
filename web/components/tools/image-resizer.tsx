"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Sliders, Download, RefreshCw, FileImage } from "lucide-react";

export function ImageResizerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [origWidth, setOrigWidth] = useState(0);
  const [origHeight, setOrigHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [format, setFormat] = useState<"image/png" | "image/jpeg" | "image/webp">("image/webp");
  const [quality, setQuality] = useState(85);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    setFile(uploaded);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
    };
    reader.readAsDataURL(uploaded);
  };

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      setOrigWidth(img.width);
      setOrigHeight(img.height);
      setWidth(img.width);
      setHeight(img.height);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (imageSrc && width > 0 && height > 0) {
      processResizedImage();
    }
  }, [imageSrc, width, height, format, quality]);

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (maintainAspect && origWidth > 0) {
      setHeight(Math.round((val / origWidth) * origHeight));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (maintainAspect && origHeight > 0) {
      setWidth(Math.round((val / origHeight) * origWidth));
    }
  };

  const processResizedImage = () => {
    if (!imageSrc) return;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL(format, quality / 100.0);
      setOutputUrl(dataUrl);

      // calculate approx bytes from base64
      const base64Len = dataUrl.split(",")[1].length;
      const approxBytes = Math.round((base64Len * 3) / 4);
      setOutputSize(approxBytes);
    };
    img.src = imageSrc;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const downloadImage = () => {
    if (!outputUrl || !file) return;
    const ext = format === "image/png" ? "png" : format === "image/jpeg" ? "jpg" : "webp";
    const a = document.createElement("a");
    a.href = outputUrl;
    a.setAttribute("download", `${file.name.replace(/\.[^/.]+$/, "")}_resized.${ext}`);
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
            id="resizer-upload"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="resizer-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Select an Image to Resize & Convert</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Compress, adjust resolution, or convert between WEBP, PNG, and JPG locally.
              </p>
            </div>
            <span className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all">
              Choose Image
            </span>
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-6">
            <h4 className="font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Sliders className="w-4 h-4 text-blue-400" />
              Resize Settings
            </h4>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">Dimensions (px)</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="text-[10px] text-zinc-500 block">Width</span>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => handleWidthChange(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-200"
                    />
                  </div>
                  <span className="text-zinc-600 mt-4">×</span>
                  <div className="flex-1">
                    <span className="text-[10px] text-zinc-500 block">Height</span>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => handleHeightChange(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-200"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={maintainAspect}
                  onChange={(e) => setMaintainAspect(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-800 text-blue-500 focus:ring-0"
                />
                Maintain Aspect Ratio
              </label>

              <div className="border-t border-zinc-800 pt-4">
                <label className="text-xs font-medium text-zinc-400 block mb-2">Export Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["image/webp", "image/png", "image/jpeg"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-all uppercase ${
                        format === fmt
                          ? "bg-blue-600/20 border-blue-500 text-blue-400 font-semibold"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      {fmt.split("/")[1]}
                    </button>
                  ))}
                </div>
              </div>

              {format !== "image/png" && (
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Quality</span>
                    <span className="font-mono text-zinc-300">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              )}

              <div className="border-t border-zinc-800 pt-4 space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Original Size:</span>
                  <span className="font-mono text-zinc-300">{file ? formatBytes(file.size) : "-"}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>New Approx Size:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {outputSize ? formatBytes(outputSize) : "-"}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={downloadImage}
                  disabled={!outputUrl}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-600/20 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Processed Image
                </button>
                <button
                  onClick={() => setImageSrc(null)}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-all"
                >
                  Select Another Image
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 border border-zinc-800 rounded-2xl p-4 bg-zinc-950/60 flex flex-col items-center justify-center min-h-[400px]">
            {outputUrl ? (
              <img src={outputUrl} alt="Resized Preview" className="max-h-[450px] object-contain rounded-lg shadow" />
            ) : (
              <span className="text-sm text-zinc-500">Processing preview...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
