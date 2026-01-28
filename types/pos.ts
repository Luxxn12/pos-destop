export type TransactionItemPayload = {
  name: string;
  qty: number;
  price: number;
  product_id?: number | null;
};

export type SaveTransactionPayload = {
  items: TransactionItemPayload[];
  total: number;
};

export type Transaction = {
  id: number;
  subtotal?: number;
  tax_amount?: number;
  total: number;
  created_at: string;
};

export type TransactionItem = {
  id: number;
  transaction_id: number;
  name: string;
  qty: number;
  price: number;
  line_total: number;
  product_id: number | null;
};

export type TransactionDetail = {
  transaction: Transaction;
  items: TransactionItem[];
};

export type Category = {
  id: number;
  name: string;
  created_at: string;
};

export type Product = {
  id: number;
  name: string;
  barcode: string | null;
  price: number;
  qty: number;
  category_id: number | null;
  category_name?: string | null;
  created_at: string;
};

export type DashboardSummary = {
  transactions_today: number;
  revenue_today: number;
  products_count: number;
};

export type ReportSummary = {
  total_revenue: number;
  total_transactions: number;
  average_transaction: number;
};

export type ReportSeriesBucket = {
  bucket: string;
  total: number;
};

export type ReportSeriesQuery = {
  filter?: DateRangeFilter;
  groupBy: "day" | "hour";
};

export type DateRangeFilter = {
  from?: string | null;
  to?: string | null;
};

export type ProductQuery = {
  search?: string | null;
  category_id?: number | null;
  page?: number;
  pageSize?: number;
};

export type PagedResult<T> = {
  rows: T[];
  total: number;
};

export type StoreSettings = {
  store_name: string;
  store_address: string;
  store_phone: string;
  tax_enabled: number;
  tax_rate: number;
  receipt_header: string;
  receipt_footer: string;
};

export const IPCChannels = {
  saveTransaction: "pos:save-transaction",
  listTransactions: "pos:list-transactions",
  getTransactionDetail: "pos:get-transaction-detail",
  printReceipt: "pos:print-receipt",
  listCategories: "pos:list-categories",
  createCategory: "pos:create-category",
  updateCategory: "pos:update-category",
  deleteCategory: "pos:delete-category",
  listProducts: "pos:list-products",
  createProduct: "pos:create-product",
  updateProduct: "pos:update-product",
  deleteProduct: "pos:delete-product",
  getDashboardSummary: "pos:get-dashboard-summary",
  getReportSummary: "pos:get-report-summary",
  getReportSeries: "pos:get-report-series",
  exportTransactions: "pos:export-transactions",
  getSettings: "pos:get-settings",
  updateSettings: "pos:update-settings"
} as const;

export type IPCChannel = (typeof IPCChannels)[keyof typeof IPCChannels];
