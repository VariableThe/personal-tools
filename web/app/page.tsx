"use client";

import React, { useState } from "react";
import {
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
  Search,
  Star,
  Sparkles,
  X,
  type LucideIcon,
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
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

interface ToolDef {
  id: string;
  label: string;
  icon: LucideIcon;
}

const CATEGORIES: Record<string, { label: string; icon: LucideIcon; tools: ToolDef[] }> = {
  pdf: {
    label: "PDF",
    icon: FolderKanban,
    tools: [
      { id: "merge", label: "Merge PDF", icon: Layers },
      { id: "split", label: "Split PDF", icon: Scissors },
      { id: "rotate", label: "Rotate PDF", icon: RotateCw },
      { id: "watermark", label: "Watermark", icon: Stamp },
      { id: "numbers", label: "Page Numbers", icon: Hash },
      { id: "img-to-pdf", label: "JPG to PDF", icon: FileImage },
      { id: "pdf-to-png", label: "PDF to PNG", icon: ImageIcon },
      { id: "notebooklm", label: "Notes to PDF", icon: BookOpenText },
    ],
  },
  image: {
    label: "Image",
    icon: ImageIcon,
    tools: [
      { id: "remove-bg", label: "AI Remove BG", icon: Sparkles },
      { id: "upscale", label: "HD Upscaler", icon: Zap },
      { id: "compress", label: "Compress & Resize", icon: Sliders },
      { id: "crop", label: "Crop Image", icon: Crop },
      { id: "watermark-img", label: "Watermark Photo", icon: Stamp },
      { id: "redact", label: "Redact / Blur", icon: EyeOff },
      { id: "ocr", label: "OCR to Text", icon: FileText },
      { id: "color", label: "Color Extractor", icon: Pipette },
    ],
  },
  audio: {
    label: "Audio",
    icon: Mic,
    tools: [{ id: "transcribe", label: "Audio Transcriber", icon: Mic }],
  },
  data: {
    label: "Data",
    icon: FileText,
    tools: [
      { id: "xml", label: "XML / Plist to CSV", icon: FileText },
      { id: "color-data", label: "Color Extractor", icon: Pipette },
    ],
  },
};

function categoryOf(toolId: string): string {
  for (const [cat, def] of Object.entries(CATEGORIES)) {
    if (def.tools.some((t) => t.id === toolId)) return cat;
  }
  return "pdf";
}

/** Initial category/tool from ?tool= deep link (or defaults). SSR-safe. */
function initialSelection(): { category: string; tool: string } {
  if (typeof window !== "undefined") {
    const id = new URLSearchParams(window.location.search).get("tool");
    if (id && categoryOf(id) !== "pdf") return { category: categoryOf(id), tool: id };
    if (id) {
      const known = Object.values(CATEGORIES).some((c) => c.tools.some((t) => t.id === id));
      if (known) return { category: "pdf", tool: id };
    }
  }
  return { category: "pdf", tool: "merge" };
}

function initialFavs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("vrbl-favs") || "[]");
  } catch {
    return [];
  }
}

const FAVS_KEY = "vrbl-favs";

export default function Home() {
  const [selection] = useState(initialSelection);
  const [category, setCategory] = useState(selection.category);
  const [activeTool, setActiveTool] = useState<Record<string, string>>({
    pdf: selection.category === "pdf" ? selection.tool : "merge",
    image: "compress",
    audio: "transcribe",
    data: "xml",
  });
  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState<string[]>(initialFavs);

  const totalTools = Object.values(CATEGORIES).reduce((n, c) => n + c.tools.length, 0);

  const selectTool = (cat: string, id: string) => {
    setCategory(cat);
    setActiveTool((prev) => ({ ...prev, [cat]: id }));
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tool", id);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // URL sync is best-effort (e.g. sandboxed iframes)
    }
  };

  const toggleFav = (id: string) => {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVS_KEY, JSON.stringify(next));
      } catch {
        // private mode etc. — favorites just don't persist
      }
      return next;
    });
  };

  const subBtn = (active: boolean) =>
    `flex items-center gap-2 px-3.5 py-2 border text-xs font-mono uppercase tracking-wide transition-colors font-medium ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
    }`;

  /** Tools for a category: favorites first, then filtered by search. */
  const visibleTools = (cat: string): ToolDef[] => {
    const q = query.trim().toLowerCase();
    const tools = CATEGORIES[cat].tools.filter(
      (t) => !q || t.label.toLowerCase().includes(q) || t.id.includes(q)
    );
    return [...tools].sort((a, b) => {
      const fa = favs.includes(a.id) ? 0 : 1;
      const fb = favs.includes(b.id) ? 0 : 1;
      return fa - fb;
    });
  };

  const toolButton = (cat: string, sub: ToolDef) => {
    const Icon = sub.icon;
    const isFav = favs.includes(sub.id);
    return (
      <span key={sub.id} className="inline-flex items-stretch">
        <button onClick={() => selectTool(cat, sub.id)} className={subBtn(activeTool[cat] === sub.id)}>
          <Icon className="w-4 h-4" /> {sub.label}
        </button>
        <button
          onClick={() => toggleFav(sub.id)}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
          aria-label={isFav ? `Unfavorite ${sub.label}` : `Favorite ${sub.label}`}
          className={`px-1.5 border border-l-0 transition-colors ${
            isFav
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground/40 hover:text-primary"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isFav ? "fill-current" : ""}`} />
        </button>
      </span>
    );
  };

  /** Global results across every category while searching. */
  const renderGlobalResults = () => {
    const q = query.trim().toLowerCase();
    const groups = Object.entries(CATEGORIES)
      .map(([cat, def]) => ({
        cat,
        label: def.label,
        tools: def.tools.filter(
          (t) => t.label.toLowerCase().includes(q) || t.id.includes(q)
        ),
      }))
      .filter((g) => g.tools.length > 0);
    if (groups.length === 0) {
      return <p className="text-center text-xs text-muted-foreground py-2">No tools match “{query}”.</p>;
    }
    return (
      <div className="space-y-3 border-b border-border pb-4">
        {groups.map((g) => (
          <div key={g.cat} className="flex items-center gap-3 flex-wrap justify-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-14 text-right">
              {g.label}
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {g.tools.map((t) => toolButton(g.cat, t))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /** First global match (for Enter-to-jump). */
  const firstMatch = (): { cat: string; id: string } | null => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    for (const [cat, def] of Object.entries(CATEGORIES)) {
      const hit = def.tools.find((t) => t.label.toLowerCase().includes(q) || t.id.includes(q));
      if (hit) return { cat, id: hit.id };
    }
    return null;
  };

  const renderSubRow = (cat: string) => {
    if (query.trim()) return renderGlobalResults();
    const tools = visibleTools(cat);
    return (
      <div className="flex flex-wrap gap-2 justify-center border-b border-border pb-4">
        {tools.map((sub) => toolButton(cat, sub))}
      </div>
    );
  };

  /** Active tool, falling back to the first visible match while searching. */
  const shownTool = (cat: string): string => {
    const tools = visibleTools(cat);
    if (tools.some((t) => t.id === activeTool[cat])) return activeTool[cat];
    return tools[0]?.id ?? "";
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-mono">
      <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter p5-skew">
              <span className="bg-foreground text-background px-2 py-0.5 inline-block p5-shadow">Tool</span>
              <span className="text-primary"> Suite</span>
            </h1>
            <p className="max-w-2xl text-xs text-muted-foreground font-mono leading-relaxed">
              {totalTools} utilities · PDF · image · audio · data — 100% on-device, zero uploads. No
              files ever leave your browser.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <Tabs
          value={category}
          onValueChange={(cat) => selectTool(cat, shownTool(cat))}
          className="w-full space-y-6"
        >
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <TabsList className="grid grid-cols-4 bg-card border border-border flex-1 h-auto p-1 gap-1">
              {Object.entries(CATEGORIES).map(([cat, def]) => {
                const CatIcon = def.icon;
                return (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary border border-transparent font-mono uppercase tracking-wide text-xs flex items-center justify-center gap-2"
                  >
                    <CatIcon className="w-4 h-4" />
                    {def.label} ({def.tools.length})
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <div className="relative sm:w-56 shrink-0">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const hit = firstMatch();
                    if (hit) selectTool(hit.cat, hit.id);
                  }
                }}
                placeholder="Filter tools…"
                aria-label="Filter tools"
                className="pl-8 pr-8"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <TabsContent value="pdf" className="space-y-6">
            {renderSubRow("pdf")}
            <div>
              {shownTool("pdf") === "merge" && <MergePdfTool />}
              {shownTool("pdf") === "split" && <SplitPdfTool />}
              {shownTool("pdf") === "rotate" && <RotatePdfTool />}
              {shownTool("pdf") === "watermark" && <WatermarkPdfTool />}
              {shownTool("pdf") === "numbers" && <PageNumbersPdfTool />}
              {shownTool("pdf") === "img-to-pdf" && <ImagesToPdfTool />}
              {shownTool("pdf") === "pdf-to-png" && <PdfToPngTool />}
              {shownTool("pdf") === "notebooklm" && <NotebookLmToPdfTool />}
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-6">
            {renderSubRow("image")}
            <div>
              {shownTool("image") === "remove-bg" && <RemoveBgTool />}
              {shownTool("image") === "upscale" && <ImageUpscalerTool />}
              {shownTool("image") === "compress" && <ImageResizerTool />}
              {shownTool("image") === "crop" && <CropImageTool />}
              {shownTool("image") === "watermark-img" && <WatermarkImageTool />}
              {shownTool("image") === "redact" && <RedactBlurTool />}
              {shownTool("image") === "ocr" && <ImageToTextTool />}
              {shownTool("image") === "color" && <ColorExtractorTool />}
            </div>
          </TabsContent>

          <TabsContent value="audio" className="space-y-6">
            {query.trim() && renderGlobalResults()}
            <div className="max-w-4xl mx-auto">
              <AudioTranscriberTool />
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            {renderSubRow("data")}
            <div>
              {shownTool("data") === "xml" && <XmlToCsvTool />}
              {shownTool("data") === "color-data" && <ColorExtractorTool />}
            </div>
          </TabsContent>
        </Tabs>

        <footer className="text-center pt-8 border-t border-border font-mono text-xs text-muted-foreground space-y-3">
          <p className="uppercase tracking-wide">
            {totalTools} tools · all local · vrbl.win design system · square · red · mono
          </p>
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
