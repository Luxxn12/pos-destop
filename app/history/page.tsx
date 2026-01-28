"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DateRangeFilter, Transaction, TransactionDetail } from "../../types/pos";
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from "@/lib/date";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);

const todayISO = () => new Date().toISOString().slice(0, 10);
const todayDisplay = () => formatDateDDMMYYYY(todayISO());

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

  const handleSelect = (code: string | number) => {
    router.push(`/receipt/${code}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Riwayat Transaksi</h1>
          <p className="text-sm text-slate-500">
           Melihat daftar transaksi yang telah dilakukan.
          </p>
        </div>
        <button
          onClick={() => loadTransactions(1)}
          className="h-12 rounded-lg border border-slate-200 px-4 text-sm text-slate-700"
        >
          Refresh
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="block text-xs text-slate-500">
              Dari <span className="text-rose-600">*</span>
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-500">
              Sampai <span className="text-rose-600">*</span>
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
            />
          </div>
          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            className="h-12 rounded-lg border border-slate-300 px-4 text-sm text-slate-700"
          >
            Clear
          </button>
          <span className="text-xs text-slate-500">
            Default: {todayDisplay()}
          </span>
        </div>
      </section>

      <div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Daftar Transaksi</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Memuat...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada transaksi.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Tanggal</th>
                    <th className="px-4 py-3 font-semibold text-left">
                      Total
                    </th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        #{tx.code ?? tx.id}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTimeDDMMYYYY(tx.created_at)}
                      </td>
                      <td className="px-4 py-3 text-left font-semibold">
                        {formatRupiah(tx.total)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="text-emerald-600"
                          onClick={() => handleSelect(tx.code ?? tx.id)}
                          aria-label={`Detail transaksi ${tx.code ?? tx.id}`}
                          title="Detail"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="inline-block h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                className="h-12 rounded-lg border border-slate-300 px-4 text-sm"
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
                className="h-12 rounded-lg border border-slate-300 px-4 text-sm"
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
