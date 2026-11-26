"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  Upload,
} from "lucide-react";
import { ArtworkLightbox } from "@/components/ArtworkLightbox";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ExtensionPollCard } from "@/components/ExtensionPollCard";
import { HallOfFamePodium } from "@/components/HallOfFamePodium";
import { MasonryGallery } from "@/components/MasonryGallery";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmissionModal } from "@/components/SubmissionModal";
import { VotingDock } from "@/components/VotingDock";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, isAdminRole } from "@/lib/api";
import { VOTE_TIERS } from "@/lib/tiers";
import type {
  EditionDetailResponse,
  ExtensionPollSummary,
  TierPoints,
  VoteEntry,
} from "@/types/dti";

interface EditionExperienceProps {
  slug?: string;
}

function votesToMap(votes: VoteEntry[]): Partial<Record<TierPoints, number>> {
  const map: Partial<Record<TierPoints, number>> = {};
  for (const vote of votes) {
    map[vote.tier_points] = vote.submission_id;
  }
  return map;
}

function mapToVotes(map: Partial<Record<TierPoints, number>>): VoteEntry[] {
  const result: VoteEntry[] = [];
  for (const tier of VOTE_TIERS) {
    const submissionId = map[tier.points];
    if (submissionId !== undefined) {
      result.push({ submission_id: submissionId, tier_points: tier.points });
    }
  }
  return result;
}

export function EditionExperience({ slug }: EditionExperienceProps) {
  const { user } = useAuth();
  const [data, setData] = useState<EditionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [selectedTiers, setSelectedTiers] = useState<
    Partial<Record<TierPoints, number>>
  >({});
  const [savedTiers, setSavedTiers] = useState<Partial<Record<TierPoints, number>>>(
    {}
  );
  const [activeTierSlot, setActiveTierSlot] = useState<TierPoints | null>(null);
  const [submittingVotes, setSubmittingVotes] = useState(false);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);

  const fetchEdition = useCallback(async () => {
    try {
      const response = slug
        ? await api.editions.bySlug(slug)
        : await api.editions.active();
      setError(null);
      setData(response);
      const initialMap = votesToMap(response.my_votes ?? []);
      setSelectedTiers(initialMap);
      setSavedTiers(initialMap);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal memuat data edisi DTI dari server."
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = slug
          ? await api.editions.bySlug(slug)
          : await api.editions.active();
        if (!active) return;
        setError(null);
        setData(response);
        const initialMap = votesToMap(response.my_votes ?? []);
        setSelectedTiers(initialMap);
        setSavedTiers(initialMap);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Gagal memuat data edisi DTI dari server."
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, user?.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const hasUnsavedChanges = useMemo(() => {
    return VOTE_TIERS.some(
      (t) => selectedTiers[t.points] !== savedTiers[t.points]
    );
  }, [selectedTiers, savedTiers]);

  const handleAssignTier = (submissionId: number, tier: TierPoints) => {
    setSelectedTiers((prev) => {
      const next: Partial<Record<TierPoints, number>> = { ...prev };

      if (next[tier] === submissionId) {
        delete next[tier];
        return next;
      }

      // Enforce one artwork per ballot: remove this submission from any other tier slot.
      for (const t of VOTE_TIERS) {
        if (next[t.points] === submissionId) {
          delete next[t.points];
        }
      }

      next[tier] = submissionId;
      return next;
    });
    setActiveTierSlot(null);
  };

  const handleClearSlot = (tier: TierPoints) => {
    setSelectedTiers((prev) => {
      const next = { ...prev };
      delete next[tier];
      return next;
    });
  };

  const handleSubmitVotes = async () => {
    if (!data?.edition) return;
    const payload = mapToVotes(selectedTiers);
    if (payload.length === 0) return;

    setSubmittingVotes(true);
    setError(null);

    try {
      const res = await api.votes.sync(data.edition.id, payload);
      const nextMap = votesToMap(res.my_votes);
      setSelectedTiers(nextMap);
      setSavedTiers(nextMap);
      setToast(res.message);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menyimpan voting."
      );
    } finally {
      setSubmittingVotes(false);
    }
  };

  const handleExtensionVoted = (
    updated: ExtensionPollSummary,
    message: string
  ) => {
    setData((prev) =>
      prev && prev.edition
        ? {
            ...prev,
            edition: {
              ...prev.edition,
              extension_poll: updated,
            },
          }
        : prev
    );
    setToast(message);
  };

  const handleInspectSubmissionById = (submissionId: number) => {
    if (!data) return;
    const idx = data.submissions.findIndex((s) => s.id === submissionId);
    if (idx !== -1) {
      setLightboxIndex(idx);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4">
        <div className="flex items-center gap-3 text-sm text-[#9CA3AF]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Memuat ruang pamer INARI DTI...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-red-400/25 bg-[#161922] p-8">
          <p className="text-base font-semibold text-[#F3F4F6]">{error}</p>
          <button
            type="button"
            onClick={() => void fetchEdition()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#0E1015] px-4 py-2 text-sm text-[#F3F4F6] hover:border-white/30"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!data?.edition) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-white/[0.08] bg-[#161922] p-10">
          <h1 className="text-2xl font-bold text-[#F3F4F6]">
            Belum Ada Edisi DTI Aktif
          </h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            Pantau terus pengumuman Divisi Gambar UKM Inari IPB, atau cek arsip edisi
            sebelumnya.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/archive"
              className="rounded-xl border border-white/15 bg-[#0E1015] px-4 py-2.5 text-sm font-medium text-[#F3F4F6] hover:border-white/30"
            >
              Lihat Archive
            </Link>
            {isAdminRole(user) && (
              <Link
                href="/admin"
                className="rounded-xl bg-[#F3F4F6] px-4 py-2.5 text-sm font-semibold text-[#0E1015] hover:bg-white"
              >
                Buat Edisi Baru
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const {
    edition,
    submissions,
    submissions_locked: submissionsLocked = false,
    my_submission: mySubmission,
    standings,
  } = data;
  const isVerifiedUser = Boolean(user && user.is_verified);
  const blacklistLevel = user?.blacklist?.level ?? null;
  const isUploadBlocked = blacklistLevel !== null;
  const isVotingBlocked =
    blacklistLevel === "interaction_blocked" || blacklistLevel === "full_ban";
  const canVote =
    edition.status === "voting_open" && isVerifiedUser && !isVotingBlocked;

  const activeDeadline =
    edition.status === "submission_open"
      ? { iso: edition.submission_deadline, label: "Submission Deadline" }
      : edition.status === "extension_poll"
      ? { iso: edition.poll_deadline, label: "Extension Poll Ends" }
      : edition.status === "voting_open"
      ? { iso: edition.voting_deadline, label: "Voting Ends" }
      : null;

  return (
    <div
      className={`mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 ${
        canVote ? "pb-36 lg:pb-28" : "pb-16"
      }`}
    >
      {/* Toast / Error Alerts */}
      {toast && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toast}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {user?.blacklist && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">
              Akun kamu terkena pembatasan blacklist ({user.blacklist.level}):
            </span>{" "}
            {user.blacklist.level === "upload_blocked"
              ? "Kamu tidak dapat mengupload karya pada edisi DTI."
              : "Kamu tidak dapat mengupload karya maupun melakukan voting."}
            {user.blacklist.reason && (
              <span className="block text-xs text-rose-200/80">
                Alasan: {user.blacklist.reason}
              </span>
            )}
          </div>
        </div>
      )}

      {user && !user.is_verified && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Email kamu (<strong>{user.email}</strong>) belum diverifikasi.
              Verifikasi email diperlukan untuk submit karya dan voting.
            </span>
          </div>
          <Link
            href="/verify-email"
            className="shrink-0 rounded-lg border border-amber-300/35 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold hover:bg-amber-500/25"
          >
            Verifikasi Sekarang
          </Link>
        </div>
      )}

      {/* Edition Hero Card */}
      <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#161922] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={edition.status} />
              <span className="font-mono text-xs text-[#9CA3AF]">
                /{edition.slug} · {edition.visible_submissions_count} Karya
              </span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-[#F3F4F6] sm:text-4xl">
              {edition.title}
            </h1>

            <p className="whitespace-pre-line text-sm leading-relaxed text-[#9CA3AF] sm:text-base">
              {edition.prompt}
            </p>

            {/* Primary Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {activeDeadline && (
                <CountdownTimer
                  targetIso={activeDeadline.iso}
                  label={activeDeadline.label}
                  onExpired={() => void fetchEdition()}
                />
              )}

              {edition.status === "submission_open" && (
                <>
                  {isVerifiedUser ? (
                    <button
                      type="button"
                      disabled={isUploadBlocked}
                      onClick={() => setShowSubmitModal(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-5 py-3 text-sm font-semibold text-[#0E1015] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Upload className="h-4 w-4" />
                      {mySubmission ? "Overwrite Karyaku" : "Submit Karya"}
                    </button>
                  ) : !user ? (
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-5 py-3 text-sm font-semibold text-[#0E1015] transition-colors hover:bg-white"
                    >
                      Sign In untuk Submit
                    </Link>
                  ) : null}
                </>
              )}

              {edition.status === "voting_open" && !user && (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-5 py-3 text-sm font-semibold text-[#0E1015] transition-colors hover:bg-white"
                >
                  Sign In untuk Voting
                </Link>
              )}
            </div>
          </div>

          {/* Optional Reference Image */}
          {edition.reference_image_url && (
            <div className="w-full shrink-0 lg:w-72">
              <button
                type="button"
                onClick={() => setShowReferenceModal(true)}
                className="group relative block w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0E1015] text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={edition.reference_image_url}
                  alt="Reference Prompt"
                  className="max-h-56 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="flex items-center justify-between border-t border-white/[0.08] px-3 py-2 text-xs text-[#9CA3AF]">
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Reference Visual
                  </span>
                  <span className="text-[11px] text-[#F3F4F6]">Zoom</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Own submission banner */}
        {mySubmission && (
          <div className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#0E1015]/75 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mySubmission.thumbnail_url}
                alt="Your Submission"
                className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#F3F4F6]">
                  <span>Karyamu sudah masuk</span>
                  {mySubmission.is_anonymous && (
                    <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-[#9CA3AF]">
                      Anonymous
                    </span>
                  )}
                  {mySubmission.is_hidden && (
                    <span className="rounded border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] text-rose-200">
                      Hidden by Moderator
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-[#9CA3AF]">
                  {mySubmission.caption || "Tanpa caption"}
                </p>
              </div>
            </div>

            {edition.status === "submission_open" &&
              isVerifiedUser &&
              !isUploadBlocked && (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="shrink-0 rounded-xl border border-white/15 bg-[#161922] px-3.5 py-2 text-xs font-semibold text-[#F3F4F6] hover:border-white/30"
                >
                  Ganti / Edit Karya
                </button>
              )}
          </div>
        )}
      </section>

      {/* Extension Poll Banner */}
      {edition.status === "extension_poll" && (
        <ExtensionPollCard
          edition={edition}
          isVerifiedUser={isVerifiedUser && !isVotingBlocked}
          onVoted={handleExtensionVoted}
        />
      )}

      {/* Voting Instructions Banner */}
      {edition.status === "voting_open" && (
        <section className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#161922]/80 px-5 py-4 text-sm text-[#9CA3AF]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#F3F4F6]" />
          <div>
            <span className="font-semibold text-[#F3F4F6]">
              Tiered Voting Dibuka:
            </span>{" "}
            Alokasikan antara <strong>1 hingga 5 tier</strong> (Netherite 5pt
            sampai Copper 1pt) ke karya favoritmu lewat dock di bawah atau klik
            karya untuk inspect lossless. Tidak wajib mengisi semua 5 slot.
          </div>
        </section>
      )}

      {/* Completed Hall of Fame Podium */}
      {edition.status === "completed" && standings && (
        <HallOfFamePodium
          standings={standings}
          onInspectSubmission={handleInspectSubmissionById}
        />
      )}

      {/* Masonry Gallery (or Locked state until submission_deadline passes for non-admins) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-bold text-[#F3F4F6]">
              {edition.status === "completed"
                ? "Gallery Showcase"
                : "Submitted Artworks"}
              <span className="ml-2 font-mono text-sm font-normal text-[#9CA3AF]">
                ({edition.visible_submissions_count})
              </span>
            </h2>
            {!submissionsLocked &&
              edition.status === "submission_open" &&
              isAdminRole(user) && (
                <span className="rounded-full border border-purple-400/35 bg-purple-500/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-purple-200">
                  Admin Preview · Tersembunyi bagi Member
                </span>
              )}
          </div>
          {!submissionsLocked && (
            <span className="font-mono text-xs text-[#9CA3AF]">
              Aspect-ratio preserved · Click for lossless viewer
            </span>
          )}
        </div>

        {submissionsLocked ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#161922] px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#0E1015] text-[#F3F4F6]">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#F3F4F6]">
              Galeri Karya Terkunci Selama Periode Pengumpulan
            </h3>
            <p className="mx-auto mt-1.5 max-w-lg text-sm text-[#9CA3AF]">
              Karya peserta ({edition.visible_submissions_count} karya masuk)
              baru dapat dilihat secara publik setelah tenggat submission{" "}
              <span className="font-mono text-[#F3F4F6]">
                {new Date(edition.submission_deadline).toLocaleString("id-ID")}
              </span>{" "}
              berakhir, kecuali oleh Admin / Kadiv GA.
            </p>
          </div>
        ) : (
          <MasonryGallery
            submissions={submissions}
            editionStatus={edition.status}
            canVote={canVote}
            selectedTiers={selectedTiers}
            activeTierSlot={activeTierSlot}
            onOpenLightbox={(index) => setLightboxIndex(index)}
            onAssignTier={handleAssignTier}
          />
        )}
      </section>

      {/* Sticky Bottom Voting Dock */}
      {canVote && (
        <VotingDock
          submissions={submissions}
          selectedTiers={selectedTiers}
          activeTierSlot={activeTierSlot}
          submitting={submittingVotes}
          hasUnsavedChanges={hasUnsavedChanges}
          onSelectSlot={setActiveTierSlot}
          onClearSlot={handleClearSlot}
          onSubmitVotes={() => void handleSubmitVotes()}
        />
      )}

      {/* Lossless Lightbox */}
      <ArtworkLightbox
        submissions={submissions}
        currentIndex={lightboxIndex}
        editionStatus={edition.status}
        canVote={canVote}
        selectedTiers={selectedTiers}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(nextIdx) => setLightboxIndex(nextIdx)}
        onAssignTier={handleAssignTier}
      />

      {/* Submission Upload / Overwrite Modal */}
      {showSubmitModal && (
        <SubmissionModal
          editionId={edition.id}
          editionTitle={edition.title}
          existingSubmission={mySubmission}
          onClose={() => setShowSubmitModal(false)}
          onSubmitted={async (msg) => {
            setToast(msg);
            await fetchEdition();
          }}
        />
      )}

      {/* Reference Image Zoom Modal */}
      {showReferenceModal && edition.reference_image_url && (
        <div
          onClick={() => setShowReferenceModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={edition.reference_image_url}
            alt="Reference Visual Full"
            className="max-h-[90vh] max-w-[92vw] rounded-2xl border border-white/10 object-contain"
          />
        </div>
      )}
    </div>
  );
}
