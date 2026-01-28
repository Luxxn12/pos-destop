"use client";

import { useEffect, useState } from "react";
import type { DashboardSummary } from "../types/pos";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);

export default function DashboardPage() {
  const defaultSummary: DashboardSummary = {
    transactions_today: 0,
    revenue_today: 0,
    products_count: 0,
    top_products: [],
    low_stock_count: 0,
    low_stock_items: [],
    low_stock_threshold: 5
  };
  const [summary, setSummary] = useState<DashboardSummary>(defaultSummary);

  const loadSummary = async () => {
    if (!window?.api?.getDashboardSummary) {
      return;
    }
    const data = await window.api.getDashboardSummary();
    setSummary({
      ...defaultSummary,
      ...data,
      top_products: data?.top_products ?? defaultSummary.top_products,
      low_stock_items: data?.low_stock_items ?? defaultSummary.low_stock_items,
      low_stock_threshold:
        data?.low_stock_threshold ?? defaultSummary.low_stock_threshold,
      low_stock_count: data?.low_stock_count ?? defaultSummary.low_stock_count
    });
  };

  useEffect(() => {
    loadSummary();
    const timer = setInterval(loadSummary, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Resume real-time transaksi hari ini.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">User</p>
          <p className="text-sm">admin</p>
        </div>
      </header>

      <section className="mt-4">
        <h2 className="text-sm font-semibold text-slate-600">Ringkasan</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-black">Transaksi Hari Ini</p>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h10" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {summary.transactions_today}
            </p>
            <p className="text-xs text-slate-400">Total transaksi masuk.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-black">Pendapatan Hari Ini</p>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v18" />
                  <path d="M17 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatRupiah(summary.revenue_today)}
            </p>
            <p className="text-xs text-slate-400">Sebelum laporan harian.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-black">Jumlah Produk</p>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="14" rx="2" />
                  <path d="M7 8h10" />
                  <path d="M7 12h6" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {summary.products_count}
            </p>
            <p className="text-xs text-slate-400">Produk aktif di katalog.</p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-600">Perhatian</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                Produk Terlaris Hari Ini
              </p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                Top 5
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {summary.top_products.length === 0 ? (
                <li className="text-slate-400">Belum ada penjualan.</li>
              ) : (
                summary.top_products.map((item, index) => (
                  <li
                    key={`${item.name}-${index}`}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                  >
                    <span className="line-clamp-1 text-slate-700">
                      {item.name}
                    </span>
                    <span className="text-slate-500">{item.qty_sold} qty</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-amber-800">Stok Menipis</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                ≤ {summary.low_stock_threshold}
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-amber-900">
              {summary.low_stock_count}
            </p>
            <p className="text-xs text-amber-700">
              Item yang perlu segera restock.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {summary.low_stock_items.length === 0 ? (
                <li className="text-amber-700/70">Tidak ada stok menipis.</li>
              ) : (
                summary.low_stock_items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2"
                  >
                    <span className="line-clamp-1 text-amber-900">
                      {item.name}
                    </span>
                    <span className="text-amber-700">Sisa {item.qty}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
