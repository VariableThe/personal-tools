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
  BookOpenText,
  Pipette,
  Code,
  FolderKanban,
  Image as ImageIcon,
  Zap,
  Mic,
} from "lucide-react";

import { MergePdfTool } from "@/components/tools/pdf/merge-pdf";
import { SplitPdfTool } from "@/components/tools/pdf/split-pdf";
import { RotatePdfTool } from "@/components/tools/pdf/rotate-pdf";
import { WatermarkPdfTool } from "@/components/tools/pdf/watermark-pdf";
import { PageNumbersPdfTool } from "@/components/tools/pdf/page-numbers-pdf";
import { ImagesToPdfTool } from "@/components/tools/pdf/images-to-pdf";
import { PdfToPngTool } from "@/components/tools/pdf-to-png";
import { NotebookLmToPdfTool } from "@/components/tools/notebooklm-to-pdf";

import { ImageResizerTool } from "@/components/tools/image-resizer";
import { CropImageTool } from "@/components/tools/image/crop-image";
import { WatermarkImageTool } from "@/components/tools/image/watermark-image";
import { RedactBlurTool } from "@/components/tools/image/redact-blur";
import { ImageToTextTool } from "@/components/tools/image-to-text";
import { ColorExtractorTool } from "@/components/tools/color-extractor";
import { RemoveBgTool } from "@/components/tools/image/remove-bg";
import { ImageUpscalerTool } from "@/components/tools/image/image-upscaler";

import { XmlToCsvTool } from "@/components/tools/xml-to-csv";
import { AudioTranscriberTool } from "@/components/tools/audio/audio-transcriber";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Home() {
  const [activeSubTabPdf, setActiveSubTabPdf] = useState("merge");
  const [activeSubTabImg, setActiveSubTabImg] = useState("compress");
  const [activeSubTabData, setActiveSubTabData] = useState("xml");

  const subBtn = (active: boolean) =>
    `flex items-center gap-2 px-3.5 py-2 border text-xs font-mono uppercase tracking-wide transition-colors font-medium ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
    }`;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-mono">
      <div className="relative max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        <header className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary/30 bg-primary/10 text-primary text-[10px] font-mono uppercase tracking-widest font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            vrbl.win · On-Device Utility Hub
          </div>

          <div className="space-y-1">
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter p5-skew">
              <span className="bg-foreground text-background px-2 py-1 inline-block p5-shadow">Tool</span>
              <span className="text-primary"> Suite</span>
            </h1>
            <p className="max-w-2xl mx-auto text-sm text-muted-foreground font-mono">
              PDF editors · image utilities · audio transcription — all running 100% locally in your browser.
            </p>
          </div>

          <div className="max-w-3xl mx-auto border border-border bg-card p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 border border-primary/20 bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest font-bold">100% On-Device · Zero Uploads</h3>
              <p className="font-mono text-xs text-muted-foreground mt-1 leading-relaxed">
                Every tool runs in your browser via WASM & Canvas (<span className="text-foreground font-bold">pdf-lib · tesseract.js · whisper</span>). No files ever leave your device.
              </p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="pdf" className="w-full space-y-8">
          <div className="flex justify-center">
            <TabsList className="grid grid-cols-4 bg-card border border-border w-full max-w-2xl h-auto p-1 gap-1">
              <TabsTrigger
                value="pdf"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary border border-transparent font-mono uppercase tracking-wide text-xs flex items-center justify-center gap-2"
              >
                <FolderKanban className="w-4 h-4" />
                PDF (8)
              </TabsTrigger>
              <TabsTrigger
                value="image"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary border border-transparent font-mono uppercase tracking-wide text-xs flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Image (8)
              </TabsTrigger>
              <TabsTrigger
                value="audio"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary border border-transparent font-mono uppercase tracking-wide text-xs flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Audio (1)
              </TabsTrigger>
              <TabsTrigger
                value="data"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary border border-transparent font-mono uppercase tracking-wide text-xs flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Data (2)
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pdf" className="space-y-6">
            <div className="flex flex-wrap gap-2 justify-center border-b border-border pb-4">
              {[
                { id: "merge", label: "Merge PDF", icon: <Layers className="w-4 h-4" /> },
                { id: "split", label: "Split PDF", icon: <Scissors className="w-4 h-4" /> },
                { id: "rotate", label: "Rotate PDF", icon: <RotateCw className="w-4 h-4" /> },
                { id: "watermark", label: "Watermark", icon: <Stamp className="w-4 h-4" /> },
                { id: "numbers", label: "Page Numbers", icon: <Hash className="w-4 h-4" /> },
                { id: "img-to-pdf", label: "JPG to PDF", icon: <FileImage className="w-4 h-4" /> },
                { id: "pdf-to-png", label: "PDF to PNG", icon: <ImageIcon className="w-4 h-4" /> },
                { id: "notebooklm", label: "Notes to PDF", icon: <BookOpenText className="w-4 h-4" /> },
              ].map((sub) => (
                <button key={sub.id} onClick={() => setActiveSubTabPdf(sub.id)} className={subBtn(activeSubTabPdf === sub.id)}>
                  {sub.icon} {sub.label}
                </button>
              ))}
            </div>
            <div>
              {activeSubTabPdf === "merge" && <MergePdfTool />}
              {activeSubTabPdf === "split" && <SplitPdfTool />}
              {activeSubTabPdf === "rotate" && <RotatePdfTool />}
              {activeSubTabPdf === "watermark" && <WatermarkPdfTool />}
              {activeSubTabPdf === "numbers" && <PageNumbersPdfTool />}
              {activeSubTabPdf === "img-to-pdf" && <ImagesToPdfTool />}
              {activeSubTabPdf === "pdf-to-png" && <PdfToPngTool />}
              {activeSubTabPdf === "notebooklm" && <NotebookLmToPdfTool />}
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-6">
            <div className="flex flex-wrap gap-2 justify-center border-b border-border pb-4">
              {[
                { id: "remove-bg", label: "AI Remove BG", icon: <Sparkles className="w-4 h-4" /> },
                { id: "upscale", label: "HD Upscaler", icon: <Zap className="w-4 h-4" /> },
                { id: "compress", label: "Compress & Resize", icon: <Sliders className="w-4 h-4" /> },
                { id: "crop", label: "Crop Image", icon: <Crop className="w-4 h-4" /> },
                { id: "watermark-img", label: "Watermark Photo", icon: <Stamp className="w-4 h-4" /> },
                { id: "redact", label: "Redact / Blur", icon: <EyeOff className="w-4 h-4" /> },
                { id: "ocr", label: "OCR to Text", icon: <FileText className="w-4 h-4" /> },
                { id: "color", label: "Color Extractor", icon: <Pipette className="w-4 h-4" /> },
              ].map((sub) => (
                <button key={sub.id} onClick={() => setActiveSubTabImg(sub.id)} className={subBtn(activeSubTabImg === sub.id)}>
                  {sub.icon} {sub.label}
                </button>
              ))}
            </div>
            <div>
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

          <TabsContent value="audio" className="space-y-6">
            <div className="flex justify-center border-b border-border pb-4">
              <div className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground border border-primary font-mono text-xs uppercase tracking-wide font-bold">
                <Mic className="w-4 h-4" /> Audio Transcriber — Whisper (on-device)
              </div>
            </div>
            <div className="max-w-4xl mx-auto">
              <AudioTranscriberTool />
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <div className="flex flex-wrap gap-2 justify-center border-b border-border pb-4">
              {[
                { id: "xml", label: "XML / Plist to CSV", icon: <FileText className="w-4 h-4" /> },
                { id: "color-data", label: "Color Extractor", icon: <Pipette className="w-4 h-4" /> },
              ].map((sub) => (
                <button key={sub.id} onClick={() => setActiveSubTabData(sub.id)} className={subBtn(activeSubTabData === sub.id)}>
                  {sub.icon} {sub.label}
                </button>
              ))}
            </div>
            <div>
              {activeSubTabData === "xml" && <XmlToCsvTool />}
              {activeSubTabData === "color-data" && <ColorExtractorTool />}
            </div>
          </TabsContent>
        </Tabs>

        <footer className="text-center pt-8 border-t border-border font-mono text-xs text-muted-foreground space-y-3">
          <p className="uppercase tracking-wide">17 tools · all local · vrbl.win design system · square · red · mono</p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://github.com/VariableThe/personal-tools"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 hover:border-foreground hover:text-foreground transition-colors font-bold uppercase tracking-wide"
            >
              <Code className="w-4 h-4" /> GitHub
            </a>
            <a href="https://intro.vrbl.win" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
              intro.vrbl.win →
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
