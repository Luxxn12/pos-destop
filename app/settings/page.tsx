"use client";

import { useEffect, useState } from "react";
import type { StoreSettings } from "../../types/pos";
import toast from "react-hot-toast";

const emptySettings: StoreSettings = {
  store_name: "",
  store_address: "",
  store_phone: "",
  tax_enabled: 0,
  tax_rate: 10,
  receipt_header: "",
  receipt_footer: ""
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(emptySettings);
  const [note, setNote] = useState("");

  const loadSettings = async () => {
    const data = await window.api.getSettings();
    setSettings({
      ...data,
      receipt_header: data.receipt_header ?? "",
      receipt_footer: data.receipt_footer ?? ""
    });
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      await window.api.updateSettings(settings);
      setNote("Pengaturan berhasil disimpan.");
      toast.success("Pengaturan berhasil disimpan.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menyimpan pengaturan.";
      setNote(message);
      toast.error(message);
    }
  };

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">Pengaturan</h1>
        <p className="text-sm text-slate-400">
          Informasi toko, pajak, dan konfigurasi struk.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Informasi Toko</h2>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Nama Toko</label>
          <input
            className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
            placeholder="Nama Toko"
            value={settings.store_name}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, store_name: event.target.value }))
            }
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Alamat</label>
          <input
            className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
            placeholder="Alamat"
            value={settings.store_address}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                store_address: event.target.value
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Nomor Telepon</label>
          <input
            className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
            placeholder="Nomor Telepon"
            value={settings.store_phone}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, store_phone: event.target.value }))
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Pengaturan Pajak / PPN</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.tax_enabled === 1}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                tax_enabled: event.target.checked ? 1 : 0
              }))
            }
          />
          Aktifkan PPN
        </label>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Tarif PPN (%)</label>
          <input
            type="number"
            className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
            placeholder="Tarif PPN (%)"
            value={settings.tax_rate}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                tax_rate: Number(event.target.value)
              }))
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Pengaturan Struk</h2>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Header Struk</label>
          <input
            className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
            placeholder="Header struk (mis. STRUK PEMBAYARAN)"
            value={settings.receipt_header ?? ""}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                receipt_header: event.target.value
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Footer Struk</label>
          <textarea
            className="w-full rounded-lg bg-slate-950 border border-slate-700 p-3"
            placeholder="Footer struk (mis. Terima kasih)"
            rows={3}
            value={settings.receipt_footer ?? ""}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                receipt_footer: event.target.value
              }))
            }
          />
        </div>
      </section>

      <button
        onClick={handleSave}
        className="h-12 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-slate-950"
      >
        Simpan Pengaturan
      </button>
      {note && <p className="text-sm text-emerald-300">{note}</p>}
    </>
  );
}
