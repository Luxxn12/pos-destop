"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPosIpc = void 0;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const index_1 = require("../db/index");
const channels_1 = require("./channels");
const date_1 = require("../../lib/date");
const isValidPayload = (payload) => {
    if (!payload || !Array.isArray(payload.items))
        return false;
    return payload.items.every((item) => {
        return (typeof item.name === "string" &&
            item.name.length > 0 &&
            Number.isFinite(item.qty) &&
            item.qty > 0 &&
            Number.isFinite(item.price) &&
            item.price >= 0);
    });
};
const buildDateFilter = (filter) => {
    if (!filter || (!filter.from && !filter.to)) {
        return { clause: "", params: [] };
    }
    const clauses = [];
    const params = [];
    if (filter.from) {
        clauses.push("datetime(created_at) >= datetime(?)");
        params.push(filter.from);
    }
    if (filter.to) {
        clauses.push("datetime(created_at) <= datetime(?)");
        params.push(filter.to);
    }
    return {
        clause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
        params
    };
};
const ensureNonEmpty = (value, message) => {
    const trimmed = value.trim();
    if (!trimmed)
        throw new Error(message);
    return trimmed;
};
const formatCurrency = (value) => new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
}).format(value);
const buildTransactionCodePrefix = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};
const generateTransactionCode = (db) => {
    const prefix = buildTransactionCodePrefix(new Date());
    const exists = db.prepare("SELECT 1 FROM transactions WHERE code = ? LIMIT 1");
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const random = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, "0");
        const code = `${prefix}${random}`;
        const row = exists.get(code);
        if (!row)
            return code;
    }
    const fallback = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0");
    return `${prefix}${fallback}`;
};
const buildReceiptHtml = (settings, detail) => {
    const displayId = detail.transaction.code ?? detail.transaction.id;
    const lines = detail.items
        .map((item) => `
        <div class="row">
          <span>${item.name} x${item.qty}</span>
          <span>${formatCurrency(item.line_total)}</span>
        </div>
      `)
        .join("");
    return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: monospace; padding: 12px; color: #111; }
        h1 { font-size: 16px; margin: 0; text-align: center; }
        h2 { font-size: 13px; margin: 2px 0 6px; text-align: center; letter-spacing: 1px; }
        .muted { font-size: 11px; text-align: center; color: #555; }
        .divider { border-top: 1px dashed #666; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; font-size: 12px; margin: 2px 0; }
        .total { font-weight: bold; font-size: 13px; }
        .footer { margin-top: 10px; text-align: center; font-size: 11px; }
      </style>
    </head>
    <body>
      <h1>${settings.store_name}</h1>
      <div class="muted">${settings.store_address}</div>
      <div class="muted">${settings.store_phone}</div>
      <h2>${settings.receipt_header}</h2>
      <div class="divider"></div>
      <div class="row"><span>Transaksi #${displayId}</span><span>${(0, date_1.formatDateTimeDDMMYYYY)(detail.transaction.created_at)}</span></div>
      <div class="divider"></div>
      ${lines}
      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>${formatCurrency(detail.transaction.subtotal ?? detail.transaction.total)}</span></div>
      <div class="row"><span>PPN ${settings.tax_enabled === 1 ? `(${settings.tax_rate ?? 0}%)` : "(Nonaktif)"}</span><span>${formatCurrency(detail.transaction.tax_amount ?? 0)}</span></div>
      <div class="row total"><span>Total</span><span>${formatCurrency(detail.transaction.total)}</span></div>
      <div class="divider"></div>
      <div class="footer">${settings.receipt_footer}</div>
    </body>
  </html>
  `;
};
const getTransactionDetailById = (db, id) => {
    const transaction = db
        .prepare("SELECT id, code, subtotal, tax_amount, total, created_at FROM transactions WHERE id = ?")
        .get(id);
    if (!transaction)
        return null;
    const items = db
        .prepare("SELECT id, transaction_id, product_id, name, qty, price, line_total FROM transaction_items WHERE transaction_id = ?")
        .all(id);
    return { transaction, items };
};
const getTransactionDetailByCode = (db, code) => {
    const normalized = code.trim();
    if (!normalized)
        return null;
    const transaction = db
        .prepare("SELECT id, code, subtotal, tax_amount, total, created_at FROM transactions WHERE code = ?")
        .get(normalized);
    if (!transaction)
        return null;
    const items = db
        .prepare("SELECT id, transaction_id, product_id, name, qty, price, line_total FROM transaction_items WHERE transaction_id = ?")
        .all(transaction.id);
    return { transaction, items };
};
const registerPosIpc = () => {
    (0, index_1.ensureTransactionCodeColumn)((0, index_1.getDb)());
    electron_1.ipcMain.handle(channels_1.IPCChannels.saveTransaction, (_event, payload) => {
        if (!isValidPayload(payload)) {
            throw new Error("Invalid payload");
        }
        const db = (0, index_1.getDb)();
        const settings = db
            .prepare("SELECT store_name, store_address, store_phone, tax_enabled, tax_rate, receipt_header, receipt_footer FROM settings WHERE id = 1")
            .get();
        const insertTransaction = db.prepare("INSERT INTO transactions (code, subtotal, tax_amount, total) VALUES (?, ?, ?, ?)");
        const insertItem = db.prepare("INSERT INTO transaction_items (transaction_id, product_id, name, qty, price, line_total) VALUES (?, ?, ?, ?, ?, ?)");
        const selectProductQty = db.prepare("SELECT qty FROM products WHERE id = ?");
        const updateProductQty = db.prepare("UPDATE products SET qty = ? WHERE id = ?");
        const transactionFn = db.transaction((data) => {
            const subtotal = data.items.reduce((sum, item) => sum + Math.round(item.qty * item.price), 0);
            const taxEnabled = settings.tax_enabled === 1;
            const taxAmount = taxEnabled
                ? Math.round((subtotal * settings.tax_rate) / 100)
                : 0;
            const total = subtotal + taxAmount;
            const transactionCode = generateTransactionCode(db);
            const result = insertTransaction.run(transactionCode, subtotal, taxAmount, total);
            const transactionId = Number(result.lastInsertRowid);
            for (const item of data.items) {
                if (item.product_id != null) {
                    const row = selectProductQty.get(item.product_id);
                    if (!row) {
                        throw new Error("Produk tidak ditemukan.");
                    }
                    const requestedQty = Math.round(item.qty);
                    const nextQty = row.qty - requestedQty;
                    if (nextQty < 0) {
                        throw new Error(`Stok ${item.name} tidak cukup.`);
                    }
                    updateProductQty.run(nextQty, item.product_id);
                }
                const lineTotal = Math.round(item.qty * item.price);
                insertItem.run(transactionId, item.product_id ?? null, item.name, Math.round(item.qty), Math.round(item.price), lineTotal);
            }
            return { id: transactionId, code: transactionCode };
        });
        return transactionFn(payload);
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.listTransactions, (_event, payload) => {
        const db = (0, index_1.getDb)();
        const { clause, params } = buildDateFilter(payload);
        const page = payload?.page && payload.page > 0 ? payload.page : 1;
        const pageSize = payload?.pageSize && payload.pageSize > 0 ? payload.pageSize : 20;
        const offset = (page - 1) * pageSize;
        const totalRow = db
            .prepare(`SELECT COUNT(*) as total FROM transactions ${clause}`)
            .get(...params);
        const rows = db
            .prepare(`SELECT id, code, subtotal, tax_amount, total, created_at FROM transactions ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`)
            .all(...params, pageSize, offset);
        const result = {
            rows,
            total: totalRow.total ?? 0
        };
        return result;
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.getTransactionDetail, (_event, id) => {
        const db = (0, index_1.getDb)();
        return getTransactionDetailById(db, id);
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.getTransactionDetailByCode, (_event, code) => {
        const db = (0, index_1.getDb)();
        return getTransactionDetailByCode(db, code);
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.printReceipt, async (event, id) => {
        const db = (0, index_1.getDb)();
        const detail = getTransactionDetailById(db, id);
        if (!detail)
            return false;
        const settings = db
            .prepare("SELECT store_name, store_address, store_phone, tax_enabled, tax_rate, receipt_header, receipt_footer FROM settings WHERE id = 1")
            .get();
        const receiptHtml = buildReceiptHtml(settings, detail);
        const printWindow = new electron_1.BrowserWindow({
            width: 320,
            height: 600,
            show: false,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true
            }
        });
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`);
        return new Promise((resolve) => {
            printWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
                if (!success) {
                    console.error("Print gagal:", failureReason);
                }
                printWindow.close();
                resolve(success);
            });
        });
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.printReceiptByCode, async (event, code) => {
        const db = (0, index_1.getDb)();
        const detail = getTransactionDetailByCode(db, code);
        if (!detail)
            return false;
        const settings = db
            .prepare("SELECT store_name, store_address, store_phone, tax_enabled, tax_rate, receipt_header, receipt_footer FROM settings WHERE id = 1")
            .get();
        const receiptHtml = buildReceiptHtml(settings, detail);
        const printWindow = new electron_1.BrowserWindow({
            width: 320,
            height: 600,
            show: false,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true
            }
        });
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`);
        return new Promise((resolve) => {
            printWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
                if (!success) {
                    console.error("Print gagal:", failureReason);
                }
                printWindow.close();
                resolve(success);
            });
        });
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.listCategories, () => {
        const db = (0, index_1.getDb)();
        const rows = db
            .prepare("SELECT id, name, created_at FROM categories ORDER BY name ASC")
            .all();
        return rows;
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.createCategory, (_event, payload) => {
        const db = (0, index_1.getDb)();
        const name = ensureNonEmpty(payload.name, "Nama kategori wajib diisi");
        const existing = db
            .prepare("SELECT id FROM categories WHERE lower(name) = lower(?)")
            .get(name);
        if (existing) {
            throw new Error("Nama kategori sudah digunakan");
        }
        const result = db
            .prepare("INSERT INTO categories (name) VALUES (?)")
            .run(name);
        return Number(result.lastInsertRowid);
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.updateCategory, (_event, payload) => {
        const db = (0, index_1.getDb)();
        const name = ensureNonEmpty(payload.name, "Nama kategori wajib diisi");
        const existing = db
            .prepare("SELECT id FROM categories WHERE lower(name) = lower(?) AND id != ?")
            .get(name, payload.id);
        if (existing) {
            throw new Error("Nama kategori sudah digunakan");
        }
        const result = db
            .prepare("UPDATE categories SET name = ? WHERE id = ?")
            .run(name, payload.id);
        return result.changes > 0;
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.deleteCategory, (_event, id) => {
        const db = (0, index_1.getDb)();
        const result = db.prepare("DELETE FROM categories WHERE id = ?").run(id);
        return result.changes > 0;
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.listProducts, (_event, query) => {
        const db = (0, index_1.getDb)();
        const page = query?.page && query.page > 0 ? query.page : 1;
        const pageSize = query?.pageSize && query.pageSize > 0 ? query.pageSize : 10;
        const offset = (page - 1) * pageSize;
        const filters = [];
        const params = [];
        if (query?.search) {
            filters.push("(products.name LIKE ? OR products.barcode LIKE ?)");
            const term = `%${query.search}%`;
            params.push(term, term);
        }
        if (query?.category_id) {
            filters.push("products.category_id = ?");
            params.push(query.category_id);
        }
        const clause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
        const totalRow = db
            .prepare(`SELECT COUNT(*) as total FROM products ${clause}`)
            .get(...params);
        const rows = db
            .prepare(`SELECT products.id, products.name, products.barcode, products.price, products.qty,
                products.category_id, categories.name as category_name, products.created_at
         FROM products
         LEFT JOIN categories ON products.category_id = categories.id
         ${clause}
         ORDER BY products.id DESC
         LIMIT ? OFFSET ?`)
            .all(...params, pageSize, offset);
        const result = {
            rows,
            total: totalRow.total ?? 0
        };
        return result;
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.createProduct, (_event, payload) => {
        const db = (0, index_1.getDb)();
        const name = ensureNonEmpty(payload.name, "Nama produk wajib diisi");
        if (!Number.isFinite(payload.price) || payload.price <= 0) {
            throw new Error("Harga harus lebih dari 0");
        }
        if (!Number.isFinite(payload.qty ?? 0) || (payload.qty ?? 0) < 0) {
            throw new Error("Jumlah produk tidak boleh negatif");
        }
        const nameExists = db
            .prepare("SELECT id FROM products WHERE lower(name) = lower(?)")
            .get(name);
        if (nameExists) {
            throw new Error("Nama produk sudah digunakan");
        }
        const barcode = payload.barcode?.trim() || null;
        if (barcode) {
            const barcodeExists = db
                .prepare("SELECT id FROM products WHERE barcode = ?")
                .get(barcode);
            if (barcodeExists) {
                throw new Error("Barcode sudah digunakan");
            }
        }
        const result = db
            .prepare("INSERT INTO products (name, barcode, price, qty, category_id) VALUES (?, ?, ?, ?, ?)")
            .run(name, barcode, Math.round(payload.price), Math.round(payload.qty ?? 0), payload.category_id ?? null);
        return Number(result.lastInsertRowid);
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.updateProduct, (_event, payload) => {
        const db = (0, index_1.getDb)();
        const name = ensureNonEmpty(payload.name, "Nama produk wajib diisi");
        if (!Number.isFinite(payload.price) || payload.price <= 0) {
            throw new Error("Harga harus lebih dari 0");
        }
        if (!Number.isFinite(payload.qty ?? 0) || (payload.qty ?? 0) < 0) {
            throw new Error("Jumlah produk tidak boleh negatif");
        }
        const nameExists = db
            .prepare("SELECT id FROM products WHERE lower(name) = lower(?) AND id != ?")
            .get(name, payload.id);
        if (nameExists) {
            throw new Error("Nama produk sudah digunakan");
        }
        const barcode = payload.barcode?.trim() || null;
        if (barcode) {
            const barcodeExists = db
                .prepare("SELECT id FROM products WHERE barcode = ? AND id != ?")
                .get(barcode, payload.id);
            if (barcodeExists) {
                throw new Error("Barcode sudah digunakan");
            }
        }
        const result = db
            .prepare("UPDATE products SET name = ?, barcode = ?, price = ?, qty = ?, category_id = ? WHERE id = ?")
            .run(name, barcode, Math.round(payload.price), Math.round(payload.qty ?? 0), payload.category_id ?? null, payload.id);
        return result.changes > 0;
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.deleteProduct, (_event, id) => {
        const db = (0, index_1.getDb)();
        const result = db.prepare("DELETE FROM products WHERE id = ?").run(id);
        return result.changes > 0;
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.getDashboardSummary, () => {
        const db = (0, index_1.getDb)();
        const LOW_STOCK_THRESHOLD = 5;
        const todayRow = db
            .prepare(`SELECT COUNT(*) as transactions_today, COALESCE(SUM(total), 0) as revenue_today
         FROM transactions
         WHERE date(created_at) = date('now')`)
            .get();
        const productsRow = db
            .prepare("SELECT COUNT(*) as products_count FROM products")
            .get();
        const topProducts = db
            .prepare(`SELECT name, COALESCE(SUM(qty), 0) as qty_sold
         FROM transaction_items
         WHERE transaction_id IN (
           SELECT id FROM transactions WHERE date(created_at) = date('now')
         )
         GROUP BY name
         ORDER BY qty_sold DESC, name ASC
         LIMIT 5`)
            .all();
        const lowStockCountRow = db
            .prepare("SELECT COUNT(*) as low_stock_count FROM products WHERE qty <= ?")
            .get(LOW_STOCK_THRESHOLD);
        const lowStockItems = db
            .prepare(`SELECT id, name, qty
         FROM products
         WHERE qty <= ?
         ORDER BY qty ASC, name ASC
         LIMIT 5`)
            .all(LOW_STOCK_THRESHOLD);
        return {
            transactions_today: todayRow.transactions_today ?? 0,
            revenue_today: todayRow.revenue_today ?? 0,
            products_count: productsRow.products_count ?? 0,
            top_products: topProducts.map((item) => ({
                name: item.name,
                qty_sold: item.qty_sold ?? 0
            })),
            low_stock_count: lowStockCountRow.low_stock_count ?? 0,
            low_stock_items: lowStockItems.map((item) => ({
                id: item.id,
                name: item.name,
                qty: item.qty ?? 0
            })),
            low_stock_threshold: LOW_STOCK_THRESHOLD
        };
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.getReportSummary, (_event, filter) => {
        const db = (0, index_1.getDb)();
        const { clause, params } = buildDateFilter(filter);
        const row = db
            .prepare(`SELECT COALESCE(SUM(total), 0) as total_revenue,
                  COUNT(*) as total_transactions,
                  COALESCE(AVG(total), 0) as average_transaction
           FROM transactions ${clause}`)
            .get(...params);
        return {
            total_revenue: row.total_revenue ?? 0,
            total_transactions: row.total_transactions ?? 0,
            average_transaction: row.average_transaction ?? 0
        };
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.getReportSeries, (_event, payload) => {
        const db = (0, index_1.getDb)();
        const { clause, params } = buildDateFilter(payload?.filter);
        const groupExpr = payload?.groupBy === "hour"
            ? "printf('%02d', strftime('%H', created_at))"
            : "date(created_at)";
        const rows = db
            .prepare(`SELECT ${groupExpr} as bucket, SUM(total) as total
           FROM transactions
           ${clause}
           GROUP BY bucket
           ORDER BY bucket ASC`)
            .all(...params);
        return rows.map((row) => ({
            bucket: String(row.bucket),
            total: row.total ?? 0
        }));
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.exportTransactions, async (event, filter) => {
        const db = (0, index_1.getDb)();
        const { clause, params } = buildDateFilter(filter);
        const rows = db
            .prepare(`SELECT id, code, subtotal, tax_amount, total, created_at FROM transactions ${clause} ORDER BY id DESC`)
            .all(...params);
        const csvLines = ["id,code,subtotal,tax_amount,total,created_at"];
        for (const row of rows) {
            csvLines.push(`${row.id},${row.code ?? ""},${row.subtotal ?? 0},${row.tax_amount ?? 0},${row.total},${row.created_at}`);
        }
        const win = electron_1.BrowserWindow.fromWebContents(event.sender);
        const dialogOptions = {
            title: "Export Transaksi",
            defaultPath: "transactions.csv",
            filters: [{ name: "CSV", extensions: ["csv"] }]
        };
        const result = win
            ? await electron_1.dialog.showSaveDialog(win, dialogOptions)
            : await electron_1.dialog.showSaveDialog(dialogOptions);
        if (result.canceled || !result.filePath)
            return null;
        fs_1.default.writeFileSync(result.filePath, csvLines.join("\n"), "utf8");
        return result.filePath;
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.getSettings, () => {
        const db = (0, index_1.getDb)();
        const settings = db
            .prepare("SELECT store_name, store_address, store_phone, tax_enabled, tax_rate, receipt_header, receipt_footer FROM settings WHERE id = 1")
            .get();
        return {
            ...settings,
            receipt_header: settings?.receipt_header ?? "",
            receipt_footer: settings?.receipt_footer ?? ""
        };
    });
    electron_1.ipcMain.handle(channels_1.IPCChannels.updateSettings, (_event, payload) => {
        const db = (0, index_1.getDb)();
        const result = db
            .prepare(`UPDATE settings
         SET store_name = ?, store_address = ?, store_phone = ?, tax_enabled = ?, tax_rate = ?, receipt_header = ?, receipt_footer = ?
         WHERE id = 1`)
            .run(ensureNonEmpty(payload.store_name, "Nama toko wajib diisi"), payload.store_address ?? "", payload.store_phone ?? "", payload.tax_enabled ? 1 : 0, Math.max(0, Math.round(payload.tax_rate ?? 0)), payload.receipt_header ?? "", payload.receipt_footer ?? "");
        return result.changes > 0;
    });
};
exports.registerPosIpc = registerPosIpc;
