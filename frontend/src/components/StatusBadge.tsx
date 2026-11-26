import type { EditionStatus } from "@/types/dti";

const STATUS_META: Record<
  EditionStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  draft: {
    label: "Draft",
    dotClass: "bg-zinc-500",
    badgeClass: "border-white/10 bg-white/5 text-[#9CA3AF]",
  },
  submission_open: {
    label: "Submissions Open",
    dotClass: "bg-emerald-400",
    badgeClass: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
  },
  extension_poll: {
    label: "Extension Poll",
    dotClass: "bg-amber-400",
    badgeClass: "border-amber-400/25 bg-amber-500/10 text-amber-200",
  },
  voting_open: {
    label: "Voting Open",
    dotClass: "bg-sky-400",
    badgeClass: "border-sky-400/25 bg-sky-500/10 text-sky-200",
  },
  completed: {
    label: "Completed",
    dotClass: "bg-[#F3F4F6]",
    badgeClass: "border-white/15 bg-white/10 text-[#F3F4F6]",
  },
};

export function StatusBadge({ status }: { status: EditionStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider ${meta.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
}
