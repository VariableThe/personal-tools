"use client";

import React, { useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileDropzoneProps {
  accept: string;
  onFiles: (files: FileList) => void;
  title?: string;
  formatsLine: string;
  progress?: { done: number; total: number } | null;
}

export function FileDropzone({
  accept,
  onFiles,
  title = "Drop photos & videos here",
  formatsLine,
  progress,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className="border border-dashed border-border hover:border-primary/50 bg-muted/20 p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="w-12 h-12 border border-border bg-card flex items-center justify-center">
        <Upload className="w-6 h-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-wide">{title}</p>
        <p className="font-mono text-xs text-muted-foreground mt-1">{formatsLine}</p>
      </div>
      <Button
        variant="outline"
        className="pointer-events-none font-mono text-xs uppercase tracking-wide rounded-none"
      >
        Select Files
      </Button>
      {progress && (
        <p className="font-mono text-xs text-primary flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Converting HEIC on-device… {progress.done}/{progress.total}
        </p>
      )}
    </div>
  );
}
