"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Category, PagedResult, Product } from "../../types/pos";
import toast from "react-hot-toast";

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [error, setError] = useState("");

  const loadData = async (pageNumber = page) => {
    const [productResult, categoryRows] = await Promise.all([
      window.api.listProducts({
        search: null,
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

  const resetForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setError("");
    setIsModalOpen(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      price: form.price === "" ? NaN : Number(form.price),
      qty: form.qty === "" ? NaN : Number(form.qty),
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
          <p className="text-sm text-slate-400">
            CRUD produk terhubung ke SQLite. Barcode siap untuk scan.
          </p>
        </div>
        <button
          type="button"
          className="h-12 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-slate-950"
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

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Daftar Produk</h2>
        <div className="space-y-3">
          {products.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada produk.</p>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-slate-400">
                    {product.category_name ?? "Tanpa kategori"} •
                    {product.barcode ? ` ${product.barcode}` : " -"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatRupiah(product.price)}
                  </p>
                  <p className="text-xs text-slate-400">Stok: {product.qty}</p>
                  <div className="flex gap-3 text-xs">
                    <button
                      className="text-emerald-400"
                      onClick={() => handleEdit(product)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-rose-400"
                      onClick={() => handleDelete(product.id)}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
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
                loadData(next);
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
            className="absolute inset-0 bg-black/70"
            onClick={resetForm}
            aria-label="Tutup modal"
          />
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {isEditing ? "Edit Produk" : "Tambah Produk"}
            </h2>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-6 gap-4 text-sm"
            >
              <div className="col-span-3 space-y-1">
                <label className="block text-xs text-slate-400">
                  Nama produk
                </label>
                <input
                  className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
                  placeholder="Nama produk"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              <div className="col-span-3 space-y-1">
                <label className="block text-xs text-slate-400">Barcode</label>
                <input
                  className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
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
                <label className="block text-xs text-slate-400">Harga</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
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
                <label className="block text-xs text-slate-400">Jumlah</label>
                <input
                  type="number"
                  className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
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
                <label className="block text-xs text-slate-400">Kategori</label>
                <select
                  className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
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
                  className="flex-1 h-12 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold"
                >
                  {isEditing ? "Simpan Perubahan" : "Tambah Produk"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 h-12 rounded-lg border border-slate-600 text-sm text-slate-200"
                >
                  Batal
                </button>
              </div>
            </form>
            {error && <p className="text-sm text-amber-300 mt-3">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
