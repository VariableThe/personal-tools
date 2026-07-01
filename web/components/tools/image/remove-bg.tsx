"use client";

import React, { useState } from "react";
import { removeBackground } from "@imgly/background-removal";
import { Upload, Sparkles, Download, Loader2, RefreshCw } from "lucide-react";

export function RemoveBgTool() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setOriginalUrl(URL.createObjectURL(selected));
      setProcessedUrl(null);
      setError(null);
      setProgressMsg("");
      setProgressPercent(0);
    }
  };

  const handleRemoveBg = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgressMsg("Initializing on-device AI engine...");
    setProgressPercent(10);

    try {
      const blob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            setProgressPercent(pct);
            if (key.includes("fetch")) {
              setProgressMsg(`Downloading AI model weights locally: ${pct}%`);
            } else if (key.includes("compute")) {
              setProgressMsg(`Running neural segmentation inference: ${pct}%`);
            } else {
              setProgressMsg(`${key}: ${pct}%`);
            }
          } else {
            setProgressMsg(`Processing: ${key}...`);
          }
        },
      });

      const url = URL.createObjectURL(blob);
      setProcessedUrl(url);
      setProgressMsg("Completed!");
      setProgressPercent(100);
    } catch (err: any) {
      console.error("Background removal error:", err);
      setError(err?.message || "Failed to remove background. Ensure browser supports WebAssembly.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            On-Device AI Neural Network
          </div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            AI Background Removal
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Remove image backgrounds instantly in your browser with zero server upload.
          </p>
        </div>
      </div>

      {!file ? (
        <label className="border-2 border-dashed border-zinc-700/80 hover:border-emerald-500/50 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all bg-zinc-950/40 group">
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:scale-110 transition-all">
            <Upload className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-zinc-200">Drop photo here or click to browse</p>
            <p className="text-xs text-zinc-400 mt-1">Supports PNG, JPG, WEBP portraits & objects</p>
          </div>
        </label>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs font-medium text-zinc-400 self-start mb-3 uppercase tracking-wider">Original Photo</span>
              <div className="w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-zinc-900/40 flex items-center justify-center border border-zinc-800/40">
                {originalUrl && (
                  <img src={originalUrl} alt="Original" className="max-h-full max-w-full object-contain" />
                )}
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs font-medium text-emerald-400 self-start mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Result (Transparent Cutout)
              </span>
              <div className="w-full h-64 sm:h-80 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-800/40 relative"
                style={{
                  backgroundImage: `radial-gradient(#27272a 1px, transparent 1px), radial-gradient(#27272a 1px, #09090b 1px)`,
                  backgroundSize: `20px 20px`,
                  backgroundPosition: `0 0, 10px 10px`,
                }}
              >
                {processedUrl ? (
                  <img src={processedUrl} alt="Processed Cutout" className="max-h-full max-w-full object-contain relative z-10" />
                ) : isProcessing ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                    <p className="text-sm font-medium text-emerald-300">{progressMsg || "Processing AI Cutout..."}</p>
                    {progressPercent > 0 && (
                      <div className="w-48 bg-zinc-800 rounded-full h-2 mt-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 font-medium">Click Remove Background below to start</p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-800/80">
            <button
              onClick={() => { setFile(null); setOriginalUrl(null); setProcessedUrl(null); }}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Change Photo
            </button>

            {!processedUrl ? (
              <button
                onClick={handleRemoveBg}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isProcessing ? "AI Removing..." : "Remove Background Now"}
              </button>
            ) : (
              <a
                href={processedUrl}
                download="cutout_no_background.png"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Download className="w-4 h-4" /> Download Transparent PNG
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
