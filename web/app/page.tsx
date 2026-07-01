"use client";

import React, { useState } from "react";
import {
  Shield,
  Sparkles,
  Layers,
  Scissors,
  RotateCw,
  Stamp,
  Hash,
  FileImage,
  Sliders,
  Crop,
  EyeOff,
  FileText,
  Pipette,
  Code,
  FolderKanban,
  Image as ImageIcon,
  Zap,
} from "lucide-react";

import { MergePdfTool } from "@/components/tools/pdf/merge-pdf";
import { SplitPdfTool } from "@/components/tools/pdf/split-pdf";
import { RotatePdfTool } from "@/components/tools/pdf/rotate-pdf";
import { WatermarkPdfTool } from "@/components/tools/pdf/watermark-pdf";
import { PageNumbersPdfTool } from "@/components/tools/pdf/page-numbers-pdf";
import { ImagesToPdfTool } from "@/components/tools/pdf/images-to-pdf";
import { PdfToPngTool } from "@/components/tools/pdf-to-png";

import { ImageResizerTool } from "@/components/tools/image-resizer";
import { CropImageTool } from "@/components/tools/image/crop-image";
import { WatermarkImageTool } from "@/components/tools/image/watermark-image";
import { RedactBlurTool } from "@/components/tools/image/redact-blur";
import { ImageToTextTool } from "@/components/tools/image-to-text";
import { ColorExtractorTool } from "@/components/tools/color-extractor";
import { RemoveBgTool } from "@/components/tools/image/remove-bg";
import { ImageUpscalerTool } from "@/components/tools/image/image-upscaler";

import { XmlToCsvTool } from "@/components/tools/xml-to-csv";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Home() {
  const [activeSubTabPdf, setActiveSubTabPdf] = useState("merge");
  const [activeSubTabImg, setActiveSubTabImg] = useState("compress");
  const [activeSubTabData, setActiveSubTabData] = useState("xml");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-500/30 selection:text-blue-200 font-sans">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-purple-600/10 blur-[140px] rounded-full opacity-70" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase animate-in fade-in duration-500">
            <Sparkles className="w-3.5 h-3.5" />
            Ultimate On-Device Utility Hub
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Tool Suite
          </h1>
          <p className="max-w-2xl mx-auto text-base text-zinc-400">
            Professional PDF editors, image manipulation utilities, and data converters powered by client-side WebAssembly & HTML5 Canvas.
          </p>

          {/* Privacy Banner */}
          <div className="max-w-3xl mx-auto mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 border border-emerald-500/20 flex items-center gap-4 text-left shadow-lg backdrop-blur-md">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                100% On-Device Execution & Zero Data Uploads
              </h3>
              <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                Every tool runs entirely in your web browser using WebAssembly workers (`pdf-lib`, `tesseract.js`) and graphics hardware (`Canvas`). <span className="font-semibold text-white">No files ever leave your device.</span>
              </p>
            </div>
          </div>
        </header>

        {/* Main Categories Tabs */}
        <Tabs defaultValue="pdf" className="w-full space-y-8">
          <div className="flex justify-center">
            <TabsList className="grid grid-cols-3 bg-zinc-900/80 border border-zinc-800 p-1.5 rounded-2xl w-full max-w-xl h-auto">
              <TabsTrigger
                value="pdf"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-xl py-2.5 px-4 font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <FolderKanban className="w-4 h-4" />
                PDF Suite (7 Tools)
              </TabsTrigger>
              <TabsTrigger
                value="image"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-xl py-2.5 px-4 font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                IMG Suite (8 Tools)
              </TabsTrigger>
              <TabsTrigger
                value="data"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-xl py-2.5 px-4 font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Data & Code (2 Tools)
              </TabsTrigger>
            </TabsList>
          </div>

          {/* PDF Suite Tab */}
          <TabsContent value="pdf" className="space-y-6">
            <div className="flex flex-wrap gap-2 justify-center border-b border-zinc-800/80 pb-4">
              {[
                { id: "merge", label: "Merge PDF", icon: <Layers className="w-4 h-4" /> },
                { id: "split", label: "Split PDF", icon: <Scissors className="w-4 h-4" /> },
                { id: "rotate", label: "Rotate PDF", icon: <RotateCw className="w-4 h-4" /> },
                { id: "watermark", label: "Watermark", icon: <Stamp className="w-4 h-4" /> },
                { id: "numbers", label: "Page Numbers", icon: <Hash className="w-4 h-4" /> },
                { id: "img-to-pdf", label: "JPG to PDF", icon: <FileImage className="w-4 h-4" /> },
                { id: "pdf-to-png", label: "PDF to PNG", icon: <ImageIcon className="w-4 h-4" /> },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubTabPdf(sub.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeSubTabPdf === sub.id
                      ? "bg-zinc-800 border border-blue-500/50 text-blue-300 shadow-md"
                      : "bg-zinc-950/40 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {sub.icon} {sub.label}
                </button>
              ))}
            </div>

            <div className="animate-in fade-in duration-300">
              {activeSubTabPdf === "merge" && <MergePdfTool />}
              {activeSubTabPdf === "split" && <SplitPdfTool />}
              {activeSubTabPdf === "rotate" && <RotatePdfTool />}
              {activeSubTabPdf === "watermark" && <WatermarkPdfTool />}
              {activeSubTabPdf === "numbers" && <PageNumbersPdfTool />}
              {activeSubTabPdf === "img-to-pdf" && <ImagesToPdfTool />}
              {activeSubTabPdf === "pdf-to-png" && <PdfToPngTool />}
            </div>
          </TabsContent>

          {/* IMG Suite Tab */}
          <TabsContent value="image" className="space-y-6">
            <div className="flex flex-wrap gap-2 justify-center border-b border-zinc-800/80 pb-4">
              {[
                { id: "remove-bg", label: "AI Remove BG", icon: <Sparkles className="w-4 h-4 text-emerald-400" /> },
                { id: "upscale", label: "HD Upscaler (2x/4x)", icon: <Zap className="w-4 h-4 text-blue-400" /> },
                { id: "compress", label: "Compress & Resize", icon: <Sliders className="w-4 h-4" /> },
                { id: "crop", label: "Crop Image", icon: <Crop className="w-4 h-4" /> },
                { id: "watermark-img", label: "Watermark Photo", icon: <Stamp className="w-4 h-4" /> },
                { id: "redact", label: "Redact / Blur Info", icon: <EyeOff className="w-4 h-4" /> },
                { id: "ocr", label: "OCR Image to Text", icon: <FileText className="w-4 h-4" /> },
                { id: "color", label: "Color Extractor", icon: <Pipette className="w-4 h-4" /> },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubTabImg(sub.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeSubTabImg === sub.id
                      ? "bg-zinc-800 border border-blue-500/50 text-blue-300 shadow-md"
                      : "bg-zinc-950/40 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {sub.icon} {sub.label}
                </button>
              ))}
            </div>

            <div className="animate-in fade-in duration-300">
              {activeSubTabImg === "remove-bg" && <RemoveBgTool />}
              {activeSubTabImg === "upscale" && <ImageUpscalerTool />}
              {activeSubTabImg === "compress" && <ImageResizerTool />}
              {activeSubTabImg === "crop" && <CropImageTool />}
              {activeSubTabImg === "watermark-img" && <WatermarkImageTool />}
              {activeSubTabImg === "redact" && <RedactBlurTool />}
              {activeSubTabImg === "ocr" && <ImageToTextTool />}
              {activeSubTabImg === "color" && <ColorExtractorTool />}
            </div>
          </TabsContent>

          {/* Data & Code Tab */}
          <TabsContent value="data" className="space-y-6">
            <div className="flex flex-wrap gap-2 justify-center border-b border-zinc-800/80 pb-4">
              {[
                { id: "xml", label: "XML / Plist to CSV", icon: <FileText className="w-4 h-4" /> },
                { id: "color-data", label: "Canvas Color Extractor", icon: <Pipette className="w-4 h-4" /> },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubTabData(sub.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeSubTabData === sub.id
                      ? "bg-zinc-800 border border-blue-500/50 text-blue-300 shadow-md"
                      : "bg-zinc-950/40 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {sub.icon} {sub.label}
                </button>
              ))}
            </div>

            <div className="animate-in fade-in duration-300">
              {activeSubTabData === "xml" && <XmlToCsvTool />}
              {activeSubTabData === "color-data" && <ColorExtractorTool />}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-zinc-900 text-xs text-zinc-500 space-y-3">
          <p>
            All 15 utility tools are fully functional inside your browser and included as standalone CLI scripts in the repository.
          </p>
          <div className="flex items-center justify-center gap-4 text-zinc-400">
            <a
              href="https://github.com/VariableThe/personal-tools"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors font-medium"
            >
              <Code className="w-4 h-4" /> View GitHub Repository
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
