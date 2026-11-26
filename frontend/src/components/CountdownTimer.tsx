"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetIso: string | null;
  label: string;
  onExpired?: () => void;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00d 00h 00m 00s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

export function CountdownTimer({ targetIso, label, onExpired }: CountdownTimerProps) {
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    if (!targetIso) return 0;
    return Math.max(0, new Date(targetIso).getTime() - Date.now());
  });

  useEffect(() => {
    if (!targetIso) return;

    let firedExpired = false;
    const tick = () => {
      const diff = Math.max(0, new Date(targetIso).getTime() - Date.now());
      setRemainingMs(diff);
      if (diff === 0 && !firedExpired) {
        firedExpired = true;
        onExpired?.();
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [targetIso, onExpired]);

  if (!targetIso) return null;

  return (
    <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#0E1015]/80 px-3.5 py-2">
      <Clock className="h-4 w-4 text-[#9CA3AF]" />
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
          {label}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums text-[#F3F4F6]">
          {formatRemaining(remainingMs)}
        </span>
      </div>
    </div>
  );
}
