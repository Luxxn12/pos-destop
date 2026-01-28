"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Category, PagedResult, Product } from "../../types/pos";
import toast from "react-hot-toast";
import JsBarcode from "jsbarcode";

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

const emptyForm = {
  id: 0,
  name: "",
  barcode: "",
  price: "",
  qty: "",
  category_id: ""
};

const BarcodePreview = ({ value }: { value?: string | null }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.innerHTML = "";
    if (!value) return;

    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        displayValue: false,
        height: 32,
        margin: 0,
        width: 1
      });
    } catch {
      // Ignore invalid barcode values to avoid breaking the table.
    }
  }, [value]);

  if (!value) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <div className="flex w-[140px] flex-col items-start gap-1">
      <svg
        ref={svgRef}
        aria-label={`Barcode ${value}`}
        className="block h-8 w-[140px]"
      />
      <span className="w-full text-center text-xs text-slate-500">
        {value}
      </span>
    </div>
  );
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  const trimmedName = form.name.trim();
  const trimmedBarcode = form.barcode.trim();
  const priceValue = form.price === "" ? NaN : Number(form.price);
  const qtyValue = form.qty === "" ? NaN : Number(form.qty);
  const isFormValid =
    trimmedName.length > 0 &&
    trimmedBarcode.length > 0 &&
    Number.isFinite(priceValue) &&
    priceValue > 0 &&
    Number.isFinite(qtyValue) &&
    qtyValue >= 0 &&
    form.category_id !== "";

  const loadData = async (pageNumber = page, searchTerm = search) => {
    const trimmedSearch = searchTerm.trim();
    const [productResult, categoryRows] = await Promise.all([
      window.api.listProducts({
        search: trimmedSearch.length > 0 ? trimmedSearch : null,
        category_id: null,
        page: pageNumber,
        pageSize
      }),
      window.api.listCategories()
    ]);
    const result = productResult as PagedResult<Product>;
    setProducts(result.rows);
    setTotal(result.total);
    setCategories(categoryRows);
  };

  useEffect(() => {
    loadData(1);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      barcodeInputRef.current?.focus();
    }
  }, [isModalOpen]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    loadData(1, search);
  };

  const resetSearch = () => {
    setSearch("");
    setPage(1);
    loadData(1, "");
  };

  const resetForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setError("");
    setIsModalOpen(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      name: trimmedName,
      barcode: trimmedBarcode || null,
      price: priceValue,
      qty: qtyValue,
      category_id: form.category_id ? Number(form.category_id) : null
    };

    if (!payload.name) {
      const message = "Nama produk wajib diisi.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      const message = "Harga harus lebih dari 0.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!Number.isFinite(payload.qty) || payload.qty < 0) {
      const message = "Jumlah produk tidak boleh negatif.";
      setError(message);
      toast.error(message);
      return;
    }

    if (payload.barcode) {
      const lookup = await window.api.listProducts({
        search: payload.barcode,
        category_id: null,
        page: 1,
        pageSize: 20
      });
      const existing = lookup.rows.find(
        (product) =>
          product.barcode === payload.barcode &&
          (!isEditing || product.id !== form.id)
      );
      if (existing) {
        const message = "Barcode sudah digunakan.";
        setError(message);
        toast.error(message);
        return;
      }
    }

    try {
      if (isEditing) {
        await window.api.updateProduct({ id: form.id, ...payload });
      } else {
        await window.api.createProduct(payload);
      }
      await loadData(1);
      resetForm();
      toast.success(
        isEditing ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan."
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menyimpan produk.";
      setError(message);
      toast.error(message);
    }
  };

  const handleEdit = (product: Product) => {
    setForm({
      id: product.id,
      name: product.name,
      barcode: product.barcode ?? "",
      price: String(product.price),
      qty: String(product.qty ?? 0),
      category_id: product.category_id ? String(product.category_id) : ""
    });
    setIsEditing(true);
    setIsModalOpen(true);
    setError("");
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus produk ini?")) {
      return;
    }
    try {
      await window.api.deleteProduct(id);
      await loadData(page);
      toast.success("Produk berhasil dihapus.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menghapus produk.";
      setError(message);
      toast.error(message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Produk</h1>
          <p className="text-sm text-slate-500">
            Pengelolaan produk dengan scan barcode.
          </p>
        </div>
        <button
          type="button"
          className="h-12 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white"
          onClick={() => {
            setForm(emptyForm);
            setIsEditing(false);
            setError("");
            setIsModalOpen(true);
          }}
        >
          Tambah Produk
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">Daftar Produk</h2>
        <form
          onSubmit={handleSearch}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[220px] space-y-1">
            <label className="block text-xs text-slate-500">
              Cari produk atau barcode
            </label>
            <input
              className="w-full h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
              placeholder="Nama produk / barcode"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-12 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white"
            >
              Cari
            </button>
            <button
              type="button"
              onClick={resetSearch}
              className="h-12 rounded-lg border border-slate-300 px-4 text-sm"
            >
              Reset
            </button>
          </div>
        </form>
        <div className="space-y-3">
          {products.length === 0 ? (
            <p className="text-sm text-slate-500">
              {search.trim()
                ? "Produk tidak ditemukan."
                : "Belum ada produk."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Barcode</th>
                    <th className="px-4 py-3 font-semibold">Produk</th>
                    <th className="px-4 py-3 font-semibold">Kategori</th>
                    <th className="px-4 py-3 font-semibold">Harga</th>
                    <th className="px-4 py-3 font-semibold">Stok</th>
                    <th className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">
                        <BarcodePreview value={product.barcode} />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {product.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {product.category_name ?? "Tanpa kategori"}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatRupiah(product.price)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {product.qty ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            className="text-emerald-600"
                            onClick={() => handleEdit(product)}
                            aria-label={`Edit ${product.name}`}
                            title="Edit"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="text-rose-400"
                            onClick={() => handleDelete(product.id)}
                            aria-label={`Hapus ${product.name}`}
                            title="Hapus"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M6 6l1 14h10l1-14" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
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
                loadData(next);
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
                loadData(next);
              }}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={resetForm}
            aria-label="Tutup modal"
          />
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">
              {isEditing ? "Edit Produk" : "Tambah Produk"}
            </h2>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-6 gap-4 text-sm"
            >
              <div className="col-span-3 space-y-1">
                <label className="block text-xs text-slate-500">
                  Nama produk <span className="text-rose-600">*</span>
                </label>
                <input
                  className="w-full h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
                  placeholder="Nama produk"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              <div className="col-span-3 space-y-1">
                <label className="block text-xs text-slate-500">
                  Barcode <span className="text-rose-600">*</span>
                </label>
                <input
                  ref={barcodeInputRef}
                  className="w-full h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
                  placeholder="Barcode"
                  value={form.barcode}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      barcode: event.target.value
                    }))
                  }
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="block text-xs text-slate-500">
                  Harga <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
                  placeholder="Harga"
                  value={formatRupiahInput(form.price)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      price: parseRupiahInput(event.target.value)
                    }))
                  }
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="block text-xs text-slate-500">
                  Jumlah <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  className="w-full h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
                  placeholder="Jumlah"
                  value={form.qty}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      qty: event.target.value
                    }))
                  }
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="block text-xs text-slate-500">
                  Kategori <span className="text-rose-600">*</span>
                </label>
                <select
                  className="w-full h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
                  value={form.category_id}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      category_id: event.target.value
                    }))
                  }
                >
                  <option value="">Tanpa kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-6 flex gap-3">
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className="flex-1 h-12 rounded-lg bg-emerald-500 text-white text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEditing ? "Simpan Perubahan" : "Tambah Produk"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 h-12 rounded-lg border border-slate-300 text-sm text-slate-700"
                >
                  Batal
                </button>
              </div>
            </form>
            {/* {error && <p className="text-sm text-amber-600 mt-3">{error}</p>} */}
          </div>
        </div>
      )}
    </>
  );
}
