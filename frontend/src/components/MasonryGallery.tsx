"use client";

import { Expand, Lock, Sparkles } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { getTierConfig, VOTE_TIERS } from "@/lib/tiers";
import type { EditionStatus, Submission, TierPoints } from "@/types/dti";

interface MasonryGalleryProps {
  submissions: Submission[];
  editionStatus: EditionStatus;
  canVote: boolean;
  selectedTiers: Partial<Record<TierPoints, number>>;
  activeTierSlot: TierPoints | null;
  onOpenLightbox: (index: number) => void;
  onAssignTier: (submissionId: number, tier: TierPoints) => void;
}

export function MasonryGallery({
  submissions,
  editionStatus,
  canVote,
  selectedTiers,
  activeTierSlot,
  onOpenLightbox,
  onAssignTier,
}: MasonryGalleryProps) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#161922] px-6 py-16 text-center">
        <p className="text-base font-medium text-[#F3F4F6]">
          Belum ada karya yang masuk pada edisi ini.
        </p>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Jadilah kontributor pertama yang mengirimkan ilustrasi terbaikmu.
        </p>
      </div>
    );
  }

  const getAssignedTierForSubmission = (submissionId: number): TierPoints | null => {
    for (const tier of VOTE_TIERS) {
      if (selectedTiers[tier.points] === submissionId) {
        return tier.points;
      }
    }
    return null;
  };

  return (
    <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3 xl:columns-4">
      {submissions.map((submission, index) => {
        const assignedTier = getAssignedTierForSubmission(submission.id);
        const tierConfig = assignedTier ? getTierConfig(assignedTier) : null;
        const aspectStyle =
          submission.image_width && submission.image_height
            ? { aspectRatio: `${submission.image_width} / ${submission.image_height}` }
            : undefined;

        return (
          <article
            key={submission.id}
            style={tierConfig ? { boxShadow: tierConfig.glowStyle } : undefined}
            className={`group relative break-inside-avoid overflow-hidden rounded-2xl border bg-[#161922] transition-all duration-200 ${
              tierConfig
                ? tierConfig.slotRingClass
                : "border-white/[0.08] hover:border-white/20"
            }`}
          >
            {/* Aspect-preserving image preview */}
            <button
              type="button"
              onClick={() => onOpenLightbox(index)}
              className="relative block w-full cursor-zoom-in overflow-hidden bg-[#0E1015] text-left"
              style={aspectStyle}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={submission.thumbnail_url}
                alt={submission.caption || `Artwork by ${submission.author.name}`}
                loading="lazy"
                className="h-auto w-full object-contain transition-transform duration-300 group-hover:scale-[1.015]"
              />

              {/* Top-left badges */}
              <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                {submission.is_own_submission && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-[#0E1015]/85 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#F3F4F6] backdrop-blur-md">
                    Your Entry
                  </span>
                )}
              </div>

              {/* Top-right assigned tier or lossless zoom hint */}
              <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5">
                {tierConfig ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold shadow-lg backdrop-blur-md ${tierConfig.badgeClass}`}
                  >
                    <Sparkles className="h-3 w-3" />
                    {tierConfig.name} · {tierConfig.points}pt
                  </span>
                ) : (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-[#0E1015]/75 text-[#F3F4F6] opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
                    <Expand className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </button>

            {/* Card Footer */}
            <div className="border-t border-white/[0.06] px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar
                    src={submission.author.avatar_url}
                    name={submission.author.name}
                    size="xs"
                  />
                  <span className="truncate text-sm font-semibold text-[#F3F4F6]">
                    {submission.author.name}
                  </span>
                </div>
                {submission.image_width && submission.image_height && (
                  <span className="shrink-0 font-mono text-[11px] text-[#9CA3AF]">
                    {submission.image_width}×{submission.image_height}
                  </span>
                )}
              </div>

              {submission.caption && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#9CA3AF]">
                  {submission.caption}
                </p>
              )}

              {/* Voting Controls during voting_open */}
              {editionStatus === "voting_open" && canVote && (
                <div className="mt-3 border-t border-white/[0.06] pt-2.5">
                  {submission.is_own_submission ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                      <Lock className="h-3 w-3" />
                      <span>Karya sendiri tidak dapat di-vote</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {activeTierSlot !== null && (
                        <button
                          type="button"
                          onClick={() => onAssignTier(submission.id, activeTierSlot)}
                          className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                            getTierConfig(activeTierSlot).badgeClass
                          }`}
                        >
                          {assignedTier === activeTierSlot
                            ? `Terpasang di ${getTierConfig(activeTierSlot).name} (Klik untuk lepas)`
                            : `Pilih ke slot ${getTierConfig(activeTierSlot).name} (${activeTierSlot}pt)`}
                        </button>
                      )}

                      <div className="grid grid-cols-5 gap-1">
                        {VOTE_TIERS.map((tier) => {
                          const isSelectedHere = assignedTier === tier.points;
                          return (
                            <button
                              key={tier.points}
                              type="button"
                              onClick={() => onAssignTier(submission.id, tier.points)}
                              title={`${tier.name} (${tier.points} pt)`}
                              className={`rounded-md border py-1 font-mono text-[11px] font-semibold transition-all ${
                                isSelectedHere
                                  ? tier.badgeClass
                                  : "border-white/[0.08] bg-[#0E1015]/70 text-[#9CA3AF] hover:border-white/25 hover:text-[#F3F4F6]"
                              }`}
                            >
                              {tier.points}p
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
