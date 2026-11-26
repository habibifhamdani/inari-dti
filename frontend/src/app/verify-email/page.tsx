"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MailCheck, Send, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();

  const id = searchParams.get("id");
  const hash = searchParams.get("hash");
  const expires = searchParams.get("expires");
  const signature = searchParams.get("signature");

  const hasVerificationParams = Boolean(id && hash && expires && signature);

  const [verifying, setVerifying] = useState(hasVerificationParams);
  const [verifiedMessage, setVerifiedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !hash || !expires || !signature) return;

    let active = true;
    (async () => {
      try {
        const res = await api.auth.verifyEmail({ id, hash, expires, signature });
        if (active) {
          setVerifiedMessage(res.message);
          await refreshUser();
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Link verifikasi tidak valid atau sudah kedaluwarsa."
          );
        }
      } finally {
        if (active) setVerifying(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id, hash, expires, signature, refreshUser]);

  const handleResend = async () => {
    setResending(true);
    setResendMessage(null);
    setError(null);
    try {
      const res = await api.auth.resendVerification();
      setResendMessage(res.message);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal mengirim ulang email verifikasi."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-4 py-12">
      <div className="w-full space-y-5 rounded-3xl border border-white/[0.08] bg-[#161922] p-7 text-center shadow-2xl">
        {verifying ? (
          <div className="space-y-3 py-6">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#F3F4F6]" />
            <h1 className="text-xl font-bold text-[#F3F4F6]">
              Memverifikasi Email...
            </h1>
            <p className="text-sm text-[#9CA3AF]">
              Mohon tunggu sebentar, sedang memvalidasi signature token.
            </p>
          </div>
        ) : verifiedMessage || user?.is_verified ? (
          <div className="space-y-4 py-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h1 className="text-xl font-bold text-[#F3F4F6]">
              Email Terverifikasi
            </h1>
            <p className="text-sm text-[#9CA3AF]">
              {verifiedMessage ||
                "Akun kamu sudah aktif. Kamu bisa langsung submit karya atau ikut voting."}
            </p>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#F3F4F6] px-4 py-2.5 text-sm font-semibold text-[#0E1015] hover:bg-white"
            >
              Masuk ke Active Edition
            </Link>
          </div>
        ) : error ? (
          <div className="space-y-4 py-3">
            <XCircle className="mx-auto h-10 w-10 text-rose-400" />
            <h1 className="text-xl font-bold text-[#F3F4F6]">
              Verifikasi Gagal
            </h1>
            <p className="text-sm text-rose-200">{error}</p>
            {user && (
              <button
                type="button"
                disabled={resending}
                onClick={() => void handleResend()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F3F4F6] px-4 py-2.5 text-sm font-semibold text-[#0E1015] hover:bg-white disabled:opacity-50"
              >
                {resending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Kirim Ulang Link Verifikasi
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-3">
            <MailCheck className="mx-auto h-10 w-10 text-[#F3F4F6]" />
            <h1 className="text-xl font-bold text-[#F3F4F6]">
              Cek Inbox Email Kamu
            </h1>
            <p className="text-sm text-[#9CA3AF]">
              {user ? (
                <>
                  Kami telah mengirim link verifikasi ke{" "}
                  <strong className="text-[#F3F4F6]">{user.email}</strong>.
                  Klik link tersebut sebelum mengirim karya atau voting.
                </>
              ) : (
                "Buka link verifikasi yang dikirim ke email IPB/whitelist kamu."
              )}
            </p>

            {resendMessage && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
                {resendMessage}
              </div>
            )}

            {user && (
              <button
                type="button"
                disabled={resending}
                onClick={() => void handleResend()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#0E1015] px-4 py-2.5 text-sm font-semibold text-[#F3F4F6] hover:border-white/30 disabled:opacity-50"
              >
                {resending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Kirim Ulang Email Verifikasi
              </button>
            )}

            <Link
              href="/"
              className="block text-xs text-[#9CA3AF] hover:text-[#F3F4F6] hover:underline"
            >
              Kembali ke Beranda
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
