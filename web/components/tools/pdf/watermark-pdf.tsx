"use client";

import React, { useState } from "react";
import { Upload, Stamp, Download, CheckCircle2 } from "lucide-react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

export function WatermarkPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState([30]);
  const [fontSize, setFontSize] = useState([50]);
  const [colorHex, setColorHex] = useState("#EF4444"); // default red
  const [watermarkedUrl, setWatermarkedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    setFile(uploaded);
    setWatermarkedUrl(null);
    setError(null);
  };

  const hexToRgbPdf = (hex: string) => {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return rgb(r, g, b);
  };

  const handleApplyWatermark = async () => {
    if (!file || !watermarkText) return;

    setProcessing(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const pages = doc.getPages();
      const pdfColor = hexToRgbPdf(colorHex);
      const op = opacity[0] / 100.0;
      const size = fontSize[0];

      pages.forEach((page) => {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(watermarkText, size);
        const textHeight = font.heightAtSize(size);

        page.drawText(watermarkText, {
          x: width / 2 - textWidth / 2,
          y: height / 2 - textHeight / 2,
          size,
          font,
          color: pdfColor,
          opacity: op,
          rotate: degrees(45),
        });
      });

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      setWatermarkedUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setError("Failed to apply watermark: " + (err.message || String(err)));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Stamp className="w-5 h-5 text-primary" />
            Add Watermark to PDF
          </CardTitle>
          <Badge variant="outline">
            100% On-Device WASM
          </Badge>
        </div>
        <CardDescription className="text-muted-foreground">
          Stamp diagonal text watermarks across every page of your PDF document.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-none p-8 transition-all bg-muted/40 text-center">
          <input
            type="file"
            accept=".pdf"
            id="watermark-upload"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="watermark-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-none bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {file ? file.name : "Select a PDF Document"}
              </p>
            </div>
            <Button variant="default">
              Choose PDF File
            </Button>
          </label>
        </div>

        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        {file && (
          <div className="p-6 rounded-none bg-muted/60 border border-border space-y-6">
            <div className="space-y-2">
              <Label htmlFor="watermark-text" className="text-sm font-semibold text-foreground">
                Watermark Text
              </Label>
              <Input
                id="watermark-text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="e.g. CONFIDENTIAL / DRAFT / DO NOT COPY"
                className="bg-muted border-border text-foreground font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>Opacity</span>
                  <span className="font-mono text-foreground">{opacity[0]}%</span>
                </div>
                <Slider
                  value={opacity}
                  onValueChange={setOpacity}
                  min={5}
                  max={90}
                  step={5}
                  className="cursor-pointer"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>Font Size</span>
                  <span className="font-mono text-foreground">{fontSize[0]}px</span>
                </div>
                <Slider
                  value={fontSize}
                  onValueChange={setFontSize}
                  min={20}
                  max={120}
                  step={5}
                  className="cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground block">Stamp Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                    className="w-10 h-10 rounded-none cursor-pointer bg-transparent border-0"
                  />
                  <Input
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                    className="bg-muted border-border font-mono text-xs text-foreground"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleApplyWatermark}
              disabled={processing || !watermarkText}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-medium py-6"
            >
              {processing ? "Applying Watermark..." : "Stamp Watermark on All Pages"}
            </Button>
          </div>
        )}

        {watermarkedUrl && (
          <div className="p-4 rounded-none bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Watermark Applied!</h4>
                <p className="text-xs text-muted-foreground">Stamped across every page of your document.</p>
              </div>
            </div>
            <a
              href={watermarkedUrl}
              download={`${file?.name.replace(/\.pdf$/i, "")}_watermarked.pdf`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-none font-medium text-sm transition-all"
            >
              <Download className="w-4 h-4" />
              Download Watermarked PDF
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
