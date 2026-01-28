"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPCChannels = void 0;
exports.IPCChannels = {
    saveTransaction: "pos:save-transaction",
    listTransactions: "pos:list-transactions",
    getTransactionDetail: "pos:get-transaction-detail",
    getTransactionDetailByCode: "pos:get-transaction-detail-by-code",
    printReceipt: "pos:print-receipt",
    printReceiptByCode: "pos:print-receipt-by-code",
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
