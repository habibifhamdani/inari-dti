"use client";

import { useState } from "react";
import { AlertCircle, EyeOff, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Submission } from "@/types/dti";

interface SubmissionModalProps {
  editionId: number;
  editionTitle: string;
  existingSubmission: Submission | null;
  onClose: () => void;
  onSubmitted: (message: string) => Promise<void> | void;
}

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function SubmissionModal({
  editionId,
  editionTitle,
  existingSubmission,
  onClose,
  onSubmitted,
}: SubmissionModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState(existingSubmission?.caption ?? "");
  const [isAnonymous, setIsAnonymous] = useState(
    existingSubmission?.is_anonymous ?? false
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (selected: File | null) => {
    setError(null);
    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError("Format file harus PNG, JPG, atau WEBP.");
      return;
    }

    if (selected.size > MAX_BYTES) {
      setError("Ukuran file maksimal 15MB.");
      return;
    }

    setFile(selected);
    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Pilih file ilustrasi terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }
      formData.append("is_anonymous", isAnonymous ? "1" : "0");

      const res = await api.submissions.submit(editionId, formData);
      await onSubmitted(res.message);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Gagal mengunggah karya. Coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#161922] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#F3F4F6]">
              {existingSubmission ? "Perbarui Karya DTI" : "Submit Karya DTI"}
            </h2>
            <p className="text-xs text-[#9CA3AF]">{editionTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0E1015] text-[#9CA3AF] hover:text-[#F3F4F6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {existingSubmission && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Mode Overwrite Aktif</p>
                <p className="mt-0.5 text-amber-200/80">
                  Kamu sudah punya submission pada edisi ini. Mengirim file baru akan
                  menimpa dan menghapus file lama dari storage.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* File Dropzone */}
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileChange(e.dataTransfer.files?.[0] ?? null);
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-[#0E1015]/70 p-6 text-center transition-colors hover:border-white/35"
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />

            {previewUrl ? (
              <div className="w-full space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="mx-auto max-h-60 rounded-xl object-contain"
                />
                <p className="font-mono text-xs text-[#9CA3AF]">
                  {file?.name} · {((file?.size ?? 0) / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#161922] text-[#F3F4F6]">
                  <ImagePlus className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-medium text-[#F3F4F6]">
                  Klik atau drop file ilustrasi ke sini
                </p>
                <p className="mt-1 font-mono text-xs text-[#9CA3AF]">
                  PNG / JPG / WEBP · Lossless original disimpan utuh · Maks 15 MB
                </p>
              </>
            )}
          </label>

          {/* Caption */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
              Caption / Catatan Karya (Opsional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ceritakan konsep, brush, atau inspirasi karyamu..."
              className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6] placeholder-[#9CA3AF]/50 focus:border-white/30 focus:outline-none"
            />
          </div>

          {/* Anonymous Toggle */}
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.08] bg-[#0E1015]/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <EyeOff className="h-4 w-4 text-[#9CA3AF]" />
              <div>
                <div className="text-sm font-medium text-[#F3F4F6]">
                  Anonymous Mode selama Voting
                </div>
                <div className="text-xs text-[#9CA3AF]">
                  Namamu disembunyikan hingga pemenang diumumkan.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 accent-[#F3F4F6]"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-[#9CA3AF] hover:text-[#F3F4F6]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !file}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-5 py-2.5 text-sm font-semibold text-[#0E1015] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {existingSubmission ? "Overwrite Karya" : "Kirim Karya"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
