"use client";

import { useRef, useState } from "react";
import { Check, Loader2, Move, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

interface AvatarCropperModalProps {
  imageSrc: string;
  fileName: string;
  onCancel: () => void;
  onConfirm: (croppedFile: File, previewUrl: string) => void;
}

const CROP_DIAMETER = 240;
const OUTPUT_SIZE = 512;

export function AvatarCropperModal({
  imageSrc,
  fileName,
  onCancel,
  onConfirm,
}: AvatarCropperModalProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(
    null
  );
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exporting, setExporting] = useState(false);

  const baseScale = naturalSize
    ? CROP_DIAMETER / Math.min(naturalSize.w, naturalSize.h)
    : 1;
  const effectiveScale = baseScale * zoom;
  const dispW = naturalSize ? naturalSize.w * effectiveScale : CROP_DIAMETER;
  const dispH = naturalSize ? naturalSize.h * effectiveScale : CROP_DIAMETER;

  const clampOffset = (
    nextX: number,
    nextY: number,
    nextZoom: number
  ): { x: number; y: number } => {
    if (!naturalSize) return { x: 0, y: 0 };
    const nextScale = (CROP_DIAMETER / Math.min(naturalSize.w, naturalSize.h)) * nextZoom;
    const w = naturalSize.w * nextScale;
    const h = naturalSize.h * nextScale;
    const maxX = Math.max(0, (w - CROP_DIAMETER) / 2);
    const maxY = Math.max(0, (h - CROP_DIAMETER) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, nextX)),
      y: Math.min(maxY, Math.max(-maxY, nextY)),
    };
  };

  const handleZoomChange = (rawZoom: number) => {
    const nextZoom = Math.min(3, Math.max(1, Number(rawZoom.toFixed(2))));
    setZoom(nextZoom);
    setOffset((prev) => clampOffset(prev.x, prev.y, nextZoom));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const rawX = e.clientX - dragStartRef.current.x;
    const rawY = e.clientY - dragStartRef.current.y;
    setOffset(clampOffset(rawX, rawY, zoom));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    handleZoomChange(zoom + delta);
  };

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img || !naturalSize) return;

    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const ratio = OUTPUT_SIZE / CROP_DIAMETER;
      const drawW = dispW * ratio;
      const drawH = dispH * ratio;
      const drawX = OUTPUT_SIZE / 2 + offset.x * ratio - drawW / 2;
      const drawY = OUTPUT_SIZE / 2 + offset.y * ratio - drawH / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1)
      );
      if (!blob) return;

      const baseName = fileName.replace(/\.[^.]+$/, "") || "avatar";
      const croppedFile = new File([blob], `${baseName}-cropped.png`, {
        type: "image/png",
      });
      const previewUrl = URL.createObjectURL(croppedFile);
      onConfirm(croppedFile, previewUrl);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Atur Posisi Foto Profil"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#161922] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-[#F3F4F6]">
              Atur Posisi &amp; Zoom Foto Profil
            </h3>
            <p className="text-xs text-[#9CA3AF]">
              Geser gambar dan atur zoom sesuai bagian yang ingin ditampilkan.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#0E1015] text-[#9CA3AF] hover:text-[#F3F4F6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Interactive Crop Viewport */}
          <div
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`relative mx-auto h-72 w-full max-w-[320px] touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-[#0E1015] ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop Preview"
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              style={{
                width: `${dispW}px`,
                height: `${dispH}px`,
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
              className="pointer-events-none absolute max-w-none"
            />

            {/* Circular Cutout Overlay */}
            <div
              style={{
                width: `${CROP_DIAMETER}px`,
                height: `${CROP_DIAMETER}px`,
                boxShadow: "0 0 0 9999px rgba(14, 16, 21, 0.72)",
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/75"
            />

            <div className="pointer-events-none absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-[#0E1015]/85 px-2.5 py-1 font-mono text-[10px] text-[#F3F4F6] backdrop-blur-sm">
              <Move className="h-3 w-3 text-[#9CA3AF]" />
              Drag untuk geser
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.2)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0E1015] text-[#9CA3AF] hover:text-[#F3F4F6]"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="w-full accent-[#F3F4F6]"
            />

            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.2)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0E1015] text-[#9CA3AF] hover:text-[#F3F4F6]"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0E1015] text-[#9CA3AF] hover:text-[#F3F4F6]"
              title="Reset Posisi"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.08] px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[#9CA3AF] hover:text-[#F3F4F6]"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={exporting || !naturalSize}
            onClick={() => void handleConfirm()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-4 py-2 text-sm font-semibold text-[#0E1015] hover:bg-white disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Terapkan Crop
          </button>
        </div>
      </div>
    </div>
  );
}
