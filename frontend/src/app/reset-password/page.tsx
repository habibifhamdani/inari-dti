"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const initialEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await api.auth.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setMessage(res.message);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal mereset password."
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
            Set New Password
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            Buat password baru untuk akun INARI DTI kamu.
          </p>
        </div>

        {message ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#F3F4F6] px-4 py-2.5 text-sm font-semibold text-[#0E1015] hover:bg-white"
            >
              Sign In Sekarang
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6] focus:border-white/30 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
                Password Baru (minimal 8 karakter)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6] focus:border-white/30 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6] focus:border-white/30 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !token}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F3F4F6] px-4 py-2.5 text-sm font-semibold text-[#0E1015] hover:bg-white disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Simpan Password Baru
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
