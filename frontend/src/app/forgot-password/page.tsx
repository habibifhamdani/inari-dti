"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.auth.forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal memproses permintaan reset password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-white/[0.08] bg-[#161922] p-7 shadow-2xl">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold text-[#F3F4F6]">
            Reset Password
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            Masukkan email terdaftar untuk menerima link reset password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {message && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
              Email Terdaftar
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@apps.ipb.ac.id"
              className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6] placeholder-[#9CA3AF]/50 focus:border-white/30 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F3F4F6] px-4 py-2.5 text-sm font-semibold text-[#0E1015] hover:bg-white disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Kirim Link Reset
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#9CA3AF]">
          <Link href="/login" className="font-semibold text-[#F3F4F6] hover:underline">
            Kembali ke Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
