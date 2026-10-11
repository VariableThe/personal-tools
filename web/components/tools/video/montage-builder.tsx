"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Clapperboard,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Shuffle,
  Play,
  Pause,
  Download,
  Loader2,
  Shield,
  AlertCircle,
  Image as ImageIcon,
  Film,
  Music,
  Link as LinkIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { convertHeicToJpeg, runPool } from "@/lib/heic-convert";

const W = 1280;
const H = 720;
const MAX_TOTAL_SECS = 180;

interface Clip {
  id: string;
  file: File;
  kind: "image" | "video";
  url: string;
  name: string;
  size: number;
  naturalDuration?: number;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Parse a YouTube URL into its 11-char video id, or null. */
export function parseYouTubeId(url: string): string | null {
  const m = url.trim().match(
    /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const HEIC_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);
const HEIC_EXT = /\.(heic|heif|hif)$/i;
const VIDEO_EXT = /\.(mp4|m4v|mov|webm|ogv)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i;

function blankType(t: string): boolean {
  return t === "" || t === "application/octet-stream";
}

function looksHeic(name: string, type: string): boolean {
  return HEIC_TYPES.has(type) || (blankType(type) && HEIC_EXT.test(name));
}

/** Resolve true if this browser can natively decode the image at url. */
function canDecodeImage(url: string, timeoutMs = 9000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.src = "";
      resolve(false);
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img.naturalWidth > 0);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

export function VideoMontageTool() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [durationMode, setDurationMode] = useState<"full" | "fixed">("fixed");
  const [fixedSecs, setFixedSecs] = useState(1);
  const [photoPan, setPhotoPan] = useState(true);
  const [videoPan, setVideoPan] = useState(true);
  const [muteClips, setMuteClips] = useState(true);

  const [ytUrl, setYtUrl] = useState("");
  const [ytStart, setYtStart] = useState(0);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicOffset, setMusicOffset] = useState(0);

  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportPct, setExportPct] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);
  const [outputExt, setOutputExt] = useState<"mp4" | "webm">("mp4");
  const [error, setError] = useState<string | null>(null);
  // Bumped when async media decodes, to repaint the idle poster with fresh state.
  const [, setMediaTick] = useState(0);
  // HEIC conversion progress ({done, total}) while a batch decodes.
  const [heicProgress, setHeicProgress] = useState<{ done: number; total: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const imgCache = useRef(new Map<string, HTMLImageElement>());
  const vidCache = useRef(new Map<string, HTMLVideoElement>());
  const playState = useRef({ playing: false, t0: -1, offset: 0, lastTs: -1 });
  const rafRef = useRef(0);
  const activeVidRef = useRef<string | null>(null);
  const lastIdxRef = useRef(-1);
  const lastShownRef = useRef(-1);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const actxRef = useRef<AudioContext | null>(null);
  const musicDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const musicUrl = useMemo(
    () => (musicFile ? URL.createObjectURL(musicFile) : null),
    [musicFile]
  );
  useEffect(() => () => {
    if (musicUrl) URL.revokeObjectURL(musicUrl);
  }, [musicUrl]);

  const ytId = useMemo(() => (ytUrl ? parseYouTubeId(ytUrl) : null), [ytUrl]);

  /** True when this browser can mux MP4 — decides the export button label up front. */
  const mp4Ready = useMemo(() => {
    try {
      return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/mp4");
    } catch {
      return false;
    }
  }, []);

  const durations = useMemo(
    () =>
      clips.map((c) => {
        if (durationMode === "full" && c.kind === "video" && c.naturalDuration) {
          return Math.max(0.2, c.naturalDuration);
        }
        return Math.max(0.2, fixedSecs);
      }),
    [clips, durationMode, fixedSecs]
  );
  const total = useMemo(() => durations.reduce((a, b) => a + b, 0), [durations]);

  /** Cumulative start times, for locating the clip at time t. */
  const starts = useMemo(() => {
    const s: number[] = [];
    let acc = 0;
    for (const d of durations) {
      s.push(acc);
      acc += d;
    }
    return s;
  }, [durations]);

  function clipIndexAt(t: number): number {
    for (let i = starts.length - 1; i >= 0; i--) {
      if (t >= starts[i]) return i;
    }
    return 0;
  }

  function stopPlayback() {
    playState.current.playing = false;
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    for (const v of vidCache.current.values()) v.pause();
    if (musicRef.current) musicRef.current.pause();
  }

  // Pause everything on unmount.
  useEffect(() => {
    const vids = vidCache.current;
    const music = musicRef.current;
    return () => {
      playState.current.playing = false;
      cancelAnimationFrame(rafRef.current);
      for (const v of vids.values()) v.pause();
      if (music) music.pause();
    };
  }, []);

  // ---------- file intake ----------

  function probeVideoDuration(clip: Clip) {
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = clip.url;
    probe.onloadedmetadata = () => {
      const d = probe.duration;
      probe.removeAttribute("src");
      if (isFinite(d) && d > 0) {
        setClips((prev) =>
          prev.map((c) => (c.id === clip.id ? { ...c, naturalDuration: d } : c))
        );
      }
    };
  }

  function addFiles(files: FileList | File[]) {
    void (async () => {
      const list = Array.from(files);
      if (list.length === 0) return;
      const fast: Clip[] = [];
      const heicQueue: { f: File; url: string }[] = [];
      const skipped: string[] = [];
      for (const f of list) {
        const t = f.type.toLowerCase();
        const isHeic = looksHeic(f.name, t);
        // Trust the MIME type first; fall back to extension when the OS reports nothing.
        const isVideo =
          t.startsWith("video/") || (blankType(t) && VIDEO_EXT.test(f.name) && !isHeic);
        const isImage =
          (t.startsWith("image/") && !HEIC_TYPES.has(t)) ||
          (blankType(t) && IMAGE_EXT.test(f.name));
        const url = URL.createObjectURL(f);
        if (isVideo) {
          fast.push({
            id: uid(),
            file: f,
            kind: "video",
            url,
            name: f.name,
            size: f.size,
          });
        } else if (isHeic) {
          heicQueue.push({ f, url });
        } else if (isImage) {
          fast.push({
            id: uid(),
            file: f,
            kind: "image",
            url,
            name: f.name,
            size: f.size,
          });
        } else {
          URL.revokeObjectURL(url);
          skipped.push(f.name);
        }
      }

      // Fast batch lands immediately — videos and natively-decodable images.
      if (fast.length > 0) {
        setError(null);
        setOutputUrl(null);
        setClips((prev) => [...prev, ...fast]);
        for (const clip of fast) {
          if (clip.kind === "image") getImage(clip);
          else {
            getVideoEl(clip);
            probeVideoDuration(clip);
          }
        }
      }

      // HEIC batch: native decode where supported (instant), else on-device
      // WASM conversion. Streams onto the timeline as each file finishes.
      const failed: string[] = [];
      if (heicQueue.length > 0) {
        setHeicProgress({ done: 0, total: heicQueue.length });
        await runPool(heicQueue, 3, async ({ f, url }) => {
          try {
            let clip: Clip;
            if (await canDecodeImage(url, 8000)) {
              clip = { id: uid(), file: f, kind: "image", url, name: f.name, size: f.size };
            } else {
              const jpeg = await convertHeicToJpeg(f);
              URL.revokeObjectURL(url);
              const jpgName = f.name.replace(/\.(heic|heif|hif)$/i, ".jpg");
              const cUrl = URL.createObjectURL(jpeg);
              clip = {
                id: uid(),
                file: new File([jpeg], jpgName, { type: "image/jpeg" }),
                kind: "image",
                url: cUrl,
                name: `${f.name} → ${jpgName}`,
                size: jpeg.size,
              };
            }
            setOutputUrl(null);
            setClips((prev) => [...prev, clip]);
            getImage(clip);
          } catch {
            URL.revokeObjectURL(url);
            failed.push(f.name);
          } finally {
            setHeicProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));
          }
        });
        setHeicProgress(null);
      }

      const problems = [
        failed.length > 0 ? `couldn't decode: ${failed.join(", ")}` : "",
        skipped.length > 0 ? `skipped: ${skipped.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      const added = fast.length + (heicQueue.length - failed.length);
      if (added === 0) {
        setError(
          failed.length > 0
            ? `Couldn't decode those HEIC photos on-device (${failed.join(", ")}). Convert to JPG first — on iPhone: Settings → Camera → Formats → Most Compatible.`
            : `No images or videos in that selection — try JPG/PNG/WebP/HEIC or MP4/WebM/MOV.${skipped.length > 0 ? ` Skipped: ${skipped.join(", ")}.` : ""}`
        );
      } else if (problems) {
        setError(`Added ${added} clip(s). ${problems}.`);
      } else {
        setError(null);
      }
    })();
  }

  function removeClip(id: string) {
    const hit = clips.find((c) => c.id === id);
    if (hit) URL.revokeObjectURL(hit.url);
    imgCache.current.delete(id);
    const v = vidCache.current.get(id);
    if (v) {
      v.pause();
      v.removeAttribute("src");
      vidCache.current.delete(id);
    }
    setClips((prev) => prev.filter((c) => c.id !== id));
    setOutputUrl(null);
  }

  function moveClip(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= clips.length) return;
    const next = [...clips];
    [next[index], next[j]] = [next[j], next[index]];
    setClips(next);
    setOutputUrl(null);
  }

  function shuffleClips() {
    const next = [...clips];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setClips(next);
    setOutputUrl(null);
  }

  function clearAll() {
    stopPlayback();
    for (const c of clips) URL.revokeObjectURL(c.url);
    setClips([]);
    imgCache.current.clear();
    for (const v of vidCache.current.values()) {
      v.pause();
      v.removeAttribute("src");
    }
    vidCache.current.clear();
    activeVidRef.current = null;
    lastIdxRef.current = -1;
    lastShownRef.current = 0;
    setOutputUrl(null);
    setPlayhead(0);
  }

  // ---------- media caches ----------

  /** Repaint the idle canvas (poster). No-op while playing — the rAF loop owns the canvas then. */
  function redrawIdle() {
    if (!playState.current.playing) {
      lastIdxRef.current = -1;
      drawFrame(lastShownRef.current >= 0 ? lastShownRef.current : 0);
    }
  }

  function getImage(clip: Clip): HTMLImageElement | null {
    let img = imgCache.current.get(clip.id);
    if (!img) {
      img = new Image();
      // Re-render on decode: the idle effect then repaints with fresh clips.
      // (Never draw from this stale closure — it would paint over with old state.)
      img.onload = () => setMediaTick((x) => x + 1);
      img.src = clip.url;
      imgCache.current.set(clip.id, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  function getVideoEl(clip: Clip): HTMLVideoElement {
    let v = vidCache.current.get(clip.id);
    if (!v) {
      v = document.createElement("video");
      v.oncanplay = () => setMediaTick((x) => x + 1);
      v.onseeked = () => setMediaTick((x) => x + 1);
      v.src = clip.url;
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      vidCache.current.set(clip.id, v);
    }
    return v;
  }

  // ---------- canvas renderer ----------

  function drawCover(
    ctx: CanvasRenderingContext2D,
    media: HTMLImageElement | HTMLVideoElement,
    mw: number,
    mh: number,
    zoom: number,
    panX: number,
    panY: number
  ) {
    const base = Math.max(W / mw, H / mh);
    const s = base * zoom;
    const dw = mw * s;
    const dh = mh * s;
    const slackX = Math.max(0, dw - W);
    const slackY = Math.max(0, dh - H);
    const dx = (W - dw) / 2 + (panX * slackX) / 2;
    const dy = (H - dh) / 2 + (panY * slackY) / 2;
    ctx.drawImage(media, dx, dy, dw, dh);
  }

  function drawFrame(t: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    if (clips.length === 0) return;
    const clamped = Math.min(t, Math.max(0, total - 0.001));
    const i = clipIndexAt(clamped);
    const clip = clips[i];
    if (!clip) return;
    const local = clamped - starts[i];
    const p = durations[i] > 0 ? Math.min(1, Math.max(0, local / durations[i])) : 0;

    if (clip.kind === "image") {
      const img = getImage(clip);
      if (!img) return;
      if (photoPan) {
        // Alternate Ken Burns direction per clip so the reel doesn't feel uniform.
        const fwd = i % 2 === 0;
        const zoom = fwd ? 1.02 + 0.1 * p : 1.12 - 0.1 * p;
        const panX = fwd ? -0.7 + 1.4 * p : 0.7 - 1.4 * p;
        const panY = fwd ? 0.5 - 1.0 * p : -0.5 + 1.0 * p;
        drawCover(ctx, img, img.naturalWidth, img.naturalHeight, zoom, panX, panY);
      } else {
        drawCover(ctx, img, img.naturalWidth, img.naturalHeight, 1, 0, 0);
      }
    } else {
      const v = getVideoEl(clip);
      if (v.readyState < 2 || v.videoWidth === 0) return;
      if (videoPan) {
        drawCover(ctx, v, v.videoWidth, v.videoHeight, 1.06, -0.5 + p, 0.35 - 0.7 * p);
      } else {
        drawCover(ctx, v, v.videoWidth, v.videoHeight, 1, 0, 0);
      }
    }
  }

  // Redraw the idle frame when the timeline changes (poster at last shown position).
  useEffect(() => {
    redrawIdle();
  });

  // ---------- transport ----------

  function syncVideos(index: number, shouldPlay: boolean) {
    const clip = clips[index];
    for (const [id, v] of vidCache.current.entries()) {
      if (clip && id === clip.id) continue;
      v.pause();
    }
    if (!clip || clip.kind !== "video") {
      activeVidRef.current = null;
      return;
    }
    const v = getVideoEl(clip);
    v.muted = muteClips;
    if (activeVidRef.current !== clip.id) {
      activeVidRef.current = clip.id;
      try {
        v.currentTime = 0;
      } catch {
        // not ready yet — will catch up on subsequent frames
      }
    }
    if (shouldPlay && v.paused) {
      v.play().catch(() => {});
    }
  }

  function tick(ts: number) {
    const st = playState.current;
    if (!st.playing) return;
    // Single clock: seed t0 from the first frame timestamp, never wall-clock.
    if (st.t0 < 0) st.t0 = ts;
    st.lastTs = ts;
    const now = (ts - st.t0) / 1000 + st.offset;
    if (now >= total) {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      } else {
        stopPlayback();
        lastShownRef.current = total;
        setPlayhead(total);
      }
      return;
    }
    if (Math.abs(now - lastShownRef.current) > 0.1) {
      lastShownRef.current = now;
      setPlayhead(now);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        setExportPct(Math.round((now / total) * 100));
      }
    }
    const i = clipIndexAt(now);
    if (i !== lastIdxRef.current) {
      lastIdxRef.current = i;
      syncVideos(i, true);
    }
    drawFrame(now);
    rafRef.current = requestAnimationFrame(tick);
  }

  function startPlayback(from = 0) {
    if (clips.length === 0 || total <= 0) return;
    setError(null);
    lastIdxRef.current = -1;
    playState.current = { playing: true, t0: -1, offset: from, lastTs: -1 };
    setPlaying(true);
    syncVideos(clipIndexAt(from), true);
    if (musicRef.current && musicUrl) {
      try {
        musicRef.current.currentTime = Math.min(
          musicOffset,
          Math.max(0, (musicRef.current.duration || 0) - 0.5)
        );
      } catch {
        // duration unknown until metadata loads — plays from 0
      }
      musicRef.current.play().catch(() => {});
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function togglePlay() {
    if (playing) {
      const st = playState.current;
      const now =
        st.t0 < 0 || st.lastTs < 0 ? st.offset : (st.lastTs - st.t0) / 1000 + st.offset;
      st.offset = Math.min(now, total);
      stopPlayback();
      lastShownRef.current = st.offset;
      setPlayhead(st.offset);
    } else {
      startPlayback(playhead >= total ? 0 : playhead);
    }
  }

  /** Jump the playhead. Continues playing from `to` if playing, else repaints idle. */
  function seek(to: number) {
    if (total <= 0 || exporting) return;
    const t = Math.min(Math.max(0, to), total);
    lastShownRef.current = t;
    setPlayhead(t);
    setOutputUrl(null);
    // Force the loop (or next play) to resync clip video + music to the new position.
    lastIdxRef.current = -1;
    activeVidRef.current = null;
    const i = clipIndexAt(t);
    const clip = clips[i];
    if (playState.current.playing) {
      playState.current.offset = t;
      playState.current.t0 = -1;
      for (const v of vidCache.current.values()) v.pause();
      syncVideos(i, true);
      if (clip?.kind === "video") {
        const v = getVideoEl(clip);
        try {
          v.currentTime = Math.min(Math.max(0, t - starts[i]), v.duration || t - starts[i]);
        } catch {
          // metadata not ready — loop resyncs once it is
        }
      }
      if (musicRef.current && musicUrl) {
        try {
          musicRef.current.currentTime = Math.min(
            musicOffset + t,
            Math.max(0, (musicRef.current.duration || 0) - 0.25)
          );
        } catch {
          // duration unknown until metadata loads
        }
      }
    } else {
      for (const v of vidCache.current.values()) v.pause();
      syncVideos(i, false);
      if (clip?.kind === "video") {
        const v = getVideoEl(clip);
        try {
          v.currentTime = Math.min(Math.max(0, t - starts[i]), v.duration || t - starts[i]);
        } catch {
          // metadata not ready — canplay repaint covers it
        }
      }
      drawFrame(t);
    }
  }

  // ---------- export ----------

  function pickMime(): string {
    // MP4 first (plays everywhere); WebM VP9/VP8 as on-device fallback.
    const cands = [
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const c of cands) {
      try {
        if (MediaRecorder.isTypeSupported(c)) return c;
      } catch {
        // ignore — try next
      }
    }
    return "";
  }

  async function startExport() {
    if (clips.length === 0 || total <= 0) return;
    if (total > MAX_TOTAL_SECS) {
      setError(
        `Timeline is ${formatTime(total)} — over the ${formatTime(MAX_TOTAL_SECS)} on-device export cap. Switch to fixed-duration mode or drop clips.`
      );
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);
    setOutputUrl(null);
    setOutputSize(null);

    try {
      const stream: MediaStream = canvas.captureStream(30);
      if (musicRef.current && musicUrl) {
        if (!actxRef.current) {
          const AC =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          actxRef.current = new AC();
          const src = actxRef.current.createMediaElementSource(musicRef.current);
          musicDestRef.current = actxRef.current.createMediaStreamDestination();
          src.connect(musicDestRef.current);
          src.connect(actxRef.current.destination);
        }
        await actxRef.current.resume().catch(() => {});
        if (musicDestRef.current) {
          for (const tr of musicDestRef.current.stream.getAudioTracks()) stream.addTrack(tr);
        }
      }
      const mime = pickMime();
      const rec = new MediaRecorder(
        stream,
        mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined
      );
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
        setOutputExt(rec.mimeType.includes("mp4") ? "mp4" : "webm");
        setOutputUrl(URL.createObjectURL(blob));
        setOutputSize(blob.size);
        setExporting(false);
        setExportPct(100);
        recorderRef.current = null;
        stopPlayback();
        lastShownRef.current = total;
        setPlayhead(total);
      };
      rec.onerror = () => {
        setError("Recording failed in this browser — try Chrome or Edge for MP4/WebM export.");
        setExporting(false);
        recorderRef.current = null;
        stopPlayback();
      };
      recorderRef.current = rec;
      setExporting(true);
      setExportPct(0);
      rec.start(250);
      // Small delay so the canvas stream has a live frame before the clock starts.
      await new Promise((r) => setTimeout(r, 120));
      startPlayback(0);
    } catch (e) {
      console.error(e);
      setError("Could not start export — canvas capture isn't available in this browser.");
      setExporting(false);
      recorderRef.current = null;
    }
  }

  const activeIndex =
    clips.length > 0 ? clipIndexAt(Math.min(playhead, Math.max(0, total - 0.001))) : 0;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2 p5-skew">
            <span className="bg-primary text-primary-foreground px-2 py-0.5">Video</span>
            <span>Montage Builder</span>
            <Clapperboard className="w-5 h-5 text-primary" />
          </CardTitle>
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 font-mono">
            100% ON-DEVICE · CANVAS
          </Badge>
        </div>
        <CardDescription className="font-mono text-xs">
          Order photos + clips, add drift motion, lay background music under muted footage, export one reel. Nothing uploads.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-border hover:border-primary/50 bg-muted/20 p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.heic,.heif"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="w-12 h-12 border border-border bg-card flex items-center justify-center">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wide">Drop photos & videos here or click to browse</p>
            <p className="font-mono text-xs text-muted-foreground mt-1">multi-select · JPG PNG WebP · HEIC auto-converts on-device · MP4 WebM MOV</p>
          </div>
          <Button variant="outline" className="pointer-events-none font-mono text-xs uppercase tracking-wide rounded-none">
            Select Files
          </Button>
          {heicProgress && (
            <p className="font-mono text-xs text-primary flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Converting HEIC on-device… {heicProgress.done}/{heicProgress.total}
            </p>
          )}
        </div>

        {/* timeline order */}
        {clips.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                Timeline order · {clips.length} clips · {formatTime(total)} total
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={shuffleClips} className="rounded-none font-mono text-xs">
                  <Shuffle className="w-3.5 h-3.5" /> Randomise
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearAll}
                  className="rounded-none font-mono text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </Button>
              </div>
            </div>
            <ol className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {clips.map((c, i) => (
                <li
                  key={c.id}
                  className={`flex items-center gap-3 border px-2.5 py-2 font-mono text-xs ${
                    i === activeIndex && (playing || exporting)
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <span className="text-muted-foreground font-bold w-6 text-center">{i + 1}</span>
                  <span className="w-14 h-9 shrink-0 border border-border bg-black overflow-hidden flex items-center justify-center">
                    {c.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={c.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {c.kind === "image" ? <ImageIcon className="w-3 h-3 inline mr-1 -mt-0.5" /> : <Film className="w-3 h-3 inline mr-1 -mt-0.5" />}
                      {c.name}
                    </span>
                    <span className="text-muted-foreground">
                      {formatBytes(c.size)} · plays {formatTime(durations[i] ?? 0)}
                      {c.kind === "video" && c.naturalDuration ? ` (full ${formatTime(c.naturalDuration)})` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0">
                    <Button size="icon-xs" variant="ghost" onClick={() => moveClip(i, -1)} disabled={i === 0} aria-label="Move earlier" className="rounded-none">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon-xs" variant="ghost" onClick={() => moveClip(i, 1)} disabled={i === clips.length - 1} aria-label="Move later" className="rounded-none">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon-xs" variant="ghost" onClick={() => removeClip(c.id)} aria-label="Remove clip" className="rounded-none hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* duration + motion settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border border-border bg-muted/10 p-3 space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Clip length</span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={durationMode === "full" ? "default" : "outline"}
                size="sm"
                onClick={() => setDurationMode("full")}
                className="rounded-none font-mono text-xs uppercase"
              >
                Entirety
              </Button>
              <Button
                variant={durationMode === "fixed" ? "default" : "outline"}
                size="sm"
                onClick={() => setDurationMode("fixed")}
                className="rounded-none font-mono text-xs uppercase"
              >
                Timeframe
              </Button>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
              {durationMode === "full"
                ? "Videos play in full; photos hold the timeframe value below."
                : "Every clip — photo or video slice — plays exactly the timeframe below."}
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="fixed-secs" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold whitespace-nowrap">
                Timeframe (s)
              </Label>
              <Input
                id="fixed-secs"
                type="number"
                min={0.2}
                max={30}
                step={0.1}
                value={fixedSecs}
                onChange={(e) => setFixedSecs(Math.min(30, Math.max(0.2, Number(e.target.value) || 1)))}
                className="rounded-none font-mono text-xs h-8"
              />
            </div>
          </div>

          <div className="border border-border bg-muted/10 p-3 space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Motion & sound</span>
            <label className="flex items-center gap-2 cursor-pointer font-mono text-xs">
              <input type="checkbox" checked={photoPan} onChange={(e) => setPhotoPan(e.target.checked)} className="rounded-none" />
              Subtle pan on photos <span className="text-muted-foreground">(Ken Burns)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-mono text-xs">
              <input type="checkbox" checked={videoPan} onChange={(e) => setVideoPan(e.target.checked)} className="rounded-none" />
              Slight drift on videos
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-mono text-xs">
              <input type="checkbox" checked={muteClips} onChange={(e) => setMuteClips(e.target.checked)} className="rounded-none" />
              Mute all clip audio <span className="text-muted-foreground">(for music bed)</span>
            </label>
          </div>
        </div>

        {/* music */}
        <div className="border border-border bg-muted/10 p-3 space-y-3">
          <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5" /> Background music
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-2">
            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> YouTube link (preview timing)
              </Label>
              <Input
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                inputMode="url"
                className="rounded-none font-mono text-xs h-8"
              />
              {ytUrl.trim() !== "" && (
                <p className={`font-mono text-[10px] ${ytId ? "text-primary" : "text-destructive"}`}>
                  {ytId ? `✓ cueing video ${ytId} from ${formatTime(ytStart)} in preview` : "✗ not a recognised YouTube URL"}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Start at (s)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={ytStart}
                onChange={(e) => setYtStart(Math.max(0, Number(e.target.value) || 0))}
                className="rounded-none font-mono text-xs h-8"
              />
            </div>
          </div>
          {ytId && (
            <div className="aspect-video w-full max-w-md border border-border bg-black">
              <iframe
                key={`${ytId}-${Math.floor(ytStart)}`}
                src={`https://www.youtube-nocookie.com/embed/${ytId}?start=${Math.floor(ytStart)}&rel=0`}
                title="YouTube music cue"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Audio file for export mix <span className="text-primary">(required for sound in export)</span>
              </Label>
              <div className="flex items-center gap-2">
                <input
                  ref={musicInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setMusicFile(f);
                      setOutputUrl(null);
                    }
                    e.target.value = "";
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => musicInputRef.current?.click()} className="rounded-none font-mono text-xs">
                  {musicFile ? "Replace audio" : "Choose audio file"}
                </Button>
                {musicFile && (
                  <>
                    <span className="font-mono text-xs truncate">{musicFile.name}</span>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => setMusicFile(null)}
                      aria-label="Remove music"
                      className="rounded-none hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1 w-full sm:w-28">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Start at (s)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={musicOffset}
                onChange={(e) => setMusicOffset(Math.max(0, Number(e.target.value) || 0))}
                className="rounded-none font-mono text-xs h-8"
              />
            </div>
          </div>
          <audio ref={musicRef} src={musicUrl ?? undefined} preload="auto" className="hidden" />
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            YouTube audio can&apos;t be pulled into an on-device export (Google blocks it) — the embed above is for timing, while the
            uploaded audio file is what actually gets mixed under your muted clips.
          </p>
        </div>

        {/* preview + export */}
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
            <span className="font-bold text-muted-foreground">
              Preview · 1280×720
              {clips.length > 0 && (
                <> · clip {Math.min(activeIndex + 1, clips.length)}/{clips.length} · {formatTime(playhead)} / {formatTime(total)}</>
              )}
            </span>
            {exporting && <span className="text-primary font-bold">Exporting {exportPct}%</span>}
          </div>
          <div className="border border-border bg-black">
            <canvas ref={canvasRef} width={W} height={H} className="w-full aspect-video block" />
          </div>
          {total > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {formatTime(Math.min(playhead, total))}
              </span>
              <input
                type="range"
                min={0}
                max={total}
                step={0.01}
                value={Math.min(playhead, total)}
                onChange={(e) => seek(Number(e.target.value))}
                disabled={exporting}
                aria-label="Scrub timeline"
                className="w-full h-1 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {formatTime(total)}
              </span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={togglePlay}
              disabled={clips.length === 0 || exporting}
              variant="outline"
              className="flex-1 rounded-none font-mono text-xs uppercase tracking-widest font-bold"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {playing ? "Pause" : playhead > 0 && playhead < total ? "Resume" : "Preview"}
            </Button>
            <Button
              onClick={startExport}
              disabled={clips.length === 0 || exporting || playing}
              className="flex-1 rounded-none font-mono text-xs uppercase tracking-widest font-bold"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? `Recording… ${exportPct}%` : mp4Ready ? "Export MP4" : "Export WebM"}
            </Button>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            {mp4Ready
              ? "MP4 container where supported, WebM fallback. "
              : "This browser can't mux MP4 — exporting WebM instead. "}
            {!musicFile && clips.length > 0 && (
              <>No audio file attached — the export will be silent (a YouTube link alone can&apos;t be baked in).</>
            )}
          </p>

          {error && (
            <Alert variant="destructive" className="rounded-none">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {outputUrl && (
            <div className="space-y-2 border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
                  Export ready {outputSize ? `· ${formatBytes(outputSize)}` : ""}
                </span>
                <a href={outputUrl} download={`montage.${outputExt}`}>
                  <Button size="sm" className="rounded-none font-mono text-xs">
                    <Download className="w-3.5 h-3.5" /> Download montage.{outputExt}
                  </Button>
                </a>
              </div>
              <video src={outputUrl} controls playsInline className="w-full aspect-video bg-black" />
            </div>
          )}
        </div>

        <p className="font-mono text-[10px] text-muted-foreground flex items-center gap-1.5">
          <Shield className="w-3 h-3" /> Clips and audio render locally via canvas + MediaRecorder. Only the optional YouTube embed
          streams from Google, for cueing.
        </p>
      </CardContent>
    </Card>
  );
}
