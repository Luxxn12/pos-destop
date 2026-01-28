import { contextBridge, ipcRenderer } from "electron";
import type {
  SaveTransactionPayload,
  DateRangeFilter,
  ProductQuery,
  ReportSeriesQuery,
  StoreSettings
} from "../types/pos";

const IPCChannels = {
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

contextBridge.exposeInMainWorld("api", {
  saveTransaction: (payload: SaveTransactionPayload) =>
    ipcRenderer.invoke(IPCChannels.saveTransaction, payload),
  listTransactions: (payload?: DateRangeFilter & { page?: number; pageSize?: number }) =>
    ipcRenderer.invoke(IPCChannels.listTransactions, payload),
  getTransactionDetail: (id: number) =>
    ipcRenderer.invoke(IPCChannels.getTransactionDetail, id),
  printReceipt: (transactionId: number) =>
    ipcRenderer.invoke(IPCChannels.printReceipt, transactionId),
  listCategories: () => ipcRenderer.invoke(IPCChannels.listCategories),
  createCategory: (payload: { name: string }) =>
    ipcRenderer.invoke(IPCChannels.createCategory, payload),
  updateCategory: (payload: { id: number; name: string }) =>
    ipcRenderer.invoke(IPCChannels.updateCategory, payload),
  deleteCategory: (id: number) =>
    ipcRenderer.invoke(IPCChannels.deleteCategory, id),
  listProducts: (query?: ProductQuery) =>
    ipcRenderer.invoke(IPCChannels.listProducts, query),
  createProduct: (payload: {
    name: string;
    barcode?: string | null;
    price: number;
    qty?: number;
    category_id?: number | null;
  }) => ipcRenderer.invoke(IPCChannels.createProduct, payload),
  updateProduct: (payload: {
    id: number;
    name: string;
    barcode?: string | null;
    price: number;
    qty?: number;
    category_id?: number | null;
  }) => ipcRenderer.invoke(IPCChannels.updateProduct, payload),
  deleteProduct: (id: number) =>
    ipcRenderer.invoke(IPCChannels.deleteProduct, id),
  getDashboardSummary: () =>
    ipcRenderer.invoke(IPCChannels.getDashboardSummary),
  getReportSummary: (filter?: DateRangeFilter) =>
    ipcRenderer.invoke(IPCChannels.getReportSummary, filter),
  getReportSeries: (payload: ReportSeriesQuery) =>
    ipcRenderer.invoke(IPCChannels.getReportSeries, payload),
  exportTransactions: (filter?: DateRangeFilter) =>
    ipcRenderer.invoke(IPCChannels.exportTransactions, filter),
  getSettings: () => ipcRenderer.invoke(IPCChannels.getSettings),
  updateSettings: (payload: StoreSettings) =>
    ipcRenderer.invoke(IPCChannels.updateSettings, payload)
});
