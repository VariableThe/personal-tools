"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  SkipForward,
  Undo2,
  Download,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Film,
  RotateCcw,
  ListChecks,
} from "lucide-react";
import JSZip from "jszip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  buildMediaItems,
  revokeItems,
  formatBytes,
  type MediaItem,
} from "@/lib/media-files";
import { FileDropzone } from "@/components/tools/video/file-dropzone";

type Pile = "keep" | "discard" | "skip";

interface HistoryEntry {
  id: string;
  pile: Pile;
}

export function KeepDiscardTool() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [keepIds, setKeepIds] = useState<string[]>([]);
  const [discardIds, setDiscardIds] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [heicProgress, setHeicProgress] = useState<{ done: number; total: number } | null>(null);
  const [zipping, setZipping] = useState<"keep" | "discard" | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const done = items.length > 0 && cursor >= items.length;
  const current: MediaItem | null = !done ? items[cursor] ?? null : null;

  // Pause video + revoke URLs on unmount.
  useEffect(() => {
    const videoAtMount = videoRef.current;
    return () => {
      try {
        videoAtMount?.pause();
      } catch {
        // no video mounted — harmless
      }
      setItems((prev) => {
        revokeItems(prev);
        return prev;
      });
    };
  }, []);

  function addFiles(files: FileList | File[]) {
    void (async () => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setError(null);
      const { items: fast, failed, skipped } = await buildMediaItems(
        list,
        (heicItem) => setItems((prev) => [...prev, heicItem]),
        (doneCount, total) => {
          if (doneCount >= total) setHeicProgress(null);
          else setHeicProgress({ done: doneCount, total });
        }
      );
      if (fast.length > 0) setItems((prev) => [...prev, ...fast]);
      const added = fast.length; // HEIC items stream in via callback
      const problems = [
        failed.length > 0 ? `couldn't decode: ${failed.join(", ")}` : "",
        skipped.length > 0 ? `skipped: ${skipped.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      if (added === 0 && failed.length > 0) {
        setError(
          `Couldn't decode those photos on-device (${failed.join(", ")}). Convert to JPG and retry.`
        );
      } else if (added === 0 && skipped.length > 0) {
        setError(
          `No images or videos in that selection — try JPG, PNG, WebP, HEIC, MP4, WebM or MOV. Skipped: ${skipped.join(", ")}.`
        );
      } else if (problems) {
        setError(`Picking up files… ${problems}.`);
      } else {
        setError(null);
      }
    })();
  }

  const decide = useCallback(
    (pile: Pile) => {
      const item = items[cursor];
      if (!item || cursor >= items.length) return;
      setHistory((prev) => [...prev, { id: item.id, pile }]);
      if (pile === "keep") setKeepIds((prev) => [...prev, item.id]);
      else if (pile === "discard") setDiscardIds((prev) => [...prev, item.id]);
      setCursor((c) => c + 1);
    },
    [items, cursor]
  );

  function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((prev) => prev.slice(0, -1));
    if (last.pile === "keep") setKeepIds((prev) => prev.filter((id) => id !== last.id));
    else if (last.pile === "discard")
      setDiscardIds((prev) => prev.filter((id) => id !== last.id));
    const idx = items.findIndex((it) => it.id === last.id);
    setCursor(idx >= 0 ? idx : 0);
  }

  function reset() {
    try {
      videoRef.current?.pause();
    } catch {
      // no video mounted — harmless
    }
    revokeItems(items);
    setItems([]);
    setCursor(0);
    setKeepIds([]);
    setDiscardIds([]);
    setHistory([]);
    setError(null);
    setHeicProgress(null);
  }

  // Keyboard: K/→ keep · D/← discard · Space/↓ skip · U/⌫ undo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (items.length === 0) return;
      const k = e.key.toLowerCase();
      if (k === "k" || e.key === "ArrowRight") decide("keep");
      else if (k === "d" || e.key === "ArrowLeft") decide("discard");
      else if (k === " " || e.key === "ArrowDown") {
        e.preventDefault();
        decide("skip");
      } else if (k === "u" || e.key === "Backspace") {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decide, done, items.length]);

  // Preload the next two images while deciding.
  useEffect(() => {
    for (let k = 1; k <= 2; k++) {
      const nxt = items[cursor + k];
      if (nxt && nxt.kind === "image") {
        const p = new Image();
        p.src = nxt.previewUrl;
      }
    }
  }, [items, cursor]);

  async function downloadPile(which: "keep" | "discard") {
    const ids = which === "keep" ? keepIds : discardIds;
    if (ids.length === 0 || zipping) return;
    setZipping(which);
    try {
      const zip = new JSZip();
      const used = new Set<string>();
      for (const id of ids) {
        const it = items.find((x) => x.id === id);
        if (!it) continue;
        let name = it.name;
        if (used.has(name)) {
          const dot = name.lastIndexOf(".");
          const base = dot > 0 ? name.slice(0, dot) : name;
          const ext = dot > 0 ? name.slice(dot) : "";
          let n = 1;
          while (used.has(`${base}_${n}${ext}`)) n += 1;
          name = `${base}_${n}${ext}`;
        }
        used.add(name);
        zip.file(name, it.file);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `${which}-pile.zip`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setZipping(null);
    }
  }

  const sorted = keepIds.length + discardIds.length;
  const total = items.length;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2 p5-skew">
            <span className="bg-primary text-primary-foreground px-2 py-0.5">Keep</span>
            <span>or Discard</span>
            <ListChecks className="w-5 h-5 text-primary" />
          </CardTitle>
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 font-mono">
            100% ON-DEVICE · BROWSER
          </Badge>
        </div>
        <CardDescription className="font-mono text-xs">
          Step through a batch, split keep from discard. Exports as ZIPs. Nothing uploads.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {items.length === 0 ? (
          <FileDropzone
            accept="image/*,video/*,.heic,.heif"
            onFiles={(files) => addFiles(files)}
            formatsLine="JPG PNG WebP · HEIC auto-converts · MP4 WebM MOV"
            progress={heicProgress}
          />
        ) : done ? (
          <div className="space-y-4 text-center py-6">
            <p className="text-2xl font-black uppercase tracking-tight">Sorted ✓</p>
            <p className="font-mono text-sm text-muted-foreground">
              <span className="text-primary font-bold">{keepIds.length} keep</span>
              {" · "}
              <span className="text-destructive font-bold">{discardIds.length} discard</span>
              {total - sorted > 0 && ` · ${total - sorted} skipped`}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={() => void downloadPile("keep")}
                disabled={keepIds.length === 0 || zipping !== null}
                className="rounded-none font-mono text-xs uppercase tracking-widest font-bold"
              >
                {zipping === "keep" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download keep pile ({keepIds.length})
              </Button>
              <Button
                onClick={() => void downloadPile("discard")}
                disabled={discardIds.length === 0 || zipping !== null}
                variant="outline"
                className="rounded-none font-mono text-xs uppercase tracking-widest"
              >
                {zipping === "discard" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download discard pile ({discardIds.length})
              </Button>
              <Button
                onClick={reset}
                variant="outline"
                className="rounded-none font-mono text-xs uppercase tracking-widest"
              >
                <RotateCcw className="w-4 h-4" /> Start over
              </Button>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              ZIPs contain your original files, byte-for-byte — conversions are preview-only.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
              <span className="border border-border bg-muted/20 px-2.5 py-1">
                left <b>{total - cursor}</b>
              </span>
              <span className="border border-primary/40 bg-primary/10 px-2.5 py-1">
                keep <b className="text-primary">{keepIds.length}</b>
              </span>
              <span className="border border-destructive/40 bg-destructive/10 px-2.5 py-1">
                discard <b className="text-destructive">{discardIds.length}</b>
              </span>
              <span className="ml-auto text-muted-foreground tabular-nums">
                {cursor + 1} / {total}
              </span>
            </div>
            <Progress value={total > 0 ? (cursor / total) * 100 : 0} />

            <div className="border border-border bg-black min-h-64 flex items-center justify-center overflow-hidden">
              {current?.kind === "video" ? (
                <video
                  ref={videoRef}
                  key={current.id}
                  src={current.previewUrl}
                  controls
                  autoPlay
                  muted
                  playsInline
                  loop
                  className="max-h-[60vh] w-full"
                />
              ) : current ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.previewUrl}
                  alt={current.name}
                  className="max-h-[60vh] w-full object-contain"
                />
              ) : null}
            </div>
            {current && (
              <p className="font-mono text-xs text-muted-foreground truncate text-center">
                {current.kind === "video" ? (
                  <Film className="w-3 h-3 inline mr-1 -mt-0.5" />
                ) : (
                  <ImageIcon className="w-3 h-3 inline mr-1 -mt-0.5" />
                )}
                {current.name} · {formatBytes(current.size)}
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                onClick={() => decide("discard")}
                variant="outline"
                className="rounded-none font-mono text-xs uppercase tracking-widest font-bold border-destructive/40 text-destructive hover:bg-destructive/10 h-auto py-3"
              >
                <span className="flex flex-col items-center gap-1">
                  <span className="flex items-center gap-1.5">
                    <ThumbsDown className="w-4 h-4" /> Discard
                  </span>
                  <kbd className="text-[10px] opacity-70 font-normal">D / ←</kbd>
                </span>
              </Button>
              <Button
                onClick={() => decide("skip")}
                variant="outline"
                className="rounded-none font-mono text-xs uppercase tracking-widest h-auto py-3"
              >
                <span className="flex flex-col items-center gap-1">
                  <span className="flex items-center gap-1.5">
                    <SkipForward className="w-4 h-4" /> Skip
                  </span>
                  <kbd className="text-[10px] opacity-70 font-normal">Space</kbd>
                </span>
              </Button>
              <Button
                onClick={undo}
                disabled={history.length === 0}
                variant="outline"
                className="rounded-none font-mono text-xs uppercase tracking-widest h-auto py-3"
              >
                <span className="flex flex-col items-center gap-1">
                  <span className="flex items-center gap-1.5">
                    <Undo2 className="w-4 h-4" /> Undo
                  </span>
                  <kbd className="text-[10px] opacity-70 font-normal">U</kbd>
                </span>
              </Button>
              <Button
                onClick={() => decide("keep")}
                className="rounded-none font-mono text-xs uppercase tracking-widest font-bold h-auto py-3"
              >
                <span className="flex flex-col items-center gap-1">
                  <span className="flex items-center gap-1.5">
                    <ThumbsUp className="w-4 h-4" /> Keep
                  </span>
                  <kbd className="text-[10px] opacity-70 font-normal">K / →</kbd>
                </span>
              </Button>
            </div>
            <div className="flex justify-center">
              <Button
                onClick={reset}
                variant="ghost"
                size="sm"
                className="rounded-none font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear batch
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="rounded-none">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
