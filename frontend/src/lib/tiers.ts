import type { TierPoints } from "@/types/dti";

export interface VoteTierConfig {
  points: TierPoints;
  name: string;
  shortName: string;
  accentHex: string;
  secondaryHex: string;
  badgeClass: string;
  slotRingClass: string;
  glowStyle: string;
}

export const VOTE_TIERS: VoteTierConfig[] = [
  {
    points: 5,
    name: "Netherite",
    shortName: "NTH",
    accentHex: "#A855F7",
    secondaryHex: "#4C3B4D",
    badgeClass:
      "bg-gradient-to-br from-[#4C3B4D] via-[#3A2940] to-[#1E1624] text-[#E9D5FF] border-[#A855F7]/60",
    slotRingClass: "border-[#A855F7]/70 ring-1 ring-[#A855F7]/40",
    glowStyle: "0 0 18px rgba(168, 85, 247, 0.28)",
  },
  {
    points: 4,
    name: "Diamond",
    shortName: "DIA",
    accentHex: "#22D3EE",
    secondaryHex: "#0E7490",
    badgeClass:
      "bg-gradient-to-br from-[#0E7490]/50 to-[#083344]/80 text-[#67E8F9] border-[#22D3EE]/60",
    slotRingClass: "border-[#22D3EE]/70 ring-1 ring-[#22D3EE]/35",
    glowStyle: "0 0 16px rgba(34, 211, 238, 0.22)",
  },
  {
    points: 3,
    name: "Gold",
    shortName: "GLD",
    accentHex: "#FACC15",
    secondaryHex: "#854D0E",
    badgeClass:
      "bg-gradient-to-br from-[#854D0E]/50 to-[#422006]/80 text-[#FEF08A] border-[#FACC15]/60",
    slotRingClass: "border-[#FACC15]/70 ring-1 ring-[#FACC15]/35",
    glowStyle: "0 0 16px rgba(250, 204, 21, 0.2)",
  },
  {
    points: 2,
    name: "Iron",
    shortName: "IRN",
    accentHex: "#E5E7EB",
    secondaryHex: "#4B5563",
    badgeClass:
      "bg-gradient-to-br from-[#4B5563]/45 to-[#1F2937]/85 text-[#F3F4F6] border-[#E5E7EB]/50",
    slotRingClass: "border-[#E5E7EB]/60 ring-1 ring-[#E5E7EB]/25",
    glowStyle: "0 0 14px rgba(229, 231, 235, 0.16)",
  },
  {
    points: 1,
    name: "Copper",
    shortName: "CPR",
    accentHex: "#EA580C",
    secondaryHex: "#D97706",
    badgeClass:
      "bg-gradient-to-br from-[#EA580C]/45 via-[#9A3412]/55 to-[#431407]/85 text-[#FED7AA] border-[#D97706]/65",
    slotRingClass: "border-[#EA580C]/70 ring-1 ring-[#D97706]/35",
    glowStyle: "0 0 14px rgba(234, 88, 12, 0.22)",
  },
];

export function getTierConfig(points: TierPoints): VoteTierConfig {
  return VOTE_TIERS.find((tier) => tier.points === points) ?? VOTE_TIERS[4];
}
