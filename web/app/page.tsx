"use client";

import React, { useState } from "react";
import { Shield, Sparkles, FileText, Pipette, FileImage, Layers, Sliders, Terminal, Code } from "lucide-react";
import { XmlToCsvTool } from "@/components/tools/xml-to-csv";
import { ColorExtractorTool } from "@/components/tools/color-extractor";
import { PdfToPngTool } from "@/components/tools/pdf-to-png";
import { ImageToTextTool } from "@/components/tools/image-to-text";
import { ImageResizerTool } from "@/components/tools/image-resizer";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"xml" | "color" | "pdf" | "ocr" | "resize">("xml");

  const tools = [
    {
      id: "xml" as const,
      name: "XML to CSV",
      icon: <FileText className="w-4 h-4" />,
      badge: "Spreadsheets",
      description: "Flatten structured XML and Apple plist exports into downloadable CSVs.",
    },
    {
      id: "color" as const,
      name: "Color Extractor",
      icon: <Pipette className="w-4 h-4" />,
      badge: "Canvas Mask",
      description: "Isolate precise target RGB colors from images and export transparent cutouts.",
    },
    {
      id: "pdf" as const,
      name: "PDF to PNG",
      icon: <Layers className="w-4 h-4" />,
      badge: "High Resolution",
      description: "Render document pages into crisp PNG images or download bulk ZIP packages.",
    },
    {
      id: "ocr" as const,
      name: "Image to Text",
      icon: <FileImage className="w-4 h-4" />,
      badge: "WASM OCR",
      description: "Recognize optical character text from screenshots or scanned images.",
    },
    {
      id: "resize" as const,
      name: "Image Resizer",
      icon: <Sliders className="w-4 h-4" />,
      badge: "Compression",
      description: "Adjust pixel dimensions, modify quality, and convert image formats.",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-500/30 selection:text-blue-200">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-blue-600/20 via-purple-600/15 to-emerald-600/10 blur-[120px] rounded-full opacity-70" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase animate-in fade-in slide-in-from-top-4 duration-500">
            <Sparkles className="w-3.5 h-3.5" />
            Personal Utility Hub
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            On-Device Web Tools Suite
          </h1>
          <p className="max-w-2xl mx-auto text-base text-zinc-400">
            A fast, private toolkit built for file conversion, image manipulation, and document rendering.
          </p>

          {/* Privacy Banner */}
          <div className="max-w-3xl mx-auto mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 border border-emerald-500/20 flex items-center gap-4 text-left shadow-lg backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                100% On-Device Execution & Privacy Guaranteed
              </h3>
              <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                This webpage operates exclusively as a client-side interface. All file parsing, Canvas image processing, and WebAssembly OCR operations happen locally inside your browser sandbox. <span className="font-semibold text-white">Your files never leave your device.</span>
              </p>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-zinc-800 pb-4">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTab(tool.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === tool.id
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 scale-[1.02]"
                  : "bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60"
              }`}
            >
              {tool.icon}
              <span>{tool.name}</span>
            </button>
          ))}
        </div>

        {/* Active Tool Workspace */}
        <main className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Tool Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-6 mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">
                  {tools.find((t) => t.id === activeTab)?.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {tools.find((t) => t.id === activeTab)?.badge}
                </span>
              </div>
              <p className="text-sm text-zinc-400 mt-1">
                {tools.find((t) => t.id === activeTab)?.description}
              </p>
            </div>
            <div className="text-xs font-mono text-zinc-500 flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              CLI Equivalent Included in Repo
            </div>
          </div>

          {/* Dynamic Component Render */}
          <div className="min-h-[400px]">
            {activeTab === "xml" && <XmlToCsvTool />}
            {activeTab === "color" && <ColorExtractorTool />}
            {activeTab === "pdf" && <PdfToPngTool />}
            {activeTab === "ocr" && <ImageToTextTool />}
            {activeTab === "resize" && <ImageResizerTool />}
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-zinc-900 text-xs text-zinc-500 space-y-3">
          <p>
            All tools are available both as interactive client-side web tools and standalone Python command-line utilities.
          </p>
          <div className="flex items-center justify-center gap-4 text-zinc-400">
            <a
              href="https://github.com/VariableThe/personal-tools"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Code className="w-4 h-4" /> View GitHub Repository
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
