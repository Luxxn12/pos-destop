"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Category } from "../../types/pos";
import toast from "react-hot-toast";
import { formatDateTimeDDMMYYYY } from "@/lib/date";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const trimmedName = name.trim();
  const isFormValid = trimmedName.length > 0;

  const loadCategories = async () => {
    if (!window.api?.listCategories) {
      const message = "API belum siap. Jalankan dari aplikasi desktop.";
      setError(message);
      toast.error(message);
      return;
    }
    const rows = await window.api.listCategories();
    setCategories(rows);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const totalPages = Math.max(1, Math.ceil(categories.length / pageSize));
  const pagedCategories = categories.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!window.api?.createCategory || !window.api?.updateCategory) {
      const message = "API belum siap. Jalankan dari aplikasi desktop.";
      setError(message);
      toast.error(message);
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      const message = "Nama kategori wajib diisi.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      if (editing) {
        await window.api.updateCategory({ id: editing.id, name: trimmed });
      } else {
        await window.api.createCategory({ name: trimmed });
      }
      setName("");
      setEditing(null);
      setError("");
      setIsModalOpen(false);
      await loadCategories();
      toast.success(
        editing ? "Kategori berhasil diperbarui." : "Kategori berhasil ditambahkan."
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menyimpan kategori.";
      setError(message);
      toast.error(message);
    }
  };

  const handleEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setError("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.api?.deleteCategory) {
      const message = "API belum siap. Jalankan dari aplikasi desktop.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!window.confirm("Hapus kategori ini?")) {
      return;
    }
    try {
      await window.api.deleteCategory(id);
      await loadCategories();
      toast.success("Kategori berhasil dihapus.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menghapus kategori.";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kategori</h1>
          <p className="text-sm text-slate-500">
            Pengelolaan kategori produk.
          </p>
        </div>
        <button
          type="button"
          className="h-12 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white"
          onClick={() => {
            setEditing(null);
            setName("");
            setError("");
            setIsModalOpen(true);
          }}
        >
          Tambah Kategori
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Daftar Kategori</h2>
        <div className="space-y-3">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada kategori.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nama</th>
                    <th className="px-4 py-3 font-semibold">Dibuat</th>
                    <th className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {pagedCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {category.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDateTimeDDMMYYYY(category.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            className="text-emerald-600"
                            onClick={() => handleEdit(category)}
                            aria-label={`Edit ${category.name}`}
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
                            onClick={() => handleDelete(category.id)}
                            aria-label={`Hapus ${category.name}`}
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
        {categories.length > 0 && (
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
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setEditing(null);
              setName("");
              setError("");
              setIsModalOpen(false);
            }}
            aria-label="Tutup modal"
          />
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Edit Kategori" : "Tambah Kategori"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs text-slate-500">
                  Nama kategori <span className="text-rose-600">*</span>
                </label>
                <input
                  className="w-full h-12 rounded-lg bg-white border border-slate-300 px-4 text-sm"
                  placeholder="Nama kategori"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className="flex-1 h-12 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editing ? "Simpan" : "Tambah"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setName("");
                    setError("");
                    setIsModalOpen(false);
                  }}
                  className="flex-1 h-12 rounded-lg border border-slate-300 px-4 text-sm text-slate-700"
                >
                  Batal
                </button>
              </div>
            </form>
            {error && <p className="text-sm text-amber-600 mt-3">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
