"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
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
};
electron_1.contextBridge.exposeInMainWorld("api", {
    saveTransaction: (payload) => electron_1.ipcRenderer.invoke(IPCChannels.saveTransaction, payload),
    listTransactions: (payload) => electron_1.ipcRenderer.invoke(IPCChannels.listTransactions, payload),
    getTransactionDetail: (id) => electron_1.ipcRenderer.invoke(IPCChannels.getTransactionDetail, id),
    printReceipt: (transactionId) => electron_1.ipcRenderer.invoke(IPCChannels.printReceipt, transactionId),
    listCategories: () => electron_1.ipcRenderer.invoke(IPCChannels.listCategories),
    createCategory: (payload) => electron_1.ipcRenderer.invoke(IPCChannels.createCategory, payload),
    updateCategory: (payload) => electron_1.ipcRenderer.invoke(IPCChannels.updateCategory, payload),
    deleteCategory: (id) => electron_1.ipcRenderer.invoke(IPCChannels.deleteCategory, id),
    listProducts: (query) => electron_1.ipcRenderer.invoke(IPCChannels.listProducts, query),
    createProduct: (payload) => electron_1.ipcRenderer.invoke(IPCChannels.createProduct, payload),
    updateProduct: (payload) => electron_1.ipcRenderer.invoke(IPCChannels.updateProduct, payload),
    deleteProduct: (id) => electron_1.ipcRenderer.invoke(IPCChannels.deleteProduct, id),
    getDashboardSummary: () => electron_1.ipcRenderer.invoke(IPCChannels.getDashboardSummary),
    getReportSummary: (filter) => electron_1.ipcRenderer.invoke(IPCChannels.getReportSummary, filter),
    getReportSeries: (payload) => electron_1.ipcRenderer.invoke(IPCChannels.getReportSeries, payload),
    exportTransactions: (filter) => electron_1.ipcRenderer.invoke(IPCChannels.exportTransactions, filter),
    getSettings: () => electron_1.ipcRenderer.invoke(IPCChannels.getSettings),
    updateSettings: (payload) => electron_1.ipcRenderer.invoke(IPCChannels.updateSettings, payload)
});
