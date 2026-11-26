"use client";

import { Award, Crown, Medal, Sparkles } from "lucide-react";
import { VOTE_TIERS } from "@/lib/tiers";
import type { StandingEntry, StandingsData } from "@/types/dti";

interface HallOfFamePodiumProps {
  standings: StandingsData;
  onInspectSubmission: (submissionId: number) => void;
}

const PODIUM_STYLES: Record<
  number,
  {
    label: string;
    borderClass: string;
    badgeClass: string;
    accentHex: string;
    orderClass: string;
  }
> = {
  1: {
    label: "1st Place · Gold",
    borderClass: "border-[#FACC15]/50 shadow-[0_0_32px_rgba(250,204,21,0.12)]",
    badgeClass: "border-[#FACC15]/60 bg-[#FACC15]/15 text-[#FEF08A]",
    accentHex: "#FACC15",
    orderClass: "lg:order-2 lg:-mt-4",
  },
  2: {
    label: "2nd Place · Silver",
    borderClass: "border-[#E5E7EB]/40",
    badgeClass: "border-[#E5E7EB]/50 bg-[#E5E7EB]/10 text-[#F3F4F6]",
    accentHex: "#E5E7EB",
    orderClass: "lg:order-1",
  },
  3: {
    label: "3rd Place · Bronze",
    borderClass: "border-[#EA580C]/45",
    badgeClass: "border-[#EA580C]/55 bg-[#EA580C]/15 text-[#FED7AA]",
    accentHex: "#EA580C",
    orderClass: "lg:order-3",
  },
};

function TierBreakdownPills({ entry }: { entry: StandingEntry }) {
  const counts: Record<number, number> = {
    5: entry.breakdown.netherite,
    4: entry.breakdown.diamond,
    3: entry.breakdown.gold,
    2: entry.breakdown.iron,
    1: entry.breakdown.copper,
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {VOTE_TIERS.map((tier) => {
        const count = counts[tier.points] ?? 0;
        return (
          <span
            key={tier.points}
            title={`${tier.name} (${tier.points}pt)`}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold ${
              count > 0
                ? tier.badgeClass
                : "border-white/[0.06] bg-[#0E1015]/60 text-[#9CA3AF]/50"
            }`}
          >
            {tier.shortName} ×{count}
          </span>
        );
      })}
    </div>
  );
}

export function HallOfFamePodium({
  standings,
  onInspectSubmission,
}: HallOfFamePodiumProps) {
  const { winners, honorable_mentions: honorableMentions, standings: allRows } =
    standings;

  if (allRows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-10">
      {/* Main Winners Podium (Ranks 1-3) */}
      <section className="space-y-5">
        <div className="flex items-center gap-2.5">
          <Crown className="h-5 w-5 text-[#FACC15]" />
          <h2 className="text-xl font-bold tracking-tight text-[#F3F4F6]">
            Hall of Fame · Top 3 Winners
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">
          {winners.map((entry) => {
            const style = PODIUM_STYLES[entry.rank] ?? PODIUM_STYLES[3];

            return (
              <article
                key={entry.submission_id}
                className={`overflow-hidden rounded-2xl border bg-[#161922] transition-transform hover:-translate-y-0.5 ${style.borderClass} ${style.orderClass}`}
              >
                <button
                  type="button"
                  onClick={() => onInspectSubmission(entry.submission_id)}
                  className="block w-full cursor-zoom-in bg-[#0E1015]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.thumbnail_url}
                    alt={entry.caption || entry.author.name}
                    className="max-h-96 w-full object-contain"
                  />
                </button>

                <div className="space-y-3 border-t border-white/[0.08] p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-bold uppercase ${style.badgeClass}`}
                    >
                      <Medal className="h-3.5 w-3.5" />
                      {style.label}
                    </span>
                    <span className="font-mono text-lg font-bold text-[#F3F4F6]">
                      {entry.total_points}{" "}
                      <span className="text-xs font-normal text-[#9CA3AF]">pts</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#F3F4F6]">
                      {entry.author.name}
                    </h3>
                    {entry.caption && (
                      <p className="mt-1 line-clamp-2 text-xs text-[#9CA3AF]">
                        {entry.caption}
                      </p>
                    )}
                  </div>

                  <TierBreakdownPills entry={entry} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Honorable Mentions (Ranks 4-6) */}
      {honorableMentions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Award className="h-5 w-5 text-[#9CA3AF]" />
            <h2 className="text-lg font-bold tracking-tight text-[#F3F4F6]">
              Honorable Mentions · Ranks 4–6
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {honorableMentions.map((entry) => (
              <article
                key={entry.submission_id}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161922]"
              >
                <button
                  type="button"
                  onClick={() => onInspectSubmission(entry.submission_id)}
                  className="block w-full cursor-zoom-in bg-[#0E1015]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.thumbnail_url}
                    alt={entry.caption || entry.author.name}
                    className="max-h-64 w-full object-contain"
                  />
                </button>

                <div className="flex flex-1 flex-col justify-between space-y-3 border-t border-white/[0.06] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 font-mono text-xs font-semibold text-[#F3F4F6]">
                      <Sparkles className="h-3 w-3 text-[#9CA3AF]" />#{entry.rank} Honorable
                    </span>
                    <span className="font-mono text-sm font-bold text-[#F3F4F6]">
                      {entry.total_points} pts
                    </span>
                  </div>

                  <div>
                    <div className="font-semibold text-[#F3F4F6]">
                      {entry.author.name}
                    </div>
                    {entry.caption && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-[#9CA3AF]">
                        {entry.caption}
                      </p>
                    )}
                  </div>

                  <TierBreakdownPills entry={entry} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Full Participant Standings Breakdown */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-[#F3F4F6]">
          Full Participant Standings ({allRows.length})
        </h3>
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161922]">
          <div className="divide-y divide-white/[0.06]">
            {allRows.map((entry) => (
              <div
                key={entry.submission_id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <span className="w-8 shrink-0 font-mono text-sm font-bold text-[#9CA3AF]">
                    #{entry.rank}
                  </span>
                  <button
                    type="button"
                    onClick={() => onInspectSubmission(entry.submission_id)}
                    className="shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#0E1015]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.thumbnail_url}
                      alt={entry.author.name}
                      className="h-12 w-12 object-cover"
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-[#F3F4F6]">
                        {entry.author.name}
                      </span>
                      {entry.was_anonymous && (
                        <span className="shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[#9CA3AF]">
                          Revealed
                        </span>
                      )}
                    </div>
                    {entry.caption && (
                      <p className="truncate text-xs text-[#9CA3AF]">
                        {entry.caption}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 sm:justify-end">
                  <TierBreakdownPills entry={entry} />
                  <div className="min-w-[72px] shrink-0 text-right font-mono text-sm font-bold text-[#F3F4F6]">
                    {entry.total_points} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
