"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(email, password);
      if (!user.is_verified) {
        router.push("/verify-email");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal masuk ke akun.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-white/[0.08] bg-[#161922] p-7 shadow-2xl">
        <div className="space-y-1.5">
          <div className="font-mono text-xs uppercase tracking-widest text-[#9CA3AF]">
            INARI DTI · Dark Atelier
          </div>
          <h1 className="text-2xl font-extrabold text-[#F3F4F6]">Sign In</h1>
          <p className="text-sm text-[#9CA3AF]">
            Masuk menggunakan akun anggota Divisi Gambar UKM Inari.
          </p>
        </div>

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
              placeholder="nama@apps.ipb.ac.id"
              className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6] placeholder-[#9CA3AF]/50 focus:border-white/30 focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-[#9CA3AF]">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#9CA3AF] hover:text-[#F3F4F6] hover:underline"
              >
                Lupa password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6] placeholder-[#9CA3AF]/50 focus:border-white/30 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F3F4F6] px-4 py-2.5 text-sm font-semibold text-[#0E1015] transition-colors hover:bg-white disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#9CA3AF]">
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-[#F3F4F6] hover:underline">
            Daftar Anggota GA
          </Link>
        </p>
      </div>
    </div>
  );
}
