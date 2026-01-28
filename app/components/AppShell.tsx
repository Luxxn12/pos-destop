"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";

const DEFAULT_USER = {
  username: "admin",
  password: "admin123"
};

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [note, setNote] = useState("");
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 13h8V3H3v10Z" />
          <path d="M13 21h8V11h-8v10Z" />
          <path d="M13 3h8v6h-8z" />
          <path d="M3 17h8v4H3z" />
        </svg>
      )
    },
    {
      label: "Produk",
      href: "/products",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7h18l-2 12H5L3 7Z" />
          <path d="M7 7V5a5 5 0 0 1 10 0v2" />
        </svg>
      )
    },
    {
      label: "Kategori",
      href: "/categories",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h7l2 3h7v13H4V4Z" />
          <path d="M4 10h16" />
        </svg>
      )
    },
    {
      label: "Transaksi",
      href: "/transactions",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16v10H4z" />
          <path d="M4 11h16" />
          <path d="M8 15h.01" />
          <path d="M12 15h4" />
        </svg>
      )
    },
    {
      label: "Riwayat",
      href: "/history",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8v5l3 2" />
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v4h4" />
        </svg>
      )
    },
    {
      label: "Laporan",
      href: "/reports",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16v16H4z" />
          <path d="M8 16v-4" />
          <path d="M12 16V8" />
          <path d="M16 16v-6" />
        </svg>
      )
    },
    {
      label: "Pengaturan",
      href: "/settings",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V22a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H8a1.7 1.7 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V8c0 .7.4 1.3 1.1 1.5H22a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      )
    }
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();
    if (
      form.username === DEFAULT_USER.username &&
      form.password === DEFAULT_USER.password
    ) {
      setIsAuthed(true);
      setForm({ username: "", password: "" });
      setNote("");
      return;
    }
    setNote("Username atau password salah.");
  };

  if (!isAuthed) {
    return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl"
      >
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo.png"
              alt="SmartPOS"
              className="h-28 w-auto"
            />
          </div>
          <p className="text-center text-sm text-slate-500 mb-6">
            Gunakan kredensial yang sudah ditentukan.
          </p>
          <label className="block text-sm text-slate-700 mb-2">
            Username <span className="text-rose-600">*</span>
          </label>
          <input
            value={form.username}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, username: event.target.value }))
            }
            className="w-full h-12 mb-4 rounded-lg bg-white border border-slate-300 px-4 text-sm text-slate-900"
            placeholder="Username"
          />
          <label className="block text-sm text-slate-700 mb-2">
            Password <span className="text-rose-600">*</span>
          </label>
          <div className="relative mb-6">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="w-full h-12 rounded-lg bg-white border border-slate-300 px-4 pr-12 text-sm text-slate-900"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
              aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 4.3A10.9 10.9 0 0 1 12 4c4.8 0 8.7 3 10 7-0.5 1.8-1.6 3.5-3.1 4.8" />
                  <path d="M6.1 6.1A10.7 10.7 0 0 0 2 11c1.3 4 5.2 7 10 7 1 0 2-0.1 2.9-0.4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {note && <p className="text-sm text-amber-600 mb-4">{note}</p>}
          <button
            type="submit"
            className="w-full h-12 rounded-lg bg-emerald-500 text-white text-sm font-semibold"
          >
            Masuk
          </button>
        </form>
        <Toaster position="top-center" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div
        className={[
          "grid min-h-screen transition-[grid-template-columns] duration-200",
          isCollapsed ? "grid-cols-[84px_1fr]" : "grid-cols-[240px_1fr]"
        ].join(" ")}
      >
        <aside
          className={[
            "border-r border-slate-200 bg-white transition-[padding] duration-200 flex flex-col",
            isCollapsed ? "p-4" : "p-6"
          ].join(" ")}
        >
          <div className="flex items-center justify-center">
            <div className="flex items-center justify-center">
              <img
                src="/logo.png"
                alt="SmartPOS"
                className={isCollapsed ? "h-10 w-auto" : "h-20 w-auto"}
              />
            </div>
          </div>
          <nav className={["text-sm", isCollapsed ? "mt-6 space-y-1" : "mt-6 space-y-2"].join(" ")}>
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 transition",
                    active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                  ].join(" ")}
                >
                  <span className={active ? "text-emerald-600" : "text-slate-500"}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="leading-none">{item.label}</span>}
                  {isCollapsed && (
                    <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 opacity-0 shadow-lg transition group-hover:opacity-100">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex justify-end pt-6">
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="rounded-lg border border-slate-200 bg-slate-100 p-2 text-slate-700 transition hover:text-slate-900 hover:border-slate-300"
              aria-label={isCollapsed ? "Perbesar sidebar" : "Perkecil sidebar"}
            >
              {isCollapsed ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12h16" />
                  <path d="M10 6l-6 6 6 6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12h16" />
                  <path d="M14 6l6 6-6 6" />
                </svg>
              )}
            </button>
          </div>
        </aside>
        <section className="p-8 space-y-8">{children}</section>
      </div>
      <Toaster position="top-center" />
    </main>
  );
}
