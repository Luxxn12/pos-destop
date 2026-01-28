"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = exports.initDb = exports.ensureTransactionCodeColumn = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const electron_1 = require("electron");
let db = null;
const createSchema = (database) => {
    database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT,
      price INTEGER NOT NULL,
      qty INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      subtotal INTEGER,
      tax_amount INTEGER,
      total INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      product_id INTEGER,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price INTEGER NOT NULL,
      line_total INTEGER NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      store_name TEXT NOT NULL DEFAULT 'SmartPOS',
      store_address TEXT NOT NULL DEFAULT '',
      store_phone TEXT NOT NULL DEFAULT '',
      tax_enabled INTEGER NOT NULL DEFAULT 0,
      tax_rate INTEGER NOT NULL DEFAULT 10,
      receipt_header TEXT NOT NULL DEFAULT 'Struk',
      receipt_footer TEXT NOT NULL DEFAULT 'Terima kasih'
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_code_unique ON transactions(code) WHERE code IS NOT NULL AND code != '';
    CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique ON products(barcode) WHERE barcode IS NOT NULL AND barcode != '';
  `);
};
const ensureColumn = (database, table, column, definition) => {
    const cols = database.pragma(`table_info(${table})`);
    const exists = cols.some((col) => col.name === column);
    if (!exists) {
        database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
};
const ensureTransactionCodeColumn = (database) => {
    ensureColumn(database, "transactions", "code", "TEXT");
    database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_code_unique ON transactions(code) WHERE code IS NOT NULL AND code != ''");
};
exports.ensureTransactionCodeColumn = ensureTransactionCodeColumn;
const initDb = () => {
    if (db)
        return db;
    const userDataPath = electron_1.app.getPath("userData");
    fs_1.default.mkdirSync(userDataPath, { recursive: true });
    const dbPath = path_1.default.join(userDataPath, "pos.db");
    db = new better_sqlite3_1.default(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    createSchema(db);
    ensureColumn(db, "transactions", "subtotal", "INTEGER");
    ensureColumn(db, "transactions", "tax_amount", "INTEGER");
    (0, exports.ensureTransactionCodeColumn)(db);
    ensureColumn(db, "transaction_items", "product_id", "INTEGER");
    ensureColumn(db, "products", "barcode", "TEXT");
    ensureColumn(db, "products", "qty", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn(db, "settings", "receipt_header", "TEXT NOT NULL DEFAULT 'Struk'");
    db.exec("UPDATE settings SET receipt_header = 'Struk' WHERE receipt_header IS NULL");
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique ON products(barcode) WHERE barcode IS NOT NULL AND barcode != ''");
    db.exec("INSERT OR IGNORE INTO settings (id) VALUES (1);");
    return db;
};
exports.initDb = initDb;
const getDb = () => {
    if (!db) {
        return (0, exports.initDb)();
    }
    return db;
};
exports.getDb = getDb;
