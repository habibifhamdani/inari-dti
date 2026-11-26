"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Lock,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { api, ApiError } from "@/lib/api";
import { VOTE_TIERS } from "@/lib/tiers";
import type { EditionStatus, Submission, TierPoints } from "@/types/dti";

interface ArtworkLightboxProps {
  submissions: Submission[];
  currentIndex: number | null;
  editionStatus: EditionStatus;
  canVote: boolean;
  selectedTiers: Partial<Record<TierPoints, number>>;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  onAssignTier: (submissionId: number, tier: TierPoints) => void;
}

interface LightboxSessionProps {
  submissions: Submission[];
  currentIndex: number;
  submission: Submission;
  editionStatus: EditionStatus;
  canVote: boolean;
  selectedTiers: Partial<Record<TierPoints, number>>;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  onAssignTier: (submissionId: number, tier: TierPoints) => void;
}

function LightboxSession({
  submissions,
  currentIndex,
  submission,
  editionStatus,
  canVote,
  selectedTiers,
  onClose,
  onNavigate,
  onAssignTier,
}: LightboxSessionProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const resetTransform = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const ext = submission.image_url.split(".").pop()?.split("?")[0] || "png";
      await api.editions.downloadSubmission(
        submission.edition_id,
        submission.id,
        `inari-dti-submission-${submission.id}.${ext}`
      );
    } catch (err) {
      setDownloadError(
        err instanceof ApiError ? err.message : "Gagal mengunduh gambar."
      );
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && submissions.length > 1) {
        onNavigate((currentIndex - 1 + submissions.length) % submissions.length);
      } else if (e.key === "ArrowRight" && submissions.length > 1) {
        onNavigate((currentIndex + 1) % submissions.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, submissions.length, onClose, onNavigate]);

  const assignedTier =
    VOTE_TIERS.find((t) => selectedTiers[t.points] === submission.id)?.points ??
    null;

  const clampScale = (next: number) =>
    Math.min(4, Math.max(0.5, Number(next.toFixed(2))));

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setScale((prev) => clampScale(prev + delta));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scale <= 1 && offset.x === 0 && offset.y === 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    setOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0E1015]/95 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Lossless Artwork Viewer"
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            src={submission.author.avatar_url}
            name={submission.author.name}
            size="sm"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-[#F3F4F6]">
                {submission.author.name}
              </span>
              {submission.is_own_submission && (
                <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[10px] uppercase text-[#F3F4F6]">
                  Your Entry
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#9CA3AF]">
              <span className="hidden sm:inline">LOSSLESS ORIGINAL</span>
              {submission.image_width && submission.image_height && (
                <span>
                  {submission.image_width}×{submission.image_height}px
                </span>
              )}
              <span>
                · {currentIndex + 1}/{submissions.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={downloading}
            onClick={() => void handleDownload()}
            title="Download Gambar Original"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-[#161922] px-2.5 text-xs font-medium text-[#F3F4F6] hover:border-white/30 disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            type="button"
            onClick={() => setScale((s) => clampScale(s - 0.25))}
            title="Zoom Out"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#161922] text-[#9CA3AF] hover:border-white/20 hover:text-[#F3F4F6]"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="hidden w-12 text-center font-mono text-xs tabular-nums text-[#F3F4F6] sm:inline-block">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => clampScale(s + 0.25))}
            title="Zoom In"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#161922] text-[#9CA3AF] hover:border-white/20 hover:text-[#F3F4F6]"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetTransform}
            title="Reset View"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#161922] text-[#9CA3AF] hover:border-white/20 hover:text-[#F3F4F6]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-[#161922] text-[#F3F4F6] hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="border-b border-rose-400/25 bg-rose-500/15 px-4 py-2 text-center text-xs text-rose-200">
          {downloadError}
        </div>
      )}

      {/* Main Viewport */}
      <div
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative flex flex-1 items-center justify-center overflow-hidden select-none ${
          scale > 1
            ? isDragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : "cursor-default"
        }`}
      >
        {submissions.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(
                  (currentIndex - 1 + submissions.length) % submissions.length
                );
              }}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-[#161922]/85 p-2.5 text-[#F3F4F6] backdrop-blur-md transition-colors hover:bg-white/15"
              aria-label="Previous artwork"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate((currentIndex + 1) % submissions.length);
              }}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-[#161922]/85 p-2.5 text-[#F3F4F6] backdrop-blur-md transition-colors hover:bg-white/15"
              aria-label="Next artwork"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={submission.image_url}
          alt={submission.caption || `Artwork by ${submission.author.name}`}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
          className="max-h-[calc(100vh-12rem)] max-w-[92vw] object-contain transition-transform duration-75"
        />
      </div>

      {/* Bottom Info & Lightbox Tier Voting Bar */}
      <div className="border-t border-white/[0.08] bg-[#161922]/90 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            {submission.caption ? (
              <p className="text-sm text-[#F3F4F6]">{submission.caption}</p>
            ) : (
              <p className="text-xs italic text-[#9CA3AF]">Tanpa caption.</p>
            )}
            <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
              Scroll untuk zoom · Drag saat di-zoom untuk pan · Panah
              kiri/kanan untuk navigasi
            </p>
          </div>

          {editionStatus === "voting_open" && canVote && (
            <div className="shrink-0">
              {submission.is_own_submission ? (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0E1015] px-3 py-2 text-xs text-[#9CA3AF]">
                  <Lock className="h-3.5 w-3.5" />
                  Karya sendiri tidak bisa di-vote
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {VOTE_TIERS.map((tier) => {
                    const isSelected = assignedTier === tier.points;
                    return (
                      <button
                        key={tier.points}
                        type="button"
                        onClick={() => onAssignTier(submission.id, tier.points)}
                        className={`rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold transition-all ${
                          isSelected
                            ? tier.badgeClass
                            : "border-white/10 bg-[#0E1015] text-[#9CA3AF] hover:border-white/25 hover:text-[#F3F4F6]"
                        }`}
                      >
                        {tier.name} ({tier.points}pt)
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ArtworkLightbox(props: ArtworkLightboxProps) {
  const { currentIndex, submissions } = props;
  if (currentIndex === null || !submissions[currentIndex]) return null;

  const submission = submissions[currentIndex];
  return (
    <LightboxSession
      key={submission.id}
      {...props}
      currentIndex={currentIndex}
      submission={submission}
    />
  );
}
