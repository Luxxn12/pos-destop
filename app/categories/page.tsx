"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Category } from "../../types/pos";
import toast from "react-hot-toast";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");

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
          <p className="text-sm text-slate-400">
            CRUD kategori produk untuk POS.
          </p>
        </div>
        <button
          type="button"
          className="h-12 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-slate-950"
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

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold mb-4">Daftar Kategori</h2>
        <div className="space-y-3">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada kategori.</p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{category.name}</p>
                  <p className="text-xs text-slate-400">{category.created_at}</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <button
                    className="text-emerald-400"
                    onClick={() => handleEdit(category)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-rose-400"
                    onClick={() => handleDelete(category.id)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              setEditing(null);
              setName("");
              setError("");
              setIsModalOpen(false);
            }}
            aria-label="Tutup modal"
          />
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Edit Kategori" : "Tambah Kategori"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs text-slate-400">
                  Nama kategori
                </label>
                <input
                  className="w-full h-12 rounded-lg bg-slate-950 border border-slate-700 px-4 text-sm"
                  placeholder="Nama kategori"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-slate-950"
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
                  className="flex-1 h-12 rounded-lg border border-slate-600 px-4 text-sm text-slate-200"
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
