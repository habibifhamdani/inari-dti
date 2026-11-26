"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Archive, LogOut, Shield } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { isAdminRole } from "@/lib/api";

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const isAdmin = isAdminRole(user);

  const navLinkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
      active
        ? "bg-white/10 text-[#F3F4F6]"
        : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/5"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0E1015]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-6">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-[#161922] transition-colors group-hover:border-white/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand-icon.png"
                alt="INARI DTI Icon"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="whitespace-nowrap leading-tight">
              <div className="text-sm font-bold tracking-wider text-[#F3F4F6]">
                INARI <span className="font-mono font-normal text-[#9CA3AF]">DTI</span>
              </div>
              <div className="hidden font-mono text-[10px] uppercase tracking-widest text-[#9CA3AF] sm:block">
                Divisi Gambar · IPB
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/" className={navLinkClass(pathname === "/")}>
              Active Edition
            </Link>
            <Link href="/archive" className={navLinkClass(pathname.startsWith("/archive"))}>
              <span className="inline-flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5" />
                Archive
              </span>
            </Link>
            {isAdmin && (
              <Link href="/admin" className={navLinkClass(pathname.startsWith("/admin"))}>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Admin Panel
                </span>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-white/5" />
          ) : user ? (
            <>
              {!user.is_verified && (
                <Link
                  href="/verify-email"
                  className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 lg:inline-flex"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Verify Email
                </Link>
              )}

              <Link
                href="/profile"
                title="Pengaturan Profil"
                className={`flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1 transition-colors sm:px-2.5 ${
                  pathname.startsWith("/profile")
                    ? "border-white/25 bg-white/10"
                    : "border-white/[0.08] bg-[#161922] hover:border-white/20"
                }`}
              >
                <Avatar src={user.avatar_url} name={user.name} size="xs" />
                <span className="max-w-[78px] truncate text-xs font-medium text-[#F3F4F6] sm:max-w-[140px]">
                  {user.name}
                </span>
                {user.is_superadmin ? (
                  <span className="shrink-0 rounded border border-purple-400/40 bg-purple-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase text-purple-200 sm:text-[10px]">
                    Superadmin
                  </span>
                ) : user.role === "admin" ? (
                  <span className="shrink-0 rounded border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-[#F3F4F6] sm:text-[10px]">
                    Admin
                  </span>
                ) : null}
              </Link>

              <button
                type="button"
                onClick={() => void logout()}
                title="Logout"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#161922] text-[#9CA3AF] transition-colors hover:border-white/20 hover:text-[#F3F4F6]"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:text-[#F3F4F6]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-white/15 bg-[#F3F4F6] px-3.5 py-1.5 text-sm font-semibold text-[#0E1015] transition-colors hover:bg-white"
              >
                Join GA
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="flex items-center gap-1.5 border-t border-white/[0.06] px-4 py-2 md:hidden">
        <Link href="/" className={navLinkClass(pathname === "/")}>
          Active
        </Link>
        <Link href="/archive" className={navLinkClass(pathname.startsWith("/archive"))}>
          Archive
        </Link>
        {isAdmin && (
          <Link href="/admin" className={navLinkClass(pathname.startsWith("/admin"))}>
            Admin
          </Link>
        )}
        {user && !user.is_verified && (
          <Link
            href="/verify-email"
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200"
          >
            <AlertTriangle className="h-3 w-3" />
            Verify
          </Link>
        )}
      </div>
    </header>
  );
}
