"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      router.push("/verify-email");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal mendaftarkan akun baru."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-white/[0.08] bg-[#161922] p-7 shadow-2xl">
        <div className="space-y-1.5">
          <div className="font-mono text-xs uppercase tracking-widest text-[#9CA3AF]">
            Divisi Gambar · UKM Inari IPB
          </div>
          <h1 className="text-2xl font-extrabold text-[#F3F4F6]">
            Create Artist Account
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            Akses eksklusif untuk anggota aktif & alumni Divisi Gambar.
          </p>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-[#0E1015]/75 p-3 text-xs text-[#9CA3AF]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#F3F4F6]" />
          <span>
            Gunakan email resmi IPB (
            <code className="font-mono text-[#F3F4F6]">@apps.ipb.ac.id</code> /{" "}
            <code className="font-mono text-[#F3F4F6]">@ipb.ac.id</code>) atau
            email yang sudah di-whitelist oleh Kadiv GA.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
              Nama Artist / Panggilan
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Raka Pratama"
              className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6] placeholder-[#9CA3AF]/50 focus:border-white/30 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
              Email IPB / Whitelist
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
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
              Password (minimal 8 karakter)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6] placeholder-[#9CA3AF]/50 focus:border-white/30 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
              Konfirmasi Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
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
              <UserPlus className="h-4 w-4" />
            )}
            Daftar & Kirim Verifikasi
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#9CA3AF]">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold text-[#F3F4F6] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
