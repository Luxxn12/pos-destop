"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DateRangeFilter, Transaction, TransactionDetail } from "../../types/pos";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function HistoryPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadTransactions = async (pageNumber = page) => {
    setLoading(true);
    try {
      const filter: DateRangeFilter = {};
      if (fromDate) {
        filter.from = new Date(`${fromDate}T00:00:00`).toISOString();
      }
      if (toDate) {
        filter.to = new Date(`${toDate}T23:59:59`).toISOString();
      }

      const result = await window.api.listTransactions({
        ...filter,
        page: pageNumber,
        pageSize
      });
      setTransactions(result.rows);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(1);
  }, []);

  useEffect(() => {
    setPage(1);
    loadTransactions(1);
  }, [fromDate, toDate]);

  const handleSelect = (id: number) => {
    router.push(`/receipt/${id}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Riwayat Transaksi</h1>
          <p className="text-sm text-slate-400">
            Data terbaru disimpan di SQLite lokal.
          </p>
        </div>
        <button
          onClick={() => loadTransactions(1)}
          className="h-12 rounded-lg border border-slate-800 px-4 text-sm text-slate-300"
        >
          Refresh
        </button>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">Dari</label>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">Sampai</label>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
            />
          </div>
          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            className="h-12 rounded-lg border border-slate-600 px-4 text-sm text-slate-200"
          >
            Clear
          </button>
          <span className="text-xs text-slate-400">
            Default: {todayISO()}
          </span>
        </div>
      </section>

      <div>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold mb-4">Daftar Transaksi</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Memuat...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada transaksi.</p>
          ) : (
            <ul className="space-y-3">
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">Transaksi #{tx.id}</p>
                    <p className="text-xs text-slate-400">{tx.created_at}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatRupiah(tx.total)}
                    </p>
                    <button
                      className="text-xs text-emerald-400"
                      onClick={() => handleSelect(tx.id)}
                    >
                      Detail
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-400">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                className="h-12 rounded-lg border border-slate-700 px-4 text-sm"
                disabled={page === 1}
                onClick={() => {
                  const next = Math.max(1, page - 1);
                  setPage(next);
                  loadTransactions(next);
                }}
              >
                Prev
              </button>
              <button
                className="h-12 rounded-lg border border-slate-700 px-4 text-sm"
                disabled={page >= totalPages}
                onClick={() => {
                  const next = Math.min(totalPages, page + 1);
                  setPage(next);
                  loadTransactions(next);
                }}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
