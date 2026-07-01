"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Sliders, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export function ImageResizerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [origWidth, setOrigWidth] = useState(0);
  const [origHeight, setOrigHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [format, setFormat] = useState<"image/png" | "image/jpeg" | "image/webp">("image/webp");
  const [quality, setQuality] = useState([85]);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);

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
      setWidth(img.width);
      setHeight(img.height);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (imageSrc && width > 0 && height > 0) {
      processResizedImage();
    }
  }, [imageSrc, width, height, format, quality]);

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (maintainAspect && origWidth > 0) {
      setHeight(Math.round((val / origWidth) * origHeight));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (maintainAspect && origHeight > 0) {
      setWidth(Math.round((val / origHeight) * origWidth));
    }
  };

  const processResizedImage = () => {
    if (!imageSrc) return;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL(format, quality[0] / 100.0);
      setOutputUrl(dataUrl);

      const base64Len = dataUrl.split(",")[1].length;
      const approxBytes = Math.round((base64Len * 3) / 4);
      setOutputSize(approxBytes);
    };
    img.src = imageSrc;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const downloadImage = () => {
    if (!outputUrl || !file) return;
    const ext = format === "image/png" ? "png" : format === "image/jpeg" ? "jpg" : "webp";
    const a = document.createElement("a");
    a.href = outputUrl;
    a.setAttribute("download", `${file.name.replace(/\.[^/.]+$/, "")}_resized.${ext}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            Compress & Resize Image
          </CardTitle>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
            100% On-Device Canvas
          </Badge>
        </div>
        <CardDescription className="text-zinc-400">
          Scale pixel resolution, adjust compression quality, and convert image formats.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!imageSrc ? (
          <div className="border-2 border-dashed border-zinc-700/60 hover:border-blue-500/80 rounded-2xl p-8 transition-all bg-zinc-950/40 text-center">
            <input
              type="file"
              accept="image/*"
              id="resizer-upload"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="resizer-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Select an Image to Compress</p>
              </div>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-500 pointer-events-none">
                Choose Image
              </Button>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-zinc-300 block mb-2">Dimensions (px)</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <span className="text-[10px] text-zinc-500 block">Width</span>
                      <Input
                        type="number"
                        value={width}
                        onChange={(e) => handleWidthChange(Number(e.target.value))}
                        className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                      />
                    </div>
                    <span className="text-zinc-600 mt-4">×</span>
                    <div className="flex-1">
                      <span className="text-[10px] text-zinc-500 block">Height</span>
                      <Input
                        type="number"
                        value={height}
                        onChange={(e) => handleHeightChange(Number(e.target.value))}
                        className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={maintainAspect}
                    onChange={(e) => setMaintainAspect(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-800 text-blue-500 focus:ring-0"
                  />
                  Maintain Aspect Ratio
                </label>

                <div className="border-t border-zinc-800 pt-4">
                  <Label className="text-xs font-semibold text-zinc-300 block mb-2">Export Format</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["image/webp", "image/png", "image/jpeg"] as const).map((fmt) => (
                      <Button
                        key={fmt}
                        variant={format === fmt ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormat(fmt)}
                        className={`text-xs uppercase ${format === fmt ? "bg-blue-600" : "border-zinc-800"}`}
                      >
                        {fmt.split("/")[1]}
                      </Button>
                    ))}
                  </div>
                </div>

                {format !== "image/png" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Quality</span>
                      <span className="font-mono text-zinc-200">{quality[0]}%</span>
                    </div>
                    <Slider value={quality} onValueChange={setQuality} min={10} max={100} step={5} />
                  </div>
                )}

                <div className="border-t border-zinc-800 pt-4 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Original Size:</span>
                    <span className="font-mono text-zinc-300">{file ? formatBytes(file.size) : "-"}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>New Approx Size:</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {outputSize ? formatBytes(outputSize) : "-"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    onClick={downloadImage}
                    disabled={!outputUrl}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download Processed Image
                  </Button>
                  <Button variant="ghost" onClick={() => setImageSrc(null)} className="w-full text-zinc-400">
                    Select Another Image
                  </Button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 border border-zinc-800 rounded-2xl p-4 bg-zinc-950 flex items-center justify-center min-h-[400px]">
              {outputUrl ? (
                <img src={outputUrl} alt="Resized Preview" className="max-h-[450px] object-contain rounded shadow" />
              ) : (
                <span className="text-sm text-zinc-500">Processing preview...</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
