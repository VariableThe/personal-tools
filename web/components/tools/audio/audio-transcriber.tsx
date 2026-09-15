"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Upload, Trash2, Copy, Check, Download, Loader2, HardDrive, Shield, AlertCircle, FileAudio } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ModelId = "Xenova/whisper-tiny" | "Xenova/whisper-base" | "Xenova/whisper-small";

const MODELS: { id: ModelId; label: string; size: string; desc: string }[] = [
  { id: "Xenova/whisper-tiny", label: "tiny", size: "~40MB", desc: "fastest — good for 2-3 min notes" },
  { id: "Xenova/whisper-base", label: "base", size: "~150MB", desc: "balanced — recommended" },
  { id: "Xenova/whisper-small", label: "small", size: "~500MB", desc: "most accurate" },
];

async function getCacheSize(): Promise<string | null> {
  try {
    if (!("caches" in window) || !("storage" in navigator) || !navigator.storage.estimate) return null;
    const est = await navigator.storage.estimate();
    if (est.usage == null) return null;
    const mb = est.usage / (1024 * 1024);
    if (mb < 1) return `${Math.round(est.usage / 1024)} KB used`;
    return `${mb.toFixed(1)} MB used`;
  } catch {
    return null;
  }
}

async function clearAllCaches(): Promise<{ cleared: boolean; msg: string }> {
  let clearedAny = false;
  const errors: string[] = [];
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      for (const k of keys) {
        try {
          await caches.delete(k);
          clearedAny = true;
        } catch (e: any) {
          errors.push(k);
        }
      }
    }
  } catch {}
  try {
    const dbs = (await (indexedDB as any).databases?.()) as { name: string }[] | undefined;
    if (dbs) {
      for (const db of dbs) {
        if (db.name) {
          try {
            indexedDB.deleteDatabase(db.name);
            clearedAny = true;
          } catch {}
        }
      }
    } else {
      const candidates = ["transformers-cache", "xenova-cache", "keyval-store"];
      for (const n of candidates) {
        try {
          indexedDB.deleteDatabase(n);
        } catch {}
      }
    }
  } catch {}
  try {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      // best effort - cannot selectively clear without clearing site data, just report
    }
  } catch {}
  if (errors.length) return { cleared: clearedAny, msg: `Cleared caches. Some entries busy: ${errors.join(", ")}` };
  return { cleared: clearedAny, msg: clearedAny ? "All cached model weights cleared." : "No cached weights found." };
}

export function AudioTranscriberTool() {
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState<ModelId>("Xenova/whisper-tiny");
  const [language, setLanguage] = useState<string>("auto");
  const [text, setText] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ duration?: number; timeTaken?: number; lang?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearMsg, setClearMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const refreshCacheInfo = useCallback(async () => {
    setCacheInfo(await getCacheSize());
  }, []);

  useEffect(() => {
    refreshCacheInfo();
  }, [refreshCacheInfo]);

  const handleFile = (f: File) => {
    setFile(f);
    setText("");
    setError(null);
    setMeta(null);
    setProgress(0);
    setStatus("");
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const transcribe = async () => {
    if (!file) return;
    setIsTranscribing(true);
    setError(null);
    setText("");
    setProgress(5);
    setStatus("Loading model — first run downloads weights…");
    const start = performance.now();

    try {
      const { pipeline, env } = await import("@huggingface/transformers");
      // @ts-ignore - allow local cache
      env.allowLocalModels = false;
      // use browser cache
      // @ts-ignore
      env.useBrowserCache = true;

      setProgress(15);
      setStatus("Downloading / warming model…");

      const transcriber: any = await pipeline("automatic-speech-recognition", model, {
        progress_callback: (p: any) => {
          if (p.status === "progress" && p.progress != null) {
            const pct = Math.round(p.progress);
            setProgress(15 + Math.round(pct * 0.6));
            setStatus(`Downloading weights: ${pct}% — ${p.file || p.status}`);
          } else if (p.status === "downloading" || p.status === "download") {
            setStatus(`Downloading: ${p.file || ""}`);
          } else if (p.status === "ready" || p.status === "done") {
            setProgress(75);
            setStatus("Model ready — transcribing audio…");
          } else if (p.status) {
            setStatus(String(p.status));
          }
        },
      } as any);

      setProgress(78);
      setStatus("Decoding audio & running Whisper…");

      const url = URL.createObjectURL(file);
      const result: any = await transcriber(url, {
        language: language === "auto" ? undefined : language,
        task: "transcribe",
        chunk_length_s: 30,
        stride_length_s: 5,
      });
      URL.revokeObjectURL(url);

      const out = typeof result?.text === "string" ? result.text : Array.isArray(result) ? result.map((r: any) => r.text).join(" ") : "";
      setText(out.trim());
      setProgress(100);
      setStatus("Done");
      setMeta({
        duration: file.size ? undefined : undefined,
        timeTaken: Math.round((performance.now() - start) / 100) / 10,
        lang: language === "auto" ? result?.language || "auto" : language,
      });
      refreshCacheInfo();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || String(e) || "Transcription failed. Try a smaller file or tiny model.");
      setProgress(0);
      setStatus("");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleClearWeights = async () => {
    setClearing(true);
    setClearMsg(null);
    const r = await clearAllCaches();
    setClearMsg(r.msg);
    setClearing(false);
    refreshCacheInfo();
    setTimeout(() => setClearMsg(null), 4000);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (file?.name.replace(/\.[^/.]+$/, "") || "transcription") + ".txt";
    a.click();
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2 p5-skew">
            <span className="bg-primary text-primary-foreground px-2 py-0.5">Audio</span>
            <span>Transcriber</span>
            <Mic className="w-5 h-5 text-primary" />
          </CardTitle>
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 font-mono">
            100% ON-DEVICE · WHISPER
          </Badge>
        </div>
        <CardDescription className="font-mono text-xs">
          Drop your 2–3 min meeting summary — runs locally via Transformers.js Whisper. No upload.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div
          ref={dropRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-border hover:border-primary/50 bg-muted/20 p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.webm,.mp4,.mov,.flac"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="w-12 h-12 border border-border bg-card flex items-center justify-center">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wide">Drop audio here or click to browse</p>
            <p className="font-mono text-xs text-muted-foreground mt-1">mp3 · wav · m4a · ogg · webm · mp4 — up to 100MB</p>
          </div>
          <Button variant="outline" className="pointer-events-none font-mono text-xs uppercase tracking-wide rounded-none">
            Select Audio File
          </Button>
        </div>

        {file && (
          <div className="flex items-center gap-3 border border-border bg-muted/30 px-3 py-2.5 font-mono text-xs">
            <FileAudio className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="truncate font-medium">{file.name}</span>
            <span className="text-muted-foreground ml-auto">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            <Button variant="ghost" size="icon-xs" onClick={() => { setFile(null); setText(""); setError(null); }} className="rounded-none">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Model</label>
            <Select value={model} onValueChange={(v) => setModel(v as ModelId)}>
              <SelectTrigger className="rounded-none font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="font-mono text-xs">
                    {m.label} — {m.size} · {m.desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="rounded-none font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="auto">Auto detect</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={transcribe} disabled={!file || isTranscribing} className="flex-1 rounded-none font-mono text-xs uppercase tracking-widest font-bold">
            {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            {isTranscribing ? "Transcribing…" : "Transcribe"}
          </Button>
        </div>

        {(isTranscribing || status) && (
          <div className="space-y-2 border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
              <span className="text-muted-foreground flex items-center gap-1.5">
                {isTranscribing && <Loader2 className="w-3 h-3 animate-spin text-primary" />} {status || "Ready"}
              </span>
              <span className="text-primary font-bold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1 rounded-none" />
            <p className="font-mono text-[10px] text-muted-foreground">
              First run downloads {MODELS.find((m) => m.id === model)?.size} weights and caches locally. Next runs are instant offline.
            </p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="rounded-none">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {text && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Transcription</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copy} className="rounded-none font-mono text-xs">
                  {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" onClick={download} className="rounded-none font-mono text-xs">
                  <Download className="w-3.5 h-3.5" /> Download .txt
                </Button>
              </div>
            </div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[180px] rounded-none font-mono text-sm leading-relaxed" />
            {meta && (
              <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wide">
                {meta.timeTaken != null && <span className="border border-border px-2 py-1">⏱ {meta.timeTaken}s</span>}
                {meta.lang && <span className="border border-border px-2 py-1">🌐 {meta.lang}</span>}
                <span className="border border-border px-2 py-1">🧠 {MODELS.find((m) => m.id === model)?.label}</span>
                {cacheInfo && <span className="border border-primary/30 text-primary px-2 py-1">{cacheInfo}</span>}
              </div>
            )}
          </div>
        )}

        <div className="border border-border bg-muted/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-xs">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <span className="font-bold uppercase tracking-wide text-muted-foreground">Cached weights</span>
            {cacheInfo && <span className="text-muted-foreground">· {cacheInfo}</span>}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearWeights}
            disabled={clearing}
            className="rounded-none font-mono text-xs uppercase tracking-widest border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {clearing ? "Clearing…" : "Delete downloaded weights"}
          </Button>
        </div>
        {clearMsg && <p className="font-mono text-xs text-primary">{clearMsg}</p>}
        <p className="font-mono text-[10px] text-muted-foreground flex items-center gap-1.5">
          <Shield className="w-3 h-3" /> On-device only — audio never leaves your browser. Weights stored in Cache Storage / IndexedDB.
        </p>
      </CardContent>
    </Card>
  );
}
