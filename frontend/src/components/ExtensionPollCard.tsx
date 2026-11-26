"use client";

import { useState } from "react";
import { Check, Loader2, Vote, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { DtiEdition, ExtensionPollSummary } from "@/types/dti";

interface ExtensionPollCardProps {
  edition: DtiEdition;
  isVerifiedUser: boolean;
  onVoted: (updated: ExtensionPollSummary, message: string) => void;
}

export function ExtensionPollCard({
  edition,
  isVerifiedUser,
  onVoted,
}: ExtensionPollCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poll = edition.extension_poll ?? {
    agree_count: 0,
    disagree_count: 0,
    total_votes: 0,
    user_vote: null,
  };

  const agreePct =
    poll.total_votes > 0
      ? Math.round((poll.agree_count / poll.total_votes) * 100)
      : 50;

  const castVote = async (agree: boolean) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.votes.voteExtension(edition.id, agree);
      onVoted(res.extension_poll, res.message);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal mencatat suara polling."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-amber-400/25 bg-[#161922] p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-amber-300">
            <Vote className="h-4 w-4" />
            Deadline Extension Poll · Submissions &lt; 5 ({edition.visible_submissions_count} karya)
          </div>
          <h3 className="text-lg font-bold text-[#F3F4F6]">
            Perpanjang Deadline Pengumpulan +3 Hari?
          </h3>
          <p className="text-sm text-[#9CA3AF]">
            Jumlah karya yang masuk belum mencapai minimal 5 karya. Jika suara{" "}
            <span className="text-[#F3F4F6]">Setuju Perpanjang</span> lebih banyak saat
            polling berakhir, deadline submission akan diperpanjang 3 hari. Jika tidak,
            edisi langsung masuk tahap voting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!isVerifiedUser || submitting}
            onClick={() => void castVote(true)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
              poll.user_vote === true
                ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
                : "border-white/15 bg-[#0E1015] text-[#F3F4F6] hover:border-white/30"
            }`}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Setuju (+3 Hari)
          </button>

          <button
            type="button"
            disabled={!isVerifiedUser || submitting}
            onClick={() => void castVote(false)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
              poll.user_vote === false
                ? "border-rose-400/60 bg-rose-500/20 text-rose-200"
                : "border-white/15 bg-[#0E1015] text-[#F3F4F6] hover:border-white/30"
            }`}
          >
            <X className="h-4 w-4" />
            Lanjut Voting
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs text-rose-300">{error}</p>
      )}

      {/* Tally Bar */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between font-mono text-xs text-[#9CA3AF]">
          <span>
            Setuju: <strong className="text-[#F3F4F6]">{poll.agree_count}</strong>
          </span>
          <span>Total: {poll.total_votes} suara</span>
          <span>
            Lanjut Voting:{" "}
            <strong className="text-[#F3F4F6]">{poll.disagree_count}</strong>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#0E1015]">
          <div
            className="h-full bg-emerald-400/80 transition-all duration-300"
            style={{ width: `${agreePct}%` }}
          />
        </div>
      </div>
    </section>
  );
}
