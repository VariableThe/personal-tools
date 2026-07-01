"use client";

import React, { useState } from "react";
import { Upload, FileText, Copy, Check, RefreshCw, Eye } from "lucide-react";

export function ImageToTextTool() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState("extracted_text.txt");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name.replace(/\.[^/.]+$/, "") + "_ocr.txt");
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setImageSrc(src);
      runOcr(src);
    };
    reader.readAsDataURL(file);
  };

  const runOcr = async (src: string) => {
    setLoading(true);
    setText("");
    setProgress(0);
    setStatusText("Initializing WebAssembly OCR engine...");

    try {
      const Tesseract = await import("tesseract.js");
      const worker = await Tesseract.createWorker("eng", 1, {
        logger: (m) => {
          if (m.status) {
            setStatusText(m.status);
          }
          if (typeof m.progress === "number") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const ret = await worker.recognize(src);
      setText(ret.data.text);
      await worker.terminate();
    } catch (err: any) {
      setText("Error executing OCR: " + (err.message || String(err)));
    } finally {
      setLoading(false);
      setStatusText("Completed");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-zinc-700/60 hover:border-blue-500/80 rounded-2xl p-8 transition-all bg-zinc-900/40 text-center">
        <input
          type="file"
          accept="image/*"
          id="ocr-upload"
          className="hidden"
          onChange={handleFileUpload}
        />
        <label
          htmlFor="ocr-upload"
          className="cursor-pointer flex flex-col items-center justify-center space-y-3"
        >
          <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              Select an Image containing Text
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              Runs Tesseract WebAssembly optical character recognition completely on device.
            </p>
          </div>
          <span className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all">
            Upload Image for OCR
          </span>
        </label>
      </div>

      {loading && (
        <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
          <p className="text-sm font-medium text-zinc-200 capitalize">{statusText}</p>
          <div className="w-full bg-zinc-800 rounded-full h-2 max-w-md mx-auto overflow-hidden">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400">{progress}%</span>
        </div>
      )}

      {imageSrc && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
              Source Image
            </span>
            <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-950/60 flex items-center justify-center min-h-[300px]">
              <img src={imageSrc} alt="Source for OCR" className="max-h-80 object-contain rounded-lg shadow" />
            </div>
          </div>

          <div className="space-y-2 flex flex-col">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Extracted Text Output
              </span>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  disabled={!text}
                  className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={downloadTxt}
                  disabled={!text}
                  className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow transition-all"
                >
                  Download .TXT
                </button>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Extracted text will appear here..."
              className="w-full flex-grow p-4 bg-zinc-950 border border-zinc-800 rounded-2xl font-mono text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[300px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
