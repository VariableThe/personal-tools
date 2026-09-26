"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Pipette, Download, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

export function ColorExtractorTool() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [targetHex, setTargetHex] = useState("#3B82F6");
  const [tolerance, setTolerance] = useState([40]);
  const [isPicking, setIsPicking] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState("extracted_mask.png");

  const origCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const procCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name.replace(/\.[^/.]+$/, "") + "_cutout.png");
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const origCanvas = origCanvasRef.current;
      if (!origCanvas) return;
      origCanvas.width = img.width;
      origCanvas.height = img.height;
      const ctx = origCanvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      processColorMask();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (imageSrc) {
      processColorMask();
    }
  }, [targetHex, tolerance]);

  const hexToRgb = (hex: string) => {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  };

  const processColorMask = () => {
    const origCanvas = origCanvasRef.current;
    const procCanvas = procCanvasRef.current;
    if (!origCanvas || !procCanvas) return;

    setProcessing(true);
    setTimeout(() => {
      const width = origCanvas.width;
      const height = origCanvas.height;
      procCanvas.width = width;
      procCanvas.height = height;

      const origCtx = origCanvas.getContext("2d");
      const procCtx = procCanvas.getContext("2d");
      if (!origCtx || !procCtx) return;

      const imgData = origCtx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const target = hexToRgb(targetHex);

      const tolSq = tolerance[0] * tolerance[0] * 3;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const distSq =
          (r - target.r) * (r - target.r) +
          (g - target.g) * (g - target.g) +
          (b - target.b) * (b - target.b);

        if (distSq > tolSq) {
          data[i + 3] = 0;
        }
      }

      procCtx.putImageData(imgData, 0, 0);
      setProcessedUrl(procCanvas.toDataURL("image/png"));
      setProcessing(false);
    }, 10);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPicking) return;
    const canvas = origCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex =
      "#" +
      ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
        .toString(16)
        .slice(1)
        .toUpperCase();

    setTargetHex(hex);
    setIsPicking(false);
  };

  const downloadCutout = () => {
    if (!processedUrl) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.setAttribute("download", fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Pipette className="w-5 h-5 text-primary" />
            Color Extractor & Masker
          </CardTitle>
          <Badge variant="outline">
            100% On-Device Canvas
          </Badge>
        </div>
        <CardDescription className="text-muted-foreground">
          Isolate exact target RGB colors and generate transparent cutouts directly on canvas.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!imageSrc ? (
          <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-none p-8 transition-all bg-muted/40 text-center">
            <input
              type="file"
              accept="image/*"
              id="img-upload"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="img-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-12 h-12 rounded-none bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Select an Image to Isolate Colors</p>
              </div>
              <Button variant="default">
                Choose Image
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-none bg-muted/60 border border-border">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={targetHex}
                    onChange={(e) => setTargetHex(e.target.value.toUpperCase())}
                    className="w-10 h-10 rounded-none cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={targetHex}
                    onChange={(e) => setTargetHex(e.target.value.toUpperCase())}
                    className="w-24 bg-muted border border-border rounded-none px-2.5 py-1.5 text-sm font-mono text-foreground"
                  />
                </div>

                <Button
                  variant={isPicking ? "default" : "outline"}
                  onClick={() => setIsPicking(!isPicking)}
                  className={`text-xs ${
                    isPicking ? "bg-primary hover:bg-primary/80 text-primary-foreground animate-pulse" : "border-border text-foreground"
                  }`}
                >
                  <Pipette className="w-3.5 h-3.5 mr-1.5" />
                  {isPicking ? "Click Image to Pick Color..." : "Pick Color from Canvas"}
                </Button>

                <div className="flex items-center gap-3 bg-muted px-3.5 py-2 rounded-none border border-border w-48">
                  <span className="text-xs font-medium text-muted-foreground">Tol: {tolerance[0]}</span>
                  <Slider value={tolerance} onValueChange={setTolerance} max={255} step={1} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setImageSrc(null)} className="text-muted-foreground">
                  Change Image
                </Button>
                <Button
                  onClick={downloadCutout}
                  disabled={!processedUrl}
                 
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download Transparent Cutout
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Original Image {isPicking && <span className="text-purple-400 font-normal">(Click anywhere on image to select color)</span>}
                </span>
                <div
                  className={`border border-border rounded-none overflow-hidden bg-background flex items-center justify-center p-2 min-h-[300px] ${
                    isPicking ? "cursor-crosshair ring-2 ring-purple-500" : ""
                  }`}
                >
                  <canvas
                    ref={origCanvasRef}
                    onClick={handleCanvasClick}
                    className="max-w-full max-h-[450px] object-contain rounded-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                  <span>Transparent Cutout Preview</span>
                  {processing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />}
                </span>
                <div
                  className="border border-border rounded-none overflow-hidden flex items-center justify-center p-2 min-h-[300px]"
                  style={{
                    backgroundImage:
                      "linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%)",
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                    backgroundColor: "#09090b",
                  }}
                >
                  <canvas
                    ref={procCanvasRef}
                    className="max-w-full max-h-[450px] object-contain rounded-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
