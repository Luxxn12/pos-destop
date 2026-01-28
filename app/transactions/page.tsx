"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  Product,
  SaveTransactionPayload,
  StoreSettings,
  TransactionItemPayload
} from "../../types/pos";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);

const parseRupiahInput = (value: string) => value.replace(/[^\d]/g, "");

const formatRupiahInput = (value: string) => {
  const numeric = parseRupiahInput(value);
  if (!numeric) return "";
  return formatRupiah(Number(numeric));
};

type CartItem = TransactionItemPayload & { id: number };

export default function TransactionsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const router = useRouter();

  const loadProducts = async () => {
    const rows = await window.api.listProducts({ page: 1, pageSize: 200 });
    setProducts(rows.rows);
  };

  const loadSettings = async () => {
    const data = await window.api.getSettings();
    setSettings(data);
  };

  useEffect(() => {
    loadProducts();
    loadSettings();
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.price, 0),
    [cart]
  );

  const taxAmount = useMemo(() => {
    if (!settings || settings.tax_enabled !== 1) return 0;
    return Math.round((subtotal * settings.tax_rate) / 100);
  }, [subtotal, settings]);

  const total = subtotal + taxAmount;

  const cashReceivedValue = useMemo(() => {
    const parsed = Number(parseRupiahInput(cashReceived));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [cashReceived]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          product_id: product.id,
          name: product.name,
          price: product.price,
          qty: 1
        }
      ];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId
            ? { ...item, qty: Math.max(0, item.qty + delta) }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const handleBarcode = (event: FormEvent) => {
    event.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    const product = products.find((item) => item.barcode === code);
    if (!product) {
      setNote("Barcode tidak ditemukan.");
      return;
    }
    addToCart(product);
    setBarcode("");
    setNote("");
  };

  const totalChange = useMemo(() => {
    return Math.max(0, cashReceivedValue - total);
  }, [cashReceivedValue, total]);

  const canConfirmPayment = useMemo(() => {
    if (cashReceivedValue <= 0) return false;
    return cashReceivedValue >= total;
  }, [cashReceivedValue, total]);

  const handleConfirmPayment = async () => {
    if (cart.length === 0) return;
    if (cashReceivedValue <= 0) {
      setPaymentError("Uang diterima wajib diisi.");
      return;
    }
    if (cashReceivedValue < total) {
      setPaymentError("Uang diterima kurang dari total pembayaran.");
      return;
    }
    setPaymentError("");
    setIsConfirming(true);
    setIsSaving(true);
    const payload: SaveTransactionPayload = {
      items: cart.map(({ id, ...item }) => item),
      total
    };

    try {
      const transactionId = await window.api.saveTransaction(payload);
      setNote(`Transaksi #${transactionId} tersimpan.`);
      toast.success(`Transaksi #${transactionId} tersimpan.`);
      setCart([]);
      setCashReceived("");
      setIsPaymentOpen(false);
      router.push(`/receipt/${transactionId}`);
    } catch (error) {
      setNote("Gagal menyimpan transaksi.");
      toast.error("Gagal menyimpan transaksi.");
    } finally {
      setIsSaving(false);
      setIsConfirming(false);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transaksi</h1>
          <p className="text-sm text-slate-400">
            Pilih produk, lakukan pembayaran, dan cetak struk.
          </p>
        </div>
        <button
          className="h-12 rounded-lg border border-slate-800 px-4 text-sm text-slate-300"
          onClick={() => setCart([])}
        >
          Reset keranjang
        </button>
      </header>

      <div className="grid grid-cols-[1.4fr_1fr] gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Daftar Produk</h2>
            <button
              onClick={loadProducts}
              className="h-12 rounded-lg border border-slate-800 px-4 text-sm text-slate-300"
            >
              Refresh
            </button>
          </div>
          <form onSubmit={handleBarcode} className="flex items-end gap-3 mb-4">
            <div className="flex-1 space-y-1">
              <label className="block text-xs text-slate-400">Barcode</label>
              <input
                className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
                placeholder="Scan barcode"
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
              />
            </div>
            <button
              type="submit"
              className="h-12 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-slate-950"
            >
              Tambah
            </button>
          </form>
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 text-left hover:border-emerald-400 transition"
              >
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatRupiah(product.price)}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  Qty: {product.qty}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold mb-4">Keranjang</h2>
          <div className="space-y-3">
            {cart.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada item.</p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      {formatRupiah(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-md border border-slate-700 px-2"
                      onClick={() => updateQty(item.id, -1)}
                    >
                      -
                    </button>
                    <span className="text-sm w-6 text-center">{item.qty}</span>
                    <button
                      className="rounded-md border border-slate-700 px-2"
                      onClick={() => updateQty(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-6 border-t border-slate-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Subtotal</span>
              <span className="text-sm font-semibold">
                {formatRupiah(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Pajak {settings?.tax_enabled ? `${settings.tax_rate}%` : "(Nonaktif)"}
              </span>
              <span className="text-sm font-semibold">
                {formatRupiah(taxAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Total</span>
              <span className="text-lg font-semibold">
                {formatRupiah(total)}
              </span>
            </div>
            <button
              disabled={cart.length === 0 || isSaving}
              onClick={() => {
                setPaymentError("");
                setIsPaymentOpen(true);
              }}
              className="w-full h-12 rounded-lg bg-emerald-500 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Proses Pembayaran"}
            </button>
            {note && <p className="text-xs text-emerald-300">{note}</p>}
          </div>
        </section>
      </div>

      {isPaymentOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Proses Pembayaran</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total Pembayaran</span>
                <span className="font-semibold">{formatRupiah(total)}</span>
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-slate-400">
                  Uang Diterima
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
                  placeholder="Masukkan uang diterima"
                  value={formatRupiahInput(cashReceived)}
                  onChange={(event) =>
                    setCashReceived(parseRupiahInput(event.target.value))
                  }
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Uang Kembalian</span>
                <span className="font-semibold">
                  {formatRupiah(totalChange)}
                </span>
              </div>
              {paymentError ? (
                <p className="text-xs text-rose-300">{paymentError}</p>
              ) : null}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="flex-1 h-12 rounded-lg border border-slate-700 text-sm text-slate-200"
                >
                  Batal
                </button>
                <button
                  disabled={!canConfirmPayment || isConfirming || isSaving}
                  onClick={handleConfirmPayment}
                  className="flex-1 h-12 rounded-lg bg-emerald-500 text-sm font-semibold text-slate-950 disabled:opacity-50"
                >
                  {isConfirming ? "Menyimpan..." : "Konfirmasi Pembayaran"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
