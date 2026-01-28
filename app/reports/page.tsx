"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  DateRangeFilter,
  ReportSeriesBucket,
  ReportSummary
} from "../../types/pos";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);

const todayISO = () => new Date().toISOString().slice(0, 10);
const toSqliteDateTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
const toLocalDate = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

const buildDateLabels = (start: Date, end: Date) => {
  const labels: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);
  while (cursor <= endDate) {
    labels.push(toLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return labels;
};

export default function ReportsPage() {
  const [range, setRange] = useState<"daily" | "weekly" | "monthly" | "custom">(
    "daily"
  );
  const [customFrom, setCustomFrom] = useState(todayISO());
  const [customTo, setCustomTo] = useState(todayISO());
  const [summary, setSummary] = useState<ReportSummary>({
    total_revenue: 0,
    total_transactions: 0,
    average_transaction: 0
  });
  const [series, setSeries] = useState<{ label: string; value: number }[]>([]);
  const [note, setNote] = useState("");

  const filter = useMemo<DateRangeFilter>(() => {
    const now = new Date();
    if (range === "daily") {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      return { from: toSqliteDateTime(from), to: toSqliteDateTime(to) };
    }
    if (range === "weekly") {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      return { from: toSqliteDateTime(from), to: toSqliteDateTime(to) };
    }
    if (range === "monthly") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { from: toSqliteDateTime(from), to: toSqliteDateTime(to) };
    }
    if (customFrom && customTo) {
      const from = new Date(customFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(customTo);
      to.setHours(23, 59, 59, 999);
      return { from: toSqliteDateTime(from), to: toSqliteDateTime(to) };
    }
    return {};
  }, [range, customFrom, customTo]);

  const loadSummary = async () => {
    if (!window.api?.getReportSummary) {
      setSummary({
        total_revenue: 0,
        total_transactions: 0,
        average_transaction: 0
      });
      setNote("Fitur laporan membutuhkan aplikasi Electron.");
      return;
    }
    const data = await window.api.getReportSummary(filter);
    setSummary(data);
  };

  const seriesConfig = useMemo(() => {
    const now = new Date();
    if (range === "daily") {
      return {
        groupBy: "hour" as const,
        labels: Array.from({ length: 24 }, (_, index) =>
          String(index).padStart(2, "0")
        )
      };
    }
    if (range === "weekly") {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      const to = new Date(now);
      return { groupBy: "day" as const, labels: buildDateLabels(from, to) };
    }
    if (range === "monthly") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { groupBy: "day" as const, labels: buildDateLabels(from, to) };
    }
    if (customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      return { groupBy: "day" as const, labels: buildDateLabels(from, to) };
    }
    return { groupBy: "day" as const, labels: [] as string[] };
  }, [range, customFrom, customTo]);

  const loadSeries = async () => {
    if (seriesConfig.labels.length === 0) {
      setSeries([]);
      return;
    }
    if (!window.api?.getReportSeries) {
      setSeries([]);
      return;
    }
    const rows = (await window.api.getReportSeries({
      filter,
      groupBy: seriesConfig.groupBy
    })) as ReportSeriesBucket[];
    const normalizeBucket = (bucket: string) => {
      if (seriesConfig.groupBy === "hour") {
        return String(bucket).padStart(2, "0");
      }
      return String(bucket).slice(0, 10);
    };
    const map = new Map(
      rows.map((row) => [normalizeBucket(row.bucket), row.total ?? 0])
    );
    setSeries(
      seriesConfig.labels.map((label) => ({
        label,
        value: map.get(label) ?? 0
      }))
    );
  };

  useEffect(() => {
    loadSummary();
    loadSeries();
  }, [filter, seriesConfig]);

  const formatChartLabel = (label: string) => {
    if (range === "daily") return label;
    if (range === "monthly") return label.slice(8);
    return label.slice(5);
  };

  const handleExport = async () => {
    const path = await window.api.exportTransactions(filter);
    if (path) {
      setNote(`Export tersimpan di ${path}`);
    }
  };

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">Laporan</h1>
        <p className="text-sm text-slate-400">
          Resume pendapatan dan transaksi, dengan opsi export.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">Periode</label>
            <select
              value={range}
              onChange={(event) =>
                setRange(
                  event.target.value as "daily" | "weekly" | "monthly" | "custom"
                )
              }
              className="h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
            >
              <option value="daily">Harian</option>
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {range === "custom" && (
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <label className="block text-xs text-slate-400">Dari</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-slate-400">Sampai</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
                />
              </div>
            </div>
          )}
          <button
            onClick={handleExport}
            className="h-12 rounded-lg border border-emerald-500/60 px-4 text-sm text-emerald-300"
          >
            Export Transaksi
          </button>
          {note && <p className="text-xs text-emerald-300">{note}</p>}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Total Pendapatan</p>
          <p className="text-xl font-semibold">
            {formatRupiah(summary.total_revenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Jumlah Transaksi</p>
          <p className="text-xl font-semibold">{summary.total_transactions}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Rata-rata Transaksi</p>
          <p className="text-xl font-semibold">
            {formatRupiah(summary.average_transaction)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">
              {range === "daily"
                ? "Penjualan Harian"
                : range === "weekly"
                  ? "Penjualan Mingguan"
                  : range === "monthly"
                    ? "Penjualan Bulanan"
                    : "Penjualan Custom"}
            </p>
            <p className="text-xs text-slate-400">
              Total pendapatan sesuai periode.
            </p>
          </div>
        </div>
        {series.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Tidak ada data.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <div className="flex items-end gap-2 h-48 min-w-full">
              {(() => {
                const values = series.map((point) => Number(point.value) || 0);
                const maxValue = Math.max(1, ...values);
                return series.map((point) => {
                  const normalized = (Number(point.value) || 0) / maxValue;
                  const height = point.value > 0 ? Math.max(0.06, normalized) : 0;
                  return (
                    <div
                      key={point.label}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-2 min-w-[28px]"
                    >
                      <div
                        className="w-full rounded-md bg-emerald-500/70"
                        style={{ height: `${height * 100}%` }}
                      />
                      <span className="text-[10px] text-slate-400">
                        {formatChartLabel(point.label)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
