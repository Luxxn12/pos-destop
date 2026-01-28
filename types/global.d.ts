import type {
  Category,
  DashboardSummary,
  DateRangeFilter,
  Product,
  ProductQuery,
  PagedResult,
  ReportSeriesBucket,
  ReportSeriesQuery,
  ReportSummary,
  SaveTransactionPayload,
  SavedTransactionResult,
  StoreSettings,
  Transaction,
  TransactionDetail
} from "./pos";

declare global {
  interface Window {
    api: {
      saveTransaction: (payload: SaveTransactionPayload) => Promise<SavedTransactionResult>;
      listTransactions: (payload?: DateRangeFilter & { page?: number; pageSize?: number }) => Promise<PagedResult<Transaction>>;
      getTransactionDetail: (id: number) => Promise<TransactionDetail | null>;
      getTransactionDetailByCode: (code: string) => Promise<TransactionDetail | null>;
      printReceipt: (transactionId: number) => Promise<boolean>;
      printReceiptByCode: (code: string) => Promise<boolean>;
      listCategories: () => Promise<Category[]>;
      createCategory: (payload: { name: string }) => Promise<number>;
      updateCategory: (payload: { id: number; name: string }) => Promise<boolean>;
      deleteCategory: (id: number) => Promise<boolean>;
      listProducts: (query?: ProductQuery) => Promise<PagedResult<Product>>;
      createProduct: (payload: {
        name: string;
        barcode?: string | null;
        price: number;
        qty?: number;
        category_id?: number | null;
      }) => Promise<number>;
      updateProduct: (payload: {
        id: number;
        name: string;
        barcode?: string | null;
        price: number;
        qty?: number;
        category_id?: number | null;
      }) => Promise<boolean>;
      deleteProduct: (id: number) => Promise<boolean>;
      getDashboardSummary: () => Promise<DashboardSummary>;
      getReportSummary: (filter?: DateRangeFilter) => Promise<ReportSummary>;
      getReportSeries: (payload: ReportSeriesQuery) => Promise<ReportSeriesBucket[]>;
      exportTransactions: (filter?: DateRangeFilter) => Promise<string | null>;
      getSettings: () => Promise<StoreSettings>;
      updateSettings: (payload: StoreSettings) => Promise<boolean>;
    };
  }
}

export {};
