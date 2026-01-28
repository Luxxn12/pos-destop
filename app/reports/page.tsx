"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import type {
  DateRangeFilter,
  ReportSeriesBucket,
  ReportSummary
} from "../../types/pos";
import { formatDateDDMMYYYY } from "@/lib/date";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

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
    const formatted = formatDateDDMMYYYY(label);
    if (range === "monthly") return formatted.slice(0, 2);
    return formatted.slice(0, 5);
  };

  const chartOption = useMemo<EChartsOption>(() => {
    const labels = series.map((point) => formatChartLabel(point.label));
    const values = series.map((point) => Number(point.value) || 0);
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          const payload = Array.isArray(params) ? params[0] : params;
          if (!payload) return "";
          const label = payload.name ?? "";
          const value = Array.isArray(payload.value)
            ? payload.value[1]
            : payload.value ?? 0;
          return `${label}<br/>${formatRupiah(Number(value) || 0)}`;
        }
      },
      grid: { left: 16, right: 16, top: 16, bottom: 32, containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        axisTick: { alignWithLabel: true },
        axisLabel: { color: "#64748b", fontSize: 10 }
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: "#94a3b8",
          fontSize: 10,
          formatter: (value: number) =>
            new Intl.NumberFormat("id-ID", { notation: "compact" }).format(
              Number(value) || 0
            )
        },
        splitLine: { lineStyle: { color: "#e2e8f0" } }
      },
      series: [
        {
          type: "bar",
          data: values,
          itemStyle: { color: "rgba(16,185,129,0.7)", borderRadius: [6, 6, 0, 0] },
          barMaxWidth: 28
        }
      ]
    };
  }, [series, range]);

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
        <p className="text-sm text-slate-500">
          Resume pendapatan dan transaksi, dengan opsi export.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="block text-xs text-slate-500">
              Periode <span className="text-rose-600">*</span>
            </label>
            <select
              value={range}
              onChange={(event) =>
                setRange(
                  event.target.value as "daily" | "weekly" | "monthly" | "custom"
                )
              }
              className="h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
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
                <label className="block text-xs text-slate-500">
                  Dari <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-slate-500">
                  Sampai <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
                />
              </div>
            </div>
          )}
          <button
            onClick={handleExport}
            className="h-12 rounded-lg border border-emerald-300 px-4 text-sm text-emerald-700"
          >
            Export Transaksi
          </button>
          {note && <p className="text-xs text-emerald-700">{note}</p>}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-emerald-700/80">
                Total Pendapatan
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatRupiah(summary.total_revenue)}
              </p>
              <p className="text-[11px] text-emerald-700/70">Semua pemasukan</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <span className="text-lg">Rp</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-sky-700/80">
                Jumlah Transaksi
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {summary.total_transactions}
              </p>
              <p className="text-[11px] text-sky-700/70">Total transaksi</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
              <span className="text-lg">#</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-amber-700/80">
                Rata-rata Transaksi
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatRupiah(summary.average_transaction)}
              </p>
              <p className="text-[11px] text-amber-700/70">Nilai rata-rata</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <span className="text-lg">≈</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
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
            <p className="text-xs text-slate-500">
              Total pendapatan sesuai periode.
            </p>
          </div>
        </div>
        {series.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Tidak ada data.</p>
        ) : (
          <div className="mt-6">
            <ReactECharts
              option={chartOption}
              style={{ height: 240, width: "100%" }}
            />
          </div>
        )}
      </section>
    </>
  );
}
