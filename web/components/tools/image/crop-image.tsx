"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Crop, Download, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

export function CropImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [origWidth, setOrigWidth] = useState(0);
  const [origHeight, setOrigHeight] = useState(0);
  const [cropPercentX, setCropPercentX] = useState([10]);
  const [cropPercentY, setCropPercentY] = useState([10]);
  const [cropPercentW, setCropPercentW] = useState([80]);
  const [cropPercentH, setCropPercentH] = useState([80]);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    setFile(uploaded);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
    };
    reader.readAsDataURL(uploaded);
  };

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      setOrigWidth(img.width);
      setOrigHeight(img.height);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (imageSrc && origWidth > 0 && origHeight > 0) {
      applyCrop();
    }
  }, [imageSrc, cropPercentX, cropPercentY, cropPercentW, cropPercentH]);

  const setRatio = (ratio: "1:1" | "16:9" | "4:3") => {
    if (ratio === "1:1") {
      setCropPercentX([10]);
      setCropPercentY([10]);
      setCropPercentW([80]);
      setCropPercentH([80]);
    } else if (ratio === "16:9") {
      setCropPercentX([5]);
      setCropPercentY([20]);
      setCropPercentW([90]);
      setCropPercentH([50]);
    } else if (ratio === "4:3") {
      setCropPercentX([10]);
      setCropPercentY([10]);
      setCropPercentW([80]);
      setCropPercentH([60]);
    }
  };

  const applyCrop = () => {
    if (!imageSrc) return;
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.onload = () => {
      const sx = Math.round((cropPercentX[0] / 100) * img.width);
      const sy = Math.round((cropPercentY[0] / 100) * img.height);
      const sw = Math.max(10, Math.round((cropPercentW[0] / 100) * img.width));
      const sh = Math.max(10, Math.round((cropPercentH[0] / 100) * img.height));

      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      setCroppedUrl(canvas.toDataURL("image/png"));
    };
    img.src = imageSrc;
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Crop className="w-5 h-5 text-blue-400" />
            Crop Image
          </CardTitle>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
            100% On-Device Canvas
          </Badge>
        </div>
        <CardDescription className="text-zinc-400">
          Precisely trim edges or apply aspect ratio crops directly on your graphics hardware.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!imageSrc ? (
          <div className="border-2 border-dashed border-zinc-700/60 hover:border-blue-500/80 rounded-2xl p-8 transition-all bg-zinc-950/40 text-center">
            <input
              type="file"
              accept="image/*"
              id="crop-upload"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="crop-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Select an Image to Crop</p>
              </div>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-500 pointer-events-none">
                Choose Image
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-400 mr-2">Presets:</span>
                <Button variant="outline" size="sm" onClick={() => setRatio("1:1")} className="border-zinc-800">
                  Square 1:1
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRatio("16:9")} className="border-zinc-800">
                  16:9 Landscape
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRatio("4:3")} className="border-zinc-800">
                  4:3 Standard
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setImageSrc(null)} className="text-zinc-400">
                Change Image
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Horizontal Start Offset (X%)</span>
                    <span className="font-mono text-zinc-200">{cropPercentX[0]}%</span>
                  </div>
                  <Slider value={cropPercentX} onValueChange={setCropPercentX} max={80} step={1} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Vertical Start Offset (Y%)</span>
                    <span className="font-mono text-zinc-200">{cropPercentY[0]}%</span>
                  </div>
                  <Slider value={cropPercentY} onValueChange={setCropPercentY} max={80} step={1} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Crop Box Width (W%)</span>
                    <span className="font-mono text-zinc-200">{cropPercentW[0]}%</span>
                  </div>
                  <Slider value={cropPercentW} onValueChange={setCropPercentW} min={10} max={100} step={1} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Crop Box Height (H%)</span>
                    <span className="font-mono text-zinc-200">{cropPercentH[0]}%</span>
                  </div>
                  <Slider value={cropPercentH} onValueChange={setCropPercentH} min={10} max={100} step={1} />
                </div>
              </div>

              <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-950 flex flex-col items-center justify-center min-h-[300px]">
                {croppedUrl ? (
                  <img src={croppedUrl} alt="Cropped Preview" className="max-h-72 object-contain rounded shadow" />
                ) : (
                  <span className="text-sm text-zinc-500">Cropping...</span>
                )}
              </div>
            </div>

            {croppedUrl && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-300">Cropped Image Ready!</span>
                </div>
                <a
                  href={croppedUrl}
                  download={`${file?.name.replace(/\.[^/.]+$/, "")}_cropped.png`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" /> Download Cropped Image
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
