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
  const [summary, setSummary] = useState<DashboardSummary>({
    transactions_today: 0,
    revenue_today: 0,
    products_count: 0
  });

  const loadSummary = async () => {
    if (!window?.api?.getDashboardSummary) {
      return;
    }
    const data = await window.api.getDashboardSummary();
    setSummary(data);
  };

  useEffect(() => {
    loadSummary();
    const timer = setInterval(loadSummary, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-400">
            Resume real-time transaksi hari ini.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">User</p>
          <p className="text-sm">admin</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Transaksi Hari Ini</p>
          <p className="text-xl font-semibold">{summary.transactions_today}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Pendapatan Hari Ini</p>
          <p className="text-xl font-semibold">
            {formatRupiah(summary.revenue_today)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Jumlah Produk</p>
          <p className="text-xl font-semibold">{summary.products_count}</p>
        </div>
      </div>
    </>
  );
}
