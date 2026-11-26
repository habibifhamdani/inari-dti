"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Calendar,
  Download,
  Layers,
  Loader2,
  Lock,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import type { DtiEdition } from "@/types/dti";

export default function ArchivePage() {
  const { user } = useAuth();
  const [editions, setEditions] = useState<DtiEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.editions.list();
        if (active) {
          setError(null);
          setEditions(res.editions);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Gagal memuat daftar arsip edisi."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleDownloadAll = async (edition: DtiEdition) => {
    setDownloadingId(edition.id);
    setError(null);
    try {
      await api.editions.downloadAll(
        edition.id,
        `${edition.slug}-submissions.zip`
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal mengunduh arsip gambar edisi."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#9CA3AF]">
          <Layers className="h-3.5 w-3.5" />
          Divisi Gambar · UKM Inari IPB
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#F3F4F6]">
          DTI Editions Archive
        </h1>
        <p className="text-sm text-[#9CA3AF]">
          Jelajahi seluruh edisi Draw to Impress, prompt terdahulu, Hall of Fame,
          dan unduh arsip karya peserta per edisi.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2.5 py-12 text-sm text-[#9CA3AF]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat arsip edisi...
        </div>
      ) : editions.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#161922] p-10 text-center text-sm text-[#9CA3AF]">
          Belum ada edisi DTI yang dipublikasikan.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {editions.map((edition) => {
            const isLocked = Boolean(edition.submissions_locked);
            const canDownloadAll =
              edition.visible_submissions_count > 0 && !isLocked;

            return (
              <div
                key={edition.id}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#161922] p-6 transition-colors hover:border-white/20"
              >
                <Link
                  href={`/editions/${edition.slug}`}
                  className="group block space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={edition.status} />
                    <ArrowUpRight className="h-4 w-4 text-[#9CA3AF] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#F3F4F6]" />
                  </div>

                  <h2 className="text-lg font-bold text-[#F3F4F6] group-hover:underline">
                    {edition.title}
                  </h2>
                  <p className="line-clamp-3 text-sm leading-relaxed text-[#9CA3AF]">
                    {edition.prompt}
                  </p>
                </Link>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-[#9CA3AF]">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(edition.voting_deadline).toLocaleDateString(
                        "id-ID",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </span>
                    <span>· {edition.visible_submissions_count} karya</span>
                  </div>

                  {canDownloadAll ? (
                    <button
                      type="button"
                      disabled={downloadingId === edition.id}
                      onClick={() => void handleDownloadAll(edition)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0E1015] px-3 py-1.5 text-xs font-semibold text-[#F3F4F6] transition-colors hover:border-white/30 disabled:opacity-50"
                    >
                      {downloadingId === edition.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Download All (.zip)
                    </button>
                  ) : isLocked && edition.visible_submissions_count > 0 ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#9CA3AF]">
                      <Lock className="h-3 w-3" />
                      Locked until deadline
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
