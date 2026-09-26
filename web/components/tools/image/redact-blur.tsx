"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, EyeOff, Download, RefreshCw, Undo2, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

interface BlurBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function RedactBlurTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [blurAmount, setBlurAmount] = useState([16]);
  const [boxes, setBoxes] = useState<BlurBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<BlurBox | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    setFile(uploaded);
    setBoxes([]);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
    };
    reader.readAsDataURL(uploaded);
  };

  useEffect(() => {
    if (imageSrc) {
      renderRedactedImage();
    }
  }, [imageSrc, boxes, blurAmount]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    const pos = getCanvasCoords(e);
    setCurrentBox({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentBox && currentBox.w > 5 && currentBox.h > 5) {
      setBoxes((prev) => [...prev, currentBox]);
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentBox(null);
  };

  const renderRedactedImage = () => {
    if (!imageSrc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      const allBoxes = currentBox ? [...boxes, currentBox] : boxes;

      allBoxes.forEach((box) => {
        // Pixelate effect inside box
        const size = blurAmount[0];
        const w = box.w;
        const h = box.h;
        if (w <= 0 || h <= 0) return;

        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        const smallW = Math.max(1, Math.floor(w / size));
        const smallH = Math.max(1, Math.floor(h / size));

        tempCanvas.width = smallW;
        tempCanvas.height = smallH;

        if (tempCtx) {
          tempCtx.imageSmoothingEnabled = false;
          tempCtx.drawImage(canvas, box.x, box.y, w, h, 0, 0, smallW, smallH);

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, box.x, box.y, w, h);
          ctx.imageSmoothingEnabled = true;
        }
      });

      setOutputUrl(canvas.toDataURL("image/png"));
    };
    img.src = imageSrc;
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-primary" />
            Redact & Blur Sensitive Info
          </CardTitle>
          <Badge variant="outline">
            100% On-Device Canvas
          </Badge>
        </div>
        <CardDescription className="text-muted-foreground">
          Click and drag boxes across faces, passwords, or personal data to pixelate them before sharing.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!imageSrc ? (
          <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-none p-8 transition-all bg-muted/40 text-center">
            <input
              type="file"
              accept="image/*"
              id="redact-upload"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="redact-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-12 h-12 rounded-none bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Select an Image to Redact</p>
              </div>
              <Button variant="default">
                Choose Image
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-none bg-muted/60 border border-border">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-48">
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Pixel Size:</span>
                  <Slider value={blurAmount} onValueChange={setBlurAmount} min={6} max={40} step={2} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={boxes.length === 0}
                  onClick={() => setBoxes((prev) => prev.slice(0, -1))}
                  className="border-border text-foreground"
                >
                  <Undo2 className="w-3.5 h-3.5 mr-1.5" /> Undo Last Blur ({boxes.length})
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setImageSrc(null)} className="text-muted-foreground">
                Change Image
              </Button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 block text-center animate-pulse">
                Click & Drag rectangles over sensitive areas below to pixelate
              </span>
              <div className="border border-border rounded-none p-2 bg-background flex items-center justify-center min-h-[350px] cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="max-h-[500px] max-w-full object-contain"
                />
              </div>
            </div>

            {outputUrl && (
              <div className="p-4 rounded-none bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Redacted Image Ready!</span>
                </div>
                <a
                  href={outputUrl}
                  download={`${file?.name.replace(/\.[^/.]+$/, "")}_redacted.png`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-none font-medium text-sm"
                >
                  <Download className="w-4 h-4" /> Download Redacted Image
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
