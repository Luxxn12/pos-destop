"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const router = useRouter();
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNotFoundRef = useRef("");
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const focusBarcodeInput = () => {
    barcodeInputRef.current?.focus();
  };

  useEffect(() => {
    if (barcodeTimerRef.current) {
      clearTimeout(barcodeTimerRef.current);
    }

    const code = barcode.trim();
    if (!code) {
      setNote("");
      return;
    }

    barcodeTimerRef.current = setTimeout(() => {
      const product = products.find((item) => item.barcode === code);
      if (product) {
        addToCart(product);
        setBarcode("");
        setNote("");
        focusBarcodeInput();
        return;
      }

      if (lastNotFoundRef.current !== code) {
        setNote("Barcode tidak ditemukan.");
        toast.error("Barcode tidak ditemukan.");
        lastNotFoundRef.current = code;
      }
    }, 250);

    return () => {
      if (barcodeTimerRef.current) {
        clearTimeout(barcodeTimerRef.current);
      }
    };
  }, [barcode, products]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.price, 0),
    [cart]
  );

  const productById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(term)
    );
  }, [products, search]);

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
    if (product.qty <= 0) {
      toast.error("Stok produk habis.");
      return;
    }
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.qty >= product.qty) {
        toast.error("Qty melebihi stok tersedia.");
        return;
      }
      setCart((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        )
      );
      focusBarcodeInput();
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        id: product.id,
        product_id: product.id,
        name: product.name,
        price: product.price,
        qty: 1
      }
    ]);
    focusBarcodeInput();
  };

  const updateQty = (productId: number, delta: number) => {
    if (delta > 0) {
      const product = productById.get(productId);
      const current = cart.find((item) => item.id === productId);
      if (product && current && current.qty >= product.qty) {
        toast.error("Qty melebihi stok tersedia.");
        return;
      }
    }
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
      toast.error("Barcode tidak ditemukan.");
      return;
    }
    if (product.qty <= 0) {
      toast.error("Stok produk habis.");
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
      const { id: transactionId, code } = await window.api.saveTransaction(
        payload
      );
      const displayId = code ?? transactionId;
      setNote(`Transaksi #${displayId} tersimpan.`);
      toast.success(`Transaksi #${displayId} tersimpan.`);
      setCart([]);
      setCashReceived("");
      setIsPaymentOpen(false);
      router.push(`/receipt/${displayId}`);
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
          <p className="text-sm text-slate-500">
            Pilih produk, lakukan pembayaran, dan cetak struk.
          </p>
        </div>
        <button
          className="h-12 rounded-lg border border-slate-200 px-4 text-sm text-slate-700"
          onClick={() => setCart([])}
        >
          Reset keranjang
        </button>
      </header>

      <div className="grid grid-cols-[1.4fr_1fr] gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Daftar Produk</h2>
            <button
              onClick={loadProducts}
              className="h-12 rounded-lg border border-slate-200 px-4 text-sm text-slate-700"
            >
              Refresh
            </button>
          </div>
          <form onSubmit={handleBarcode} className="flex items-end gap-3 mb-4">
            <div className="flex-1 space-y-1">
              <label className="block text-xs text-slate-500">
                Barcode <span className="text-rose-600">*</span>
              </label>
              <input
                ref={barcodeInputRef}
                className="w-full h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
                placeholder="Scan barcode"
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
              />
            </div>
            <button
              type="submit"
              className="h-12 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white"
            >
              Tambah
            </button>
          </form>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[220px] space-y-1">
              <label className="block text-xs text-slate-500">
                Cari nama produk
              </label>
              <input
                className="w-full h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
                placeholder="Ketik nama produk"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="h-12 rounded-lg border border-slate-200 px-4 text-sm text-slate-700"
            >
              Reset
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.length === 0 ? (
              <p className="text-sm text-slate-500 col-span-2">
                {search.trim()
                  ? "Produk tidak ditemukan."
                  : "Belum ada produk."}
              </p>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.qty <= 0}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-emerald-400 transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatRupiah(product.price)}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {product.qty > 0 ? `Qty: ${product.qty}` : "Stok habis"}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Keranjang</h2>
          <div className="space-y-3">
            {cart.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada item.</p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatRupiah(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-md border border-slate-300 px-2"
                      onClick={() => updateQty(item.id, -1)}
                    >
                      -
                    </button>
                    <span className="text-sm w-6 text-center">{item.qty}</span>
                    <button
                      disabled={
                        (productById.get(item.id)?.qty ?? 0) <= item.qty
                      }
                      className="rounded-md border border-slate-300 px-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => updateQty(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-6 border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Subtotal</span>
              <span className="text-sm font-semibold">
                {formatRupiah(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                PPN {settings?.tax_enabled ? `${settings.tax_rate}%` : "(Nonaktif)"}
              </span>
              <span className="text-sm font-semibold">
                {formatRupiah(taxAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total</span>
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
              className="w-full h-12 rounded-lg bg-emerald-500 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Proses Pembayaran"}
            </button>
          </div>
        </section>
      </div>

      {isPaymentOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Proses Pembayaran</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total Pembayaran</span>
                <span className="font-semibold">{formatRupiah(total)}</span>
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-slate-500">
                  Uang Diterima <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
                  placeholder="Masukkan uang diterima"
                  value={formatRupiahInput(cashReceived)}
                  onChange={(event) =>
                    setCashReceived(parseRupiahInput(event.target.value))
                  }
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Uang Kembalian</span>
                <span className="font-semibold">
                  {formatRupiah(totalChange)}
                </span>
              </div>
              {paymentError ? (
                <p className="text-xs text-rose-600">{paymentError}</p>
              ) : null}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="flex-1 h-12 rounded-lg border border-slate-300 text-sm text-slate-700"
                >
                  Batal
                </button>
                <button
                  disabled={!canConfirmPayment || isConfirming || isSaving}
                  onClick={handleConfirmPayment}
                  className="flex-1 h-12 rounded-lg bg-emerald-500 text-sm font-semibold text-white disabled:opacity-50"
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
