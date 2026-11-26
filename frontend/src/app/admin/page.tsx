"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MailPlus,
  Pencil,
  Plus,
  Search,
  Shield,
  Sliders,
  Trash2,
  X,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, isAdminRole } from "@/lib/api";
import type {
  BlacklistedUserEntry,
  BlacklistLevel,
  DtiEdition,
  EditionStatus,
  Submission,
  User,
  WhitelistedEmailEntry,
} from "@/types/dti";

type AdminTab =
  | "editions"
  | "moderation"
  | "whitelist"
  | "users"
  | "blacklist";

type OverrideAction =
  | "open_submissions"
  | "extend_submission_deadline"
  | "close_poll_early"
  | "open_voting"
  | "close_voting_early";

type PendingConfirmation =
  | { kind: "delete_edition"; edition: DtiEdition }
  | { kind: "state_override"; edition: DtiEdition; action: OverrideAction };

const OVERRIDE_CONFIRM_META: Record<
  OverrideAction,
  { title: string; description: string; buttonLabel: string }
> = {
  open_submissions: {
    title: "Buka Kembali Submission?",
    description:
      "Status edisi akan diubah menjadi submission_open dan polling perpanjangan (jika ada) akan dihapus.",
    buttonLabel: "Ya, Buka Submission",
  },
  extend_submission_deadline: {
    title: "Perpanjang Submission +3 Hari?",
    description:
      "Tenggat submission akan ditambah 3 hari (voting deadline ikut digeser jika perlu) dan status kembali ke submission_open.",
    buttonLabel: "Ya, Perpanjang +3 Hari",
  },
  close_poll_early: {
    title: "Tutup Extension Poll Lebih Awal?",
    description:
      "Hasil suara sementara akan langsung dievaluasi: lanjut perpanjangan +3 hari jika suara setuju unggul, atau langsung buka voting.",
    buttonLabel: "Ya, Tutup Poll",
  },
  open_voting: {
    title: "Paksa Buka Voting Sekarang?",
    description:
      "Status edisi akan langsung dipindahkan ke voting_open dan karya yang masuk bisa langsung dinilai member.",
    buttonLabel: "Ya, Buka Voting",
  },
  close_voting_early: {
    title: "Tutup Voting & Selesaikan Edisi?",
    description:
      "Status edisi akan diubah menjadi completed, pemenang Hall of Fame dikalkulasi, dan seluruh identitas author anonim akan dibuka.",
    buttonLabel: "Ya, Selesaikan Edisi",
  },
};

function toLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("editions");

  const [editions, setEditions] = useState<DtiEdition[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistedEmailEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [blacklistEntries, setBlacklistEntries] = useState<BlacklistedUserEntry[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<number | null>(null);
  const [moderationSubs, setModerationSubs] = useState<Submission[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edition Form State
  const editionFormRef = useRef<HTMLFormElement | null>(null);
  const [editingEdition, setEditingEdition] = useState<DtiEdition | null>(null);
  const [showEditionForm, setShowEditionForm] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<EditionStatus>("submission_open");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [votingDeadline, setVotingDeadline] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [savingEdition, setSavingEdition] = useState(false);

  // Whitelist Form State
  const [newWhitelistEmail, setNewWhitelistEmail] = useState("");
  const [addingWhitelist, setAddingWhitelist] = useState(false);

  // Users & Blacklist Form State
  const [userSearch, setUserSearch] = useState("");
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<number | null>(null);
  const [blacklistTargetId, setBlacklistTargetId] = useState<string>("");
  const [blacklistLevel, setBlacklistLevel] = useState<BlacklistLevel>("upload_blocked");
  const [blacklistReason, setBlacklistReason] = useState("");
  const [addingBlacklist, setAddingBlacklist] = useState(false);

  // Confirmation Modal State
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);

  const loadAdminData = useCallback(async () => {
    try {
      const [edRes, wlRes, usersRes, blRes] = await Promise.all([
        api.admin.listEditions(),
        api.admin.listWhitelist(),
        api.admin.listUsers(),
        api.admin.listBlacklist(),
      ]);
      setError(null);
      setEditions(edRes.editions);
      setWhitelist(wlRes.whitelisted_emails);
      setUsers(usersRes.users);
      setBlacklistEntries(blRes.blacklisted_users);
      if (edRes.editions.length > 0 && selectedEditionId === null) {
        setSelectedEditionId(edRes.editions[0].id);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal memuat data Admin."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedEditionId]);

  useEffect(() => {
    if (!isAdminRole(user)) return;
    let active = true;
    (async () => {
      try {
        const [edRes, wlRes, usersRes, blRes] = await Promise.all([
          api.admin.listEditions(),
          api.admin.listWhitelist(),
          api.admin.listUsers(),
          api.admin.listBlacklist(),
        ]);
        if (!active) return;
        setError(null);
        setEditions(edRes.editions);
        setWhitelist(wlRes.whitelisted_emails);
        setUsers(usersRes.users);
        setBlacklistEntries(blRes.blacklisted_users);
        setSelectedEditionId((prev) =>
          prev === null && edRes.editions.length > 0 ? edRes.editions[0].id : prev
        );
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "Gagal memuat data Admin."
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const loadSubmissionsForModeration = useCallback(async (editionId: number) => {
    try {
      const res = await api.admin.listSubmissions(editionId);
      setModerationSubs(res.submissions);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal memuat daftar submission."
      );
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "moderation" || selectedEditionId === null) return;
    let active = true;
    (async () => {
      try {
        const res = await api.admin.listSubmissions(selectedEditionId);
        if (active) setModerationSubs(res.submissions);
      } catch (err) {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Gagal memuat daftar submission."
          );
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [activeTab, selectedEditionId]);

  useEffect(() => {
    if (!showEditionForm) return;
    const frame = window.requestAnimationFrame(() => {
      editionFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showEditionForm, editingEdition?.id]);

  const openCreateForm = () => {
    setEditingEdition(null);
    setTitle("");
    setSlug("");
    setPrompt("");
    setStatus("submission_open");
    const subDefault = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    const voteDefault = new Date(Date.now() + 14 * 86400 * 1000).toISOString();
    setSubmissionDeadline(toLocalDatetimeInput(subDefault));
    setVotingDeadline(toLocalDatetimeInput(voteDefault));
    setReferenceFile(null);
    setShowEditionForm(true);
  };

  const openEditForm = (edition: DtiEdition) => {
    if (showEditionForm && editingEdition?.id === edition.id) {
      setShowEditionForm(false);
      setEditingEdition(null);
      return;
    }
    setEditingEdition(edition);
    setTitle(edition.title);
    setSlug(edition.slug);
    setPrompt(edition.prompt);
    setStatus(edition.status);
    setSubmissionDeadline(toLocalDatetimeInput(edition.submission_deadline));
    setVotingDeadline(toLocalDatetimeInput(edition.voting_deadline));
    setReferenceFile(null);
    setShowEditionForm(true);
  };

  const handleSaveEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdition(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title);
      if (slug.trim()) formData.append("slug", slug.trim());
      formData.append("prompt", prompt);
      formData.append("status", status);
      formData.append(
        "submission_deadline",
        new Date(submissionDeadline).toISOString()
      );
      formData.append("voting_deadline", new Date(votingDeadline).toISOString());
      if (referenceFile) {
        formData.append("reference_image", referenceFile);
      }

      const res = editingEdition
        ? await api.admin.updateEdition(editingEdition.id, formData)
        : await api.admin.createEdition(formData);

      setToast(res.message);
      setShowEditionForm(false);
      await loadAdminData();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menyimpan edisi."
      );
    } finally {
      setSavingEdition(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirm) return;
    setConfirmingAction(true);
    setError(null);
    try {
      if (pendingConfirm.kind === "delete_edition") {
        const res = await api.admin.deleteEdition(pendingConfirm.edition.id);
        setToast(res.message);
        if (editingEdition?.id === pendingConfirm.edition.id) {
          setShowEditionForm(false);
          setEditingEdition(null);
        }
      } else {
        const res = await api.admin.overrideState(pendingConfirm.edition.id, {
          action: pendingConfirm.action,
        });
        setToast(res.message);
      }
      setPendingConfirm(null);
      await loadAdminData();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : pendingConfirm.kind === "delete_edition"
          ? "Gagal menghapus edisi."
          : "Gagal mengubah status edisi."
      );
      setPendingConfirm(null);
    } finally {
      setConfirmingAction(false);
    }
  };

  const handleToggleVisibility = async (submission: Submission) => {
    setError(null);
    try {
      const res = await api.admin.toggleSubmissionVisibility(
        submission.id,
        !submission.is_hidden
      );
      setToast(res.message);
      if (selectedEditionId !== null) {
        await loadSubmissionsForModeration(selectedEditionId);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal mengubah visibilitas."
      );
    }
  };

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhitelistEmail.trim()) return;
    setAddingWhitelist(true);
    setError(null);
    try {
      const res = await api.admin.addWhitelist(newWhitelistEmail.trim());
      setToast(res.message);
      setNewWhitelistEmail("");
      await loadAdminData();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal menambahkan email ke whitelist."
      );
    } finally {
      setAddingWhitelist(false);
    }
  };

  const handleRemoveWhitelist = async (entry: WhitelistedEmailEntry) => {
    setError(null);
    try {
      const res = await api.admin.removeWhitelist(entry.id);
      setToast(res.message);
      await loadAdminData();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menghapus email."
      );
    }
  };

  const handleUpdateUserRole = async (
    targetUser: User,
    nextRole: "admin" | "member"
  ) => {
    setUpdatingRoleUserId(targetUser.id);
    setError(null);
    try {
      const res = await api.admin.updateUserRole(targetUser.id, nextRole);
      setToast(res.message);
      await loadAdminData();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal mengubah role user."
      );
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blacklistTargetId) return;
    setAddingBlacklist(true);
    setError(null);
    try {
      const res = await api.admin.addBlacklist({
        user_id: Number(blacklistTargetId),
        level: blacklistLevel,
        reason: blacklistReason.trim() || undefined,
      });
      setToast(res.message);
      setBlacklistTargetId("");
      setBlacklistReason("");
      await loadAdminData();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal menambahkan akun ke blacklist."
      );
    } finally {
      setAddingBlacklist(false);
    }
  };

  const handleRemoveBlacklist = async (entry: BlacklistedUserEntry) => {
    setError(null);
    try {
      const res = await api.admin.removeBlacklist(entry.id);
      setToast(res.message);
      await loadAdminData();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal mencabut status blacklist."
      );
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  const blacklistableUsers = users.filter(
    (u) => !u.is_superadmin && u.id !== user?.id
  );

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  if (!user || !isAdminRole(user)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-white/[0.08] bg-[#161922] p-8">
          <Shield className="mx-auto h-10 w-10 text-[#9CA3AF]" />
          <h1 className="mt-4 text-xl font-bold text-[#F3F4F6]">
            Admin Access Required
          </h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            Halaman ini khusus untuk Admin dan Panitia Divisi Gambar UKM Inari.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-xl bg-[#F3F4F6] px-4 py-2 text-sm font-semibold text-[#0E1015]"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const editionFormNode = (
    <form
      ref={editionFormRef}
      onSubmit={handleSaveEdition}
      className="max-h-[75vh] scroll-mt-20 space-y-4 overflow-y-auto rounded-2xl border border-white/20 bg-[#161922] p-5 shadow-2xl sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="truncate text-lg font-bold text-[#F3F4F6]">
          {editingEdition ? `Edit: ${editingEdition.title}` : "Buat Edisi DTI Baru"}
        </h2>
        <button
          type="button"
          onClick={() => {
            setShowEditionForm(false);
            setEditingEdition(null);
          }}
          className="shrink-0 text-xs text-[#9CA3AF] hover:text-[#F3F4F6]"
        >
          Tutup
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-[#9CA3AF]">
            Judul Edisi
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="DTI Vol. 13 — Neon Shrine"
            className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2 text-sm text-[#F3F4F6]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-[#9CA3AF]">
            Slug URL (Opsional, auto-generate jika kosong)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="dti-vol-13-neon-shrine"
            className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2 font-mono text-sm text-[#F3F4F6]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-[#9CA3AF]">
          Prompt / Brief Ilustrasi
        </label>
        <textarea
          required
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2 text-sm text-[#F3F4F6]"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-[#9CA3AF]">
            Status Awal
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as EditionStatus)}
            className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2 text-sm text-[#F3F4F6]"
          >
            <option value="draft">draft</option>
            <option value="submission_open">submission_open</option>
            <option value="extension_poll">extension_poll</option>
            <option value="voting_open">voting_open</option>
            <option value="completed">completed</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-[#9CA3AF]">
            Submission Deadline
          </label>
          <input
            type="datetime-local"
            required
            value={submissionDeadline}
            onChange={(e) => setSubmissionDeadline(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2 font-mono text-sm text-[#F3F4F6]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-[#9CA3AF]">
            Voting Deadline
          </label>
          <input
            type="datetime-local"
            required
            value={votingDeadline}
            onChange={(e) => setVotingDeadline(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2 font-mono text-sm text-[#F3F4F6]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-[#9CA3AF]">
          Reference Image (Opsional, PNG/JPG/WEBP maks 10MB)
        </label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
          className="block w-full text-xs text-[#9CA3AF] file:mr-3 file:rounded-lg file:border file:border-white/15 file:bg-[#0E1015] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#F3F4F6]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setShowEditionForm(false);
            setEditingEdition(null);
          }}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[#9CA3AF]"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={savingEdition}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-5 py-2 text-sm font-semibold text-[#0E1015] hover:bg-white disabled:opacity-50"
        >
          {savingEdition && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingEdition ? "Update Edisi" : "Buat Edisi"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#9CA3AF]">
            <Shield className="h-3.5 w-3.5" />
            Admin &amp; Panitia GA Control Room
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-[#F3F4F6] sm:text-3xl">
            INARI DTI Admin Panel
          </h1>
        </div>

        {activeTab === "editions" && (
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-4 py-2.5 text-sm font-semibold text-[#0E1015] hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            New DTI Edition
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/[0.08] pb-3">
        {(
          [
            { id: "editions", label: "Editions & State Overrides" },
            { id: "moderation", label: "Submission Moderation" },
            { id: "users", label: `Registered Users (${users.length})` },
            { id: "blacklist", label: `Blacklist (${blacklistEntries.length})` },
            { id: "whitelist", label: `Whitelisted Emails (${whitelist.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-[#F3F4F6] text-[#0E1015]"
                : "border border-white/[0.08] bg-[#161922] text-[#9CA3AF] hover:text-[#F3F4F6]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-[#9CA3AF]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat panel admin...
        </div>
      ) : activeTab === "editions" ? (
        <div className="space-y-6">
          {/* Create Form at Top */}
          {showEditionForm && editingEdition === null && editionFormNode}

          {/* Editions List */}
          <div className="space-y-4">
            {editions.map((ed) => {
              const isEditingThis =
                showEditionForm && editingEdition?.id === ed.id;

              return (
                <div key={ed.id} className="space-y-3">
                  <div className="rounded-2xl border border-white/[0.08] bg-[#161922] p-5">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <StatusBadge status={ed.status} />
                          <Link
                            href={`/editions/${ed.slug}`}
                            className="font-mono text-xs text-[#9CA3AF] hover:text-[#F3F4F6] hover:underline"
                          >
                            /{ed.slug}
                          </Link>
                          <span className="font-mono text-xs text-[#9CA3AF]">
                            · {ed.visible_submissions_count} karya
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-[#F3F4F6]">
                          {ed.title}
                        </h3>
                        <div className="flex flex-wrap gap-4 font-mono text-xs text-[#9CA3AF]">
                          <span>
                            Sub DL:{" "}
                            {new Date(ed.submission_deadline).toLocaleString(
                              "id-ID"
                            )}
                          </span>
                          <span>
                            Vote DL:{" "}
                            {new Date(ed.voting_deadline).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(ed)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            isEditingThis
                              ? "border-white/30 bg-white/15 text-[#F3F4F6]"
                              : "border-white/10 bg-[#0E1015] text-[#F3F4F6] hover:border-white/25"
                          }`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {isEditingThis ? "Tutup Edit" : "Edit"}
                        </button>
                        {user.is_superadmin && (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingConfirm({
                                kind: "delete_edition",
                                edition: ed,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Manual State Override Controls */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase text-[#9CA3AF]">
                        <Sliders className="h-3 w-3" />
                        Overrides:
                      </span>
                      {(
                        [
                          {
                            action: "extend_submission_deadline",
                            label: "+3d Submission",
                          },
                          {
                            action: "close_poll_early",
                            label: "Close Poll Early",
                          },
                          {
                            action: "open_voting",
                            label: "Force Open Voting",
                          },
                          {
                            action: "close_voting_early",
                            label: "Close Voting Early",
                          },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.action}
                          type="button"
                          onClick={() =>
                            setPendingConfirm({
                              kind: "state_override",
                              edition: ed,
                              action: item.action,
                            })
                          }
                          className="rounded-lg border border-white/10 bg-[#0E1015] px-2.5 py-1 text-xs text-[#F3F4F6] hover:border-white/30"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inline Edit Form directly below the selected edition */}
                  {isEditingThis && editionFormNode}
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === "moderation" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-[#9CA3AF]">
              Pilih Edisi:
            </label>
            <select
              value={selectedEditionId ?? ""}
              onChange={(e) => setSelectedEditionId(Number(e.target.value))}
              className="rounded-xl border border-white/10 bg-[#161922] px-3.5 py-2 text-sm text-[#F3F4F6]"
            >
              {editions.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.title} ({ed.status})
                </option>
              ))}
            </select>
          </div>

          {moderationSubs.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#161922] p-8 text-center text-sm text-[#9CA3AF]">
              Belum ada submission pada edisi ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {moderationSubs.map((sub) => (
                <div
                  key={sub.id}
                  className={`overflow-hidden rounded-2xl border bg-[#161922] ${
                    sub.is_hidden
                      ? "border-rose-400/35 opacity-75"
                      : "border-white/[0.08]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sub.thumbnail_url}
                    alt={sub.author.name}
                    className="h-56 w-full bg-[#0E1015] object-contain"
                  />
                  <div className="space-y-3 border-t border-white/[0.06] p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#F3F4F6]">
                          {sub.author.name}
                        </span>
                        {sub.is_anonymous && (
                          <span className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-[#9CA3AF]">
                            Anon Mode
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-[#9CA3AF]">
                        {sub.author.email}
                      </p>
                      {sub.caption && (
                        <p className="mt-1 line-clamp-2 text-xs text-[#9CA3AF]">
                          {sub.caption}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleToggleVisibility(sub)}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                        sub.is_hidden
                          ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                          : "border-rose-400/35 bg-rose-500/10 text-rose-200"
                      }`}
                    >
                      {sub.is_hidden ? (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Tampilkan Kembali
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Sembunyikan (Moderasi)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "users" ? (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#161922] p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Cari nama atau email registered user..."
                className="w-full rounded-xl border border-white/10 bg-[#0E1015] py-2 pl-10 pr-4 text-sm text-[#F3F4F6] placeholder-[#9CA3AF]/60 focus:border-white/30 focus:outline-none"
              />
            </div>
            <span className="font-mono text-xs text-[#9CA3AF]">
              Menampilkan {filteredUsers.length} dari {users.length} akun
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161922]">
            {filteredUsers.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#9CA3AF]">
                Tidak ada user yang cocok.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {filteredUsers.map((u) => {
                  const isLockedSuperadmin = u.is_superadmin;
                  const isSelf = u.id === user.id;
                  const canEditRole = !isLockedSuperadmin && !isSelf;

                  return (
                    <div
                      key={u.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3.5">
                        <Avatar src={u.avatar_url} name={u.name} size="md" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-[#9CA3AF]">
                              #{u.id}
                            </span>
                            <span className="truncate font-semibold text-[#F3F4F6]">
                              {u.name}
                            </span>
                            {u.is_verified ? (
                              <span className="rounded border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-200">
                                Verified
                              </span>
                            ) : (
                              <span className="rounded border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-200">
                                Unverified
                              </span>
                            )}
                            {u.blacklist && (
                              <span className="rounded border border-rose-400/35 bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] text-rose-200">
                                Blacklisted ({u.blacklist.level})
                              </span>
                            )}
                          </div>
                          <p className="truncate font-mono text-xs text-[#9CA3AF]">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {isLockedSuperadmin ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-purple-400/40 bg-purple-500/15 px-3 py-1.5 font-mono text-xs font-semibold text-purple-200">
                            <Lock className="h-3.5 w-3.5" />
                            Superadmin (Locked)
                          </span>
                        ) : (
                          <select
                            disabled={!canEditRole || updatingRoleUserId === u.id}
                            value={u.role === "admin" ? "admin" : "member"}
                            onChange={(e) =>
                              void handleUpdateUserRole(
                                u,
                                e.target.value as "admin" | "member"
                              )
                            }
                            className="rounded-xl border border-white/15 bg-[#0E1015] px-3 py-1.5 font-mono text-xs font-semibold text-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="member">member</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "blacklist" ? (
        <div className="space-y-5">
          <form
            onSubmit={handleAddBlacklist}
            className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#161922] p-5"
          >
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-rose-300" />
              <h2 className="text-base font-bold text-[#F3F4F6]">
                Batasi Akses Akun (Blacklist)
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">
                  Pilih Akun
                </label>
                <select
                  required
                  value={blacklistTargetId}
                  onChange={(e) => setBlacklistTargetId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6]"
                >
                  <option value="">-- Pilih User --</option>
                  {blacklistableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      #{u.id} · {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">
                  Level Pembatasan
                </label>
                <select
                  value={blacklistLevel}
                  onChange={(e) =>
                    setBlacklistLevel(e.target.value as BlacklistLevel)
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6]"
                >
                  <option value="upload_blocked">
                    Upload Blocked (Tidak bisa upload karya)
                  </option>
                  <option value="interaction_blocked">
                    Upload &amp; Vote Blocked (Tidak bisa upload &amp; vote)
                  </option>
                  <option value="full_ban">
                    Full Platform Ban (Tidak bisa akses sama sekali)
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">
                  Alasan (Opsional)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  placeholder="Contoh: Menggunakan karya AI / plagiarisme"
                  className="w-full rounded-xl border border-white/10 bg-[#0E1015] px-3.5 py-2.5 text-sm text-[#F3F4F6]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addingBlacklist || !blacklistTargetId}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/15 px-5 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/25 disabled:opacity-50"
              >
                {addingBlacklist ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Terapkan Blacklist
              </button>
            </div>
          </form>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161922]">
            {blacklistEntries.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#9CA3AF]">
                Belum ada akun yang di-blacklist.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {blacklistEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-3.5">
                      <Avatar
                        src={entry.user.avatar_url}
                        name={entry.user.name}
                        size="md"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#F3F4F6]">
                            {entry.user.name}
                          </span>
                          <span className="rounded border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-rose-200">
                            {entry.level}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-[#9CA3AF]">
                          {entry.user.email}
                        </p>
                        {entry.reason && (
                          <p className="mt-1 text-xs text-[#F3F4F6]/80">
                            Alasan: {entry.reason}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                          Oleh {entry.blacklisted_by ?? "Admin"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleRemoveBlacklist(entry)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                    >
                      Cabut Blacklist
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <form
            onSubmit={handleAddWhitelist}
            className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#161922] p-5 sm:flex-row"
          >
            <input
              type="email"
              required
              value={newWhitelistEmail}
              onChange={(e) => setNewWhitelistEmail(e.target.value)}
              placeholder="alumni.inari@gmail.com"
              className="flex-1 rounded-xl border border-white/10 bg-[#0E1015] px-4 py-2.5 text-sm text-[#F3F4F6]"
            />
            <button
              type="submit"
              disabled={addingWhitelist}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F3F4F6] px-5 py-2.5 text-sm font-semibold text-[#0E1015] hover:bg-white disabled:opacity-50"
            >
              {addingWhitelist ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MailPlus className="h-4 w-4" />
              )}
              Tambah ke Whitelist
            </button>
          </form>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161922]">
            {whitelist.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#9CA3AF]">
                Belum ada email non-IPB yang di-whitelist.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {whitelist.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div>
                      <div className="font-mono text-sm text-[#F3F4F6]">
                        {entry.email}
                      </div>
                      <div className="text-xs text-[#9CA3AF]">
                        Added by {entry.added_by ?? "Admin"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveWhitelist(entry)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete Edition & State Overrides */}
      {pendingConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#161922] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    pendingConfirm.kind === "delete_edition"
                      ? "border-rose-400/35 bg-rose-500/15 text-rose-200"
                      : "border-amber-400/35 bg-amber-500/15 text-amber-200"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F3F4F6]">
                    {pendingConfirm.kind === "delete_edition"
                      ? "Hapus Edisi DTI?"
                      : OVERRIDE_CONFIRM_META[pendingConfirm.action].title}
                  </h3>
                  <p className="font-mono text-xs text-[#9CA3AF]">
                    {pendingConfirm.edition.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={confirmingAction}
                onClick={() => setPendingConfirm(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-[#0E1015] text-[#9CA3AF] hover:text-[#F3F4F6]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#9CA3AF]">
              {pendingConfirm.kind === "delete_edition"
                ? `Edisi "${pendingConfirm.edition.title}" beserta seluruh karya, vote, dan file gambar terkait akan dihapus permanen. Aksi ini tidak bisa dibatalkan.`
                : OVERRIDE_CONFIRM_META[pendingConfirm.action].description}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={confirmingAction}
                onClick={() => setPendingConfirm(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[#9CA3AF] hover:text-[#F3F4F6]"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={confirmingAction}
                onClick={() => void executeConfirmedAction()}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  pendingConfirm.kind === "delete_edition"
                    ? "border border-rose-400/40 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                    : "bg-[#F3F4F6] text-[#0E1015] hover:bg-white"
                }`}
              >
                {confirmingAction && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {pendingConfirm.kind === "delete_edition"
                  ? "Ya, Hapus Permanen"
                  : OVERRIDE_CONFIRM_META[pendingConfirm.action].buttonLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
