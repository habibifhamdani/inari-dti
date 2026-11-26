"use client";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-20 w-20 text-xl",
};

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.toLowerCase() === "anonymous") return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ src, name, size = "sm" }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full border border-white/15 bg-[#0E1015] object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-white/12 bg-[#1C202B] font-mono font-bold text-[#F3F4F6]`}
    >
      {getInitials(name)}
    </div>
  );
}
