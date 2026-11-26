"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  Save,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { AvatarCropperModal } from "@/components/AvatarCropperModal";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();

  const [nameInput, setNameInput] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<{ src: string; name: string } | null>(
    null
  );
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="rounded-2xl border border-white/[0.08] bg-[#161922] p-8">
          <UserIcon className="mx-auto h-10 w-10 text-[#9CA3AF]" />
          <h1 className="mt-4 text-xl font-bold text-[#F3F4F6]">
            Sign In Required
          </h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            Masuk terlebih dahulu untuk mengelola profil dan foto akunmu.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-xl bg-[#F3F4F6] px-4 py-2 text-sm font-semibold text-[#0E1015]"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const effectiveName = nameInput ?? user.name;
  const displayedAvatar = removeAvatar
    ? null
    : avatarPreview ?? user.avatar_url;

  const handleAvatarSelect = (file: File | null) => {
    setError(null);
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Format foto profil harus PNG, JPG, atau WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran foto profil maksimal 5MB.");
      return;
    }
    setCropSource({
      src: URL.createObjectURL(file),
      name: file.name,
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    setToast(null);

    try {
      const formData = new FormData();
      formData.append("name", effectiveName.trim());
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }
      if (removeAvatar) {
        formData.append("remove_avatar", "1");
      }

      const res = await api.profile.update(formData);
      await refreshUser();
      setAvatarFile(null);
      setAvatarPreview(null);
      setRemoveAvatar(false);
      setNameInput(null);
      setToast(res.message);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal memperbarui profil."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setError(null);
    setToast(null);

    try {
      const res = await api.profile.updatePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setToast(res.message);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal memperbarui password."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <div className="font-mono text-xs uppercase tracking-widest text-[#9CA3AF]">
          Artist Account Settings
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#F3F4F6]">
          Profil & Keamanan Akun
        </h1>
      </div>

      {user.blacklist && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-400/35 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              Akun Kamu Sedang Dibatasi ({user.blacklist.level})
            </p>
            {user.blacklist.reason && (
              <p className="mt-0.5 text-xs text-rose-200/80">
                Alasan: {user.blacklist.reason}
              </p>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Profile Identity & Avatar Form */}
      <form
        onSubmit={handleSaveProfile}
        className="space-y-6 rounded-2xl border border-white/[0.08] bg-[#161922] p-6"
      >
        <h2 className="text-lg font-bold text-[#F3F4F6]">Identitas Artist</h2>

        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar src={displayedAvatar} name={effectiveName} size="lg" />

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-[#0E1015] px-3.5 py-2 text-xs font-semibold text-[#F3F4F6] hover:border-white/30">
                <Camera className="h-3.5 w-3.5" />
                Pilih Foto Profil
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    handleAvatarSelect(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>

              {(displayedAvatar || user.avatar_url) && !removeAvatar && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(null);
                    setRemoveAvatar(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Foto
                </button>
              )}
            </div>
            <p className="font-mono text-[11px] text-[#9CA3AF]">
              PNG, JPG, atau WEBP · Maks 5 MB · Bisa atur posisi &amp; zoom sebelum disimpan
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
              Nama Tampilan
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={effectiveName}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6] focus:border-white/30 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
              Email & Role
            </label>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0E1015]/60 px-3.5 py-2.5 text-sm text-[#9CA3AF]">
              <span className="truncate font-mono text-xs">{user.email}</span>
              <span className="ml-2 shrink-0 rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase text-[#F3F4F6]">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-5 py-2.5 text-sm font-semibold text-[#0E1015] hover:bg-white disabled:opacity-50"
          >
            {savingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Profil
          </button>
        </div>
      </form>

      {/* Change Password Form */}
      <form
        onSubmit={handleUpdatePassword}
        className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#161922] p-6"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#9CA3AF]" />
          <h2 className="text-lg font-bold text-[#F3F4F6]">Ubah Password</h2>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
            Password Saat Ini
          </label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6] focus:border-white/30 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
              Password Baru (min. 8 karakter)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6] focus:border-white/30 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={savingPassword}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#0E1015] px-5 py-2.5 text-sm font-semibold text-[#F3F4F6] hover:border-white/30 disabled:opacity-50"
          >
            {savingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Update Password
          </button>
        </div>
      </form>

      {cropSource && (
        <AvatarCropperModal
          imageSrc={cropSource.src}
          fileName={cropSource.name}
          onCancel={() => {
            URL.revokeObjectURL(cropSource.src);
            setCropSource(null);
          }}
          onConfirm={(croppedFile, previewUrl) => {
            URL.revokeObjectURL(cropSource.src);
            setCropSource(null);
            setAvatarFile(croppedFile);
            setAvatarPreview(previewUrl);
            setRemoveAvatar(false);
          }}
        />
      )}
    </div>
  );
}
