"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { StoreSettings, TransactionDetail } from "../../../types/pos";
import toast from "react-hot-toast";
import {
  formatDateDDMMYYYY,
  formatDateTimeDDMMYYYY,
  formatTimeHHMMSS
} from "@/lib/date";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const transactionCode = useMemo(() => {
    const raw = params?.id;
    return raw ? String(raw) : null;
  }, [params]);

  useEffect(() => {
    const load = async () => {
      if (!transactionCode) {
        setLoading(false);
        return;
      }
      const [dataByCode, storeSettings] = await Promise.all([
        window.api.getTransactionDetailByCode(transactionCode),
        window.api.getSettings()
      ]);
      let data = dataByCode;
      if (!data) {
        const maybeId = Number(transactionCode);
        if (Number.isFinite(maybeId)) {
          data = await window.api.getTransactionDetail(maybeId);
        }
      }
      setDetail(data);
      setSettings(storeSettings);
      setLoading(false);
    };

    load();
  }, [transactionCode]);

  const handlePrint = async () => {
    if (!detail) return;
    try {
      const success = detail.transaction.code
        ? await window.api.printReceiptByCode(detail.transaction.code)
        : await window.api.printReceipt(detail.transaction.id);
      if (success) {
        toast.success("Struk berhasil dikirim ke printer.");
      } else {
        toast.error("Gagal mencetak struk. Cek printer atau pengaturan.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal mencetak struk.";
      toast.error(message);
    }
  };

  const transactionDate = formatDateDDMMYYYY(detail?.transaction.created_at);
  const transactionTime = formatTimeHHMMSS(detail?.transaction.created_at);
  const displayId =
    detail?.transaction.code ?? detail?.transaction.id?.toString() ?? "-";

  return (
    <>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Struk Transaksi</h1>
          <p className="text-sm text-slate-500">
            Detail transaksi setelah pembayaran.
          </p>
        </div>
        <button
          onClick={() => router.push("/transactions")}
          className="h-12 rounded-lg border border-slate-200 px-4 text-sm text-slate-700"
        >
          Kembali ke Transaksi
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        {loading ? (
          <p className="text-sm text-slate-500">Memuat...</p>
        ) : !detail ? (
          <p className="text-sm text-slate-500">
            Detail transaksi tidak ditemukan.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_320px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Transaksi #{displayId}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTimeDDMMYYYY(detail.transaction.created_at)}
                  </p>
                </div>
                <p className="text-lg font-semibold">
                  {formatRupiah(detail.transaction.total)}
                </p>
              </div>
              <div className="space-y-2">
                {detail.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {item.name} x{item.qty}
                    </span>
                    <span>{formatRupiah(item.line_total)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-3 space-y-1 text-sm">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Subtotal</span>
                  <span>
                    {formatRupiah(
                      detail.transaction.subtotal ?? detail.transaction.total
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>
                    PPN{" "}
                    {settings?.tax_enabled
                      ? `(${settings.tax_rate ?? 0}%)`
                      : "(Nonaktif)"}
                  </span>
                  <span>{formatRupiah(detail.transaction.tax_amount ?? 0)}</span>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="rounded-lg border border-emerald-300 text-emerald-700 px-4 py-2 text-sm"
              >
                Print Struk
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500 text-center">
                Preview Struk
              </p>
              <div className="mt-4 space-y-2 text-[11px] text-slate-700 font-mono">
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold">
                    {settings?.store_name ?? "Nama Perusahaan"}
                  </p>
                  <p className="text-slate-500">
                    {settings?.store_address ?? ""}
                  </p>
                  <p className="text-slate-500">
                    {settings?.store_phone ?? ""}
                  </p>
                  <p className="text-[12px] tracking-[0.3em] text-slate-700">
                    {settings?.receipt_header || "STRUK"}
                  </p>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>No Transaksi</span>
                    <span>#{displayId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal</span>
                    <span>{transactionDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu</span>
                    <span>{transactionTime}</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                  {detail.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.name} x{item.qty}
                      </span>
                      <span>{formatRupiah(item.line_total)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>
                      {formatRupiah(
                        detail.transaction.subtotal ?? detail.transaction.total
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      PPN{" "}
                      {settings?.tax_enabled
                        ? `(${settings.tax_rate ?? 0}%)`
                        : "(Nonaktif)"}
                    </span>
                    <span>{formatRupiah(detail.transaction.tax_amount ?? 0)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>Total</span>
                    <span>{formatRupiah(detail.transaction.total)}</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 text-center text-slate-500">
                  {settings?.receipt_footer || "Terima kasih"}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
