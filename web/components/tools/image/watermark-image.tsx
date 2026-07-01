"use client";

import React, { useState, useEffect } from "react";
import { Upload, Stamp, Download, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export function WatermarkImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState("© 2026 MY BRAND");
  const [fontSize, setFontSize] = useState([36]);
  const [opacity, setOpacity] = useState([70]);
  const [colorHex, setColorHex] = useState("#FFFFFF");
  const [position, setPosition] = useState<"bottom-right" | "center" | "top-left">("bottom-right");
  const [watermarkedUrl, setWatermarkedUrl] = useState<string | null>(null);

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
    if (imageSrc) {
      applyWatermark();
    }
  }, [imageSrc, watermarkText, fontSize, opacity, colorHex, position]);

  const applyWatermark = () => {
    if (!imageSrc || !watermarkText) return;
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      ctx.font = `bold ${fontSize[0]}px sans-serif`;
      ctx.fillStyle = colorHex;
      ctx.globalAlpha = opacity[0] / 100.0;

      const metrics = ctx.measureText(watermarkText);
      const textWidth = metrics.width;

      let x = img.width - textWidth - 30;
      let y = img.height - 30;

      if (position === "center") {
        x = img.width / 2 - textWidth / 2;
        y = img.height / 2;
      } else if (position === "top-left") {
        x = 30;
        y = fontSize[0] + 20;
      }

      // Add slight shadow for visibility
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.fillText(watermarkText, x, y);

      setWatermarkedUrl(canvas.toDataURL("image/png"));
    };
    img.src = imageSrc;
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Stamp className="w-5 h-5 text-blue-400" />
            Watermark Image
          </CardTitle>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
            100% On-Device Canvas
          </Badge>
        </div>
        <CardDescription className="text-zinc-400">
          Add custom copyright or branding overlays directly onto your photos.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!imageSrc ? (
          <div className="border-2 border-dashed border-zinc-700/60 hover:border-blue-500/80 rounded-2xl p-8 transition-all bg-zinc-950/40 text-center">
            <input
              type="file"
              accept="image/*"
              id="watermark-img-upload"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="watermark-img-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-200">Select an Image to Watermark</p>
              </div>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-500 pointer-events-none">
                Choose Image
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <div className="space-y-2">
                  <Label htmlFor="img-wm-text" className="text-sm font-semibold text-zinc-200">
                    Watermark Text
                  </Label>
                  <Input
                    id="img-wm-text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Font Size</span>
                    <span className="font-mono text-zinc-200">{fontSize[0]}px</span>
                  </div>
                  <Slider value={fontSize} onValueChange={setFontSize} min={12} max={100} step={2} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Opacity</span>
                    <span className="font-mono text-zinc-200">{opacity[0]}%</span>
                  </div>
                  <Slider value={opacity} onValueChange={setOpacity} min={10} max={100} step={5} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-400 block">Position</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "bottom-right", label: "Bottom Right" },
                        { id: "center", label: "Center" },
                        { id: "top-left", label: "Top Left" },
                      ] as const
                    ).map((pos) => (
                      <Button
                        key={pos.id}
                        variant={position === pos.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPosition(pos.id)}
                        className="text-xs border-zinc-800"
                      >
                        {pos.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-400 block">Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                      className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <Input
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                      className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-200"
                    />
                  </div>
                </div>

                <Button variant="ghost" onClick={() => setImageSrc(null)} className="w-full text-zinc-400">
                  Select Another Image
                </Button>
              </div>

              <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-950 flex flex-col items-center justify-center min-h-[350px]">
                {watermarkedUrl && (
                  <img src={watermarkedUrl} alt="Watermarked Preview" className="max-h-80 object-contain rounded shadow" />
                )}
              </div>
            </div>

            {watermarkedUrl && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-300">Watermark Applied!</span>
                </div>
                <a
                  href={watermarkedUrl}
                  download={`${file?.name.replace(/\.[^/.]+$/, "")}_watermarked.png`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" /> Download Watermarked Photo
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
