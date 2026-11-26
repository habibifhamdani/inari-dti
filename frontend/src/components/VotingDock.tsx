"use client";

import { Check, Loader2, Sparkles, X } from "lucide-react";
import { VOTE_TIERS } from "@/lib/tiers";
import type { Submission, TierPoints } from "@/types/dti";

interface VotingDockProps {
  submissions: Submission[];
  selectedTiers: Partial<Record<TierPoints, number>>;
  activeTierSlot: TierPoints | null;
  submitting: boolean;
  hasUnsavedChanges: boolean;
  onSelectSlot: (tier: TierPoints | null) => void;
  onClearSlot: (tier: TierPoints) => void;
  onSubmitVotes: () => void;
}

export function VotingDock({
  submissions,
  selectedTiers,
  activeTierSlot,
  submitting,
  hasUnsavedChanges,
  onSelectSlot,
  onClearSlot,
  onSubmitVotes,
}: VotingDockProps) {
  const submissionsById = new Map(submissions.map((s) => [s.id, s]));

  const filledEntries = VOTE_TIERS.filter((tier) => selectedTiers[tier.points] !== undefined);
  const totalAssignedPoints = filledEntries.reduce((sum, tier) => sum + tier.points, 0);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.1] bg-[#0E1015]/92 px-3 py-3 shadow-2xl backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* 5 Tier Slots */}
        <div className="grid grid-cols-5 gap-2 lg:flex lg:flex-1 lg:items-center lg:gap-2.5">
          {VOTE_TIERS.map((tier) => {
            const assignedId = selectedTiers[tier.points];
            const assignedSubmission =
              assignedId !== undefined ? submissionsById.get(assignedId) : undefined;
            const isSlotActive = activeTierSlot === tier.points;

            return (
              <div
                key={tier.points}
                style={assignedSubmission ? { boxShadow: tier.glowStyle } : undefined}
                className={`relative flex min-w-0 flex-1 items-center gap-2 rounded-xl border p-1.5 transition-all ${
                  isSlotActive
                    ? `${tier.slotRingClass} bg-[#1C202B]`
                    : assignedSubmission
                    ? `${tier.badgeClass}`
                    : "border-white/[0.08] bg-[#161922] hover:border-white/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    onSelectSlot(isSlotActive ? null : tier.points)
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {assignedSubmission ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={assignedSubmission.thumbnail_url}
                      alt={assignedSubmission.author.name}
                      className="h-9 w-9 shrink-0 rounded-lg border border-white/15 object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#0E1015]/70 font-mono text-xs font-bold"
                      style={{ color: tier.accentHex }}
                    >
                      {tier.points}p
                    </div>
                  )}

                  <div className="hidden min-w-0 flex-1 sm:block">
                    <div className="flex items-center gap-1">
                      <span
                        className="font-mono text-[11px] font-bold uppercase tracking-wide"
                        style={{ color: tier.accentHex }}
                      >
                        {tier.name}
                      </span>
                      <span className="font-mono text-[10px] text-[#9CA3AF]">
                        {tier.points}pt
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-[#F3F4F6]/90">
                      {assignedSubmission
                        ? assignedSubmission.author.name
                        : isSlotActive
                        ? "Klik karya..."
                        : "Kosong"}
                    </p>
                  </div>
                </button>

                {assignedSubmission && (
                  <button
                    type="button"
                    onClick={() => onClearSlot(tier.points)}
                    title={`Kosongkan slot ${tier.name}`}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0E1015]/60 text-[#9CA3AF] hover:bg-[#0E1015] hover:text-[#F3F4F6]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary & Submit Action */}
        <div className="flex items-center justify-between gap-3 lg:shrink-0">
          <div className="text-left lg:text-right">
            <div className="flex items-center gap-1.5 font-mono text-xs text-[#F3F4F6]">
              <Sparkles className="h-3.5 w-3.5 text-[#9CA3AF]" />
              <span>
                {filledEntries.length}/5 slots · {totalAssignedPoints} pts
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF]">
              {hasUnsavedChanges
                ? "Ada perubahan belum disimpan"
                : filledEntries.length > 0
                ? "Ballot tersimpan"
                : "Pilih 1–5 karya favorit"}
            </p>
          </div>

          <button
            type="button"
            disabled={filledEntries.length === 0 || submitting}
            onClick={onSubmitVotes}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#F3F4F6] px-4 py-2.5 text-sm font-semibold text-[#0E1015] transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Submit Votes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
