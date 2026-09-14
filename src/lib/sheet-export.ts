import * as XLSX from "xlsx";

import type { Customer, CustomerType } from "@/lib/customers";
import type {
  CentralSalesReportMetrics,
  CustomerTransactionSummary,
  Transaction,
  TransactionType,
  TransactionWithCustomer,
} from "@/lib/transactions";

function getCustomerTypeLabel(type: CustomerType): string {
  switch (type) {
    case "WHOLESALE":
      return "পাইকারি (Wholesale)";
    case "BOTH":
      return "খুচরা ও পাইকারি (Both)";
    case "RETAIL":
    default:
      return "খুচরা (Retail)";
  }
}

function getTransactionTypeLabel(type: TransactionType): string {
  switch (type) {
    case "SALE":
      return "বিক্রয় (Sale)";
    case "PAYMENT":
      return "জমা / পরিশোধ (Payment)";
    case "DUE":
      return "বকেয়া যোগ (Due)";
    default:
      return type;
  }
}

function formatDate(dateVal?: Date | string | null): string {
  if (!dateVal) return "-";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return d.toISOString().split("T")[0];
  } catch {
    return "-";
  }
}

/**
 * Trigger download of an XLSX workbook in browser
 */
function downloadWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  const safeName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, safeName, { bookType: "xlsx" });
}

/**
 * Trigger download of a CSV file with UTF-8 BOM in browser for Excel compatibility
 */
function downloadCSV(csvContent: string, fileName: string) {
  const safeName = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", safeName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export customers list to Excel (.xlsx) sheet
 */
export function exportCustomersToExcel(customers: Customer[], customFileName?: string) {
  const data = customers.map((c, index) => ({
    "ক্রমিক নং": index + 1,
    "গ্রাহকের নাম": c.name || "-",
    "মোবাইল নম্বর": c.phone || "-",
    ইমেইল: c.email || "-",
    "গ্রাহকের ধরণ": getCustomerTypeLabel(c.type),
    "ভিআইপি গ্রাহক": c.is_vip ? "হ্যাঁ (VIP)" : "না",
    ঠিকানা: c.address || "-",
    "নিবন্ধনের তারিখ": formatDate(c.created_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set optimal column widths
  worksheet["!cols"] = [
    { wch: 10 }, // ক্রমিক নং
    { wch: 25 }, // নাম
    { wch: 18 }, // মোবাইল
    { wch: 25 }, // ইমেইল
    { wch: 22 }, // ধরণ
    { wch: 14 }, // ভিআইপি
    { wch: 35 }, // ঠিকানা
    { wch: 16 }, // তারিখ
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "গ্রাহক তালিকা");

  const today = new Date().toISOString().split("T")[0];
  const fileName = customFileName || `গ্রাহক_তালিকা_${today}.xlsx`;
  downloadWorkbook(workbook, fileName);
}

/**
 * Export customers list to CSV format with UTF-8 BOM
 */
export function exportCustomersToCSV(customers: Customer[], customFileName?: string) {
  const data = customers.map((c, index) => ({
    "ক্রমিক নং": index + 1,
    "গ্রাহকের নাম": c.name || "-",
    "মোবাইল নম্বর": c.phone || "-",
    ইমেইল: c.email || "-",
    "গ্রাহকের ধরণ": getCustomerTypeLabel(c.type),
    "ভিআইপি গ্রাহক": c.is_vip ? "হ্যাঁ" : "না",
    ঠিকানা: c.address || "-",
    "নিবন্ধনের তারিখ": formatDate(c.created_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const today = new Date().toISOString().split("T")[0];
  const fileName = customFileName || `গ্রাহক_তালিকা_${today}.csv`;
  downloadCSV(csv, fileName);
}

export interface ExportTransactionsOptions {
  customer: Customer;
  transactions: Transaction[];
  summary: CustomerTransactionSummary;
  customFileName?: string;
}

/**
 * Export customer's all transactions to an Excel sheet (.xlsx)
 * Formatted with Customer Profile header, Financial Ledger Summary, and detailed transactions table.
 */
export function exportCustomerTransactionsToExcel({
  customer,
  transactions,
  summary,
  customFileName,
}: ExportTransactionsOptions) {
  const today = new Date().toISOString().split("T")[0];

  // Build Sheet array of arrays (AOA) for a professional layout
  const rows: (string | number)[][] = [
    ["এস. আর. ট্রেডলিংক (SR Tradelink) - গ্রাহক লেনদেন ও খতিয়ান বিবরণী"],
    [`রিপোর্ট তৈরির তারিখ: ${today}`],
    [],
    ["গ্রাহকের তথ্য"],
    ["গ্রাহকের নাম:", customer.name, "", "মোবাইল নম্বর:", customer.phone || "তথ্য নেই"],
    [
      "গ্রাহকের ধরণ:",
      getCustomerTypeLabel(customer.type),
      "",
      "ইমেইল:",
      customer.email || "তথ্য নেই",
    ],
    [
      "ঠিকানা:",
      customer.address || "তথ্য নেই",
      "",
      "ভিআইপি স্ট্যাটাস:",
      customer.is_vip ? "হ্যাঁ (VIP)" : "না",
    ],
    [],
    ["আর্থিক হিসাব সারসংক্ষেপ (খতিয়ান)"],
    [
      `মোট বিক্রয়: ৳ ${summary.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `মোট পরিশোধ: ৳ ${summary.totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `নিট বকেয়া: ৳ ${summary.totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `মোট লেনদেন: ${summary.transactionCount} টি`,
    ],
    [],
    [
      "ক্রমিক",
      "তারিখ",
      "চালান / মেমো নম্বর",
      "লেনদেনের ধরন",
      "মোট টাকা (৳)",
      "পরিশোধ (৳)",
      "বকেয়া (৳)",
      "বিবরণ / নোট",
    ],
  ];

  // Append transaction rows
  transactions.forEach((tx, idx) => {
    rows.push([
      idx + 1,
      formatDate(tx.date),
      tx.reference || "-",
      getTransactionTypeLabel(tx.type),
      tx.amount ?? 0,
      tx.paid_amount ?? 0,
      tx.due_amount ?? 0,
      tx.description || "-",
    ]);
  });

  // Append summary row at bottom
  rows.push([]);
  rows.push([
    "সর্বমোট হিসাব:",
    "",
    "",
    "",
    summary.totalSales,
    summary.totalPaid,
    summary.totalDue,
    `নিট বকেয়া: ৳ ${summary.totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 10 }, // ক্রমিক
    { wch: 14 }, // তারিখ
    { wch: 22 }, // চালান / মেমো
    { wch: 24 }, // ধরন
    { wch: 16 }, // মোট টাকা
    { wch: 16 }, // পরিশোধ
    { wch: 16 }, // বকেয়া
    { wch: 35 }, // বিবরণ
  ];

  const workbook = XLSX.utils.book_new();
  const safeSheetName = customer.name.slice(0, 28) || "Transactions";
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  const cleanCustomerName = customer.name.replace(/[\\/:*?"<>|]/g, "_").trim();
  const fileName = customFileName || `গ্রাহক_${cleanCustomerName}_লেনদেন_খতিয়ান_${today}.xlsx`;

  downloadWorkbook(workbook, fileName);
}

/**
 * Export customer's all transactions to a CSV file with UTF-8 BOM
 */
export function exportCustomerTransactionsToCSV({
  customer,
  transactions,
  summary,
  customFileName,
}: ExportTransactionsOptions) {
  const data = transactions.map((tx, idx) => ({
    "ক্রমিক নং": String(idx + 1),
    তারিখ: formatDate(tx.date),
    "চালান / মেমো": tx.reference || "-",
    "লেনদেনের ধরন": getTransactionTypeLabel(tx.type),
    "মোট টাকা (৳)": tx.amount ?? 0,
    "পরিশোধ (৳)": tx.paid_amount ?? 0,
    "বকেয়া (৳)": tx.due_amount ?? 0,
    বিবরণ: tx.description || "-",
  }));

  // Append summary row at bottom
  data.push({
    "ক্রমিক নং": "সর্বমোট",
    তারিখ: "-",
    "চালান / মেমো": "-",
    "লেনদেনের ধরন": `মোট ${summary.transactionCount} টি`,
    "মোট টাকা (৳)": summary.totalSales,
    "পরিশোধ (৳)": summary.totalPaid,
    "বকেয়া (৳)": summary.totalDue,
    বিবরণ: `নিট বকেয়া: ৳ ${summary.totalDue}`,
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const today = new Date().toISOString().split("T")[0];
  const cleanCustomerName = customer.name.replace(/[\\/:*?"<>|]/g, "_").trim();
  const fileName = customFileName || `গ্রাহক_${cleanCustomerName}_লেনদেন_খতিয়ান_${today}.csv`;

  downloadCSV(csv, fileName);
}

/**
 * Export Central Sales & Revenue Report to Excel (.xlsx) workbook
 */
export function exportCentralSalesReportToExcel({
  metrics,
  transactions,
  startDate,
  endDate,
  customFileName,
}: {
  metrics: CentralSalesReportMetrics;
  transactions: TransactionWithCustomer[];
  startDate?: string;
  endDate?: string;
  customFileName?: string;
}) {
  const today = new Date().toISOString().split("T")[0];
  const dateRangeStr =
    startDate && endDate ? `${startDate} হতে ${endDate}` : "সকল লেনদেন (সম্পূর্ণ রেকর্ড)";

  const rows: (string | number)[][] = [
    ["এসআর ট্রেডলিংক (SR Tradelink) - কেন্দ্রীয় বিক্রয় ও আর্থিক বিবরণী"],
    [`প্রতিবেদন তৈরির তারিখ: ${today}`, `সময়কাল: ${dateRangeStr}`],
    [],
    // Key Metrics Box
    ["আর্থিক সারসংক্ষেপ (Financial Overview):"],
    [
      "মোট বিক্রয় (Gross Sales)",
      `৳ ${metrics.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      "মোট নগদ আদায় (Collected)",
      `৳ ${metrics.totalCollected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ],
    [
      "চলতি বকেয়া (Outstanding Due)",
      `৳ ${metrics.totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      "আদায় অনুপাত (Collection Rate)",
      `${metrics.collectionRate}%`,
    ],
    [
      "মোট লেনদেন সংখ্যা",
      `${metrics.totalTransactions} টি`,
      "গড় বিক্রয় মূল্য",
      `৳ ${metrics.avgSaleAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ],
    [],
    // Transactions Table Headers
    [
      "ক্রমিক নং",
      "তারিখ",
      "চালান / মেমো",
      "গ্রাহকের নাম",
      "মোবাইল নম্বর",
      "গ্রাহকের ধরণ",
      "লেনদেনের ধরণ",
      "মোট মূল্য (৳)",
      "আদায় / জমা (৳)",
      "বকেয়া (৳)",
      "বিবরণ",
    ],
  ];

  transactions.forEach((tx, idx) => {
    rows.push([
      idx + 1,
      formatDate(tx.date),
      tx.reference || tx.id.slice(-6).toUpperCase(),
      tx.customer?.name || "-",
      tx.customer?.phone || "-",
      tx.customer?.type ? getCustomerTypeLabel(tx.customer.type as CustomerType) : "-",
      getTransactionTypeLabel(tx.type),
      tx.amount ?? 0,
      tx.paid_amount ?? 0,
      tx.due_amount ?? 0,
      tx.description || "-",
    ]);
  });

  // Summary Row
  rows.push([]);
  rows.push([
    "সর্বমোট হিসাব:",
    "",
    "",
    "",
    "",
    "",
    `মোট ${metrics.totalTransactions} টি`,
    metrics.totalSales,
    metrics.totalCollected,
    metrics.totalDue,
    `অবশিষ্ট বকেয়া: ৳ ${metrics.totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 10 }, // ক্রমিক
    { wch: 14 }, // তারিখ
    { wch: 18 }, // মেমো
    { wch: 25 }, // গ্রাহকের নাম
    { wch: 16 }, // মোবাইল
    { wch: 22 }, // গ্রাহকের ধরণ
    { wch: 22 }, // লেনদেনের ধরণ
    { wch: 16 }, // মোট মূল্য
    { wch: 16 }, // পরিশোধ
    { wch: 16 }, // বকেয়া
    { wch: 30 }, // বিবরণ
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "বিক্রয় রিপোর্ট");

  const fileName = customFileName || `এসআর_ট্রেডলিংক_কেন্দ্রীয়_বিক্রয়_রিপোর্ট_${today}.xlsx`;
  downloadWorkbook(workbook, fileName);
}

/**
 * Export Central Sales Report to CSV file
 */
export function exportCentralSalesReportToCSV({
  metrics,
  transactions,
  startDate,
  endDate,
  customFileName,
}: {
  metrics: CentralSalesReportMetrics;
  transactions: TransactionWithCustomer[];
  startDate?: string;
  endDate?: string;
  customFileName?: string;
}) {
  const data = transactions.map((tx, idx) => ({
    "ক্রমিক নং": String(idx + 1),
    তারিখ: formatDate(tx.date),
    "চালান / মেমো": tx.reference || tx.id.slice(-6).toUpperCase(),
    "গ্রাহকের নাম": tx.customer?.name || "-",
    "মোবাইল নম্বর": tx.customer?.phone || "-",
    "গ্রাহকের ধরণ": tx.customer?.type
      ? getCustomerTypeLabel(tx.customer.type as CustomerType)
      : "-",
    "লেনদেনের ধরণ": getTransactionTypeLabel(tx.type),
    "মোট টাকা (৳)": tx.amount ?? 0,
    "আদায় (৳)": tx.paid_amount ?? 0,
    "বকেয়া (৳)": tx.due_amount ?? 0,
    বিবরণ: tx.description || "-",
  }));

  // Append summary row
  data.push({
    "ক্রমিক নং": "সর্বমোট",
    তারিখ: "-",
    "চালান / মেমো": "-",
    "গ্রাহকের নাম": "-",
    "মোবাইল নম্বর": "-",
    "গ্রাহকের ধরণ": "-",
    "লেনদেনের ধরণ": `মোট ${metrics.totalTransactions} টি`,
    "মোট টাকা (৳)": metrics.totalSales,
    "আদায় (৳)": metrics.totalCollected,
    "বকেয়া (৳)": metrics.totalDue,
    বিবরণ: `মোট বকেয়া: ৳ ${metrics.totalDue}`,
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const today = new Date().toISOString().split("T")[0];
  const dateSuffix =
    startDate && endDate
      ? `_${startDate}_থেকে_${endDate}`
      : startDate
        ? `_শুরু_${startDate}`
        : endDate
          ? `_পর্যন্ত_${endDate}`
          : `_${today}`;
  const fileName = customFileName || `এসআর_ট্রেডলিংক_বিক্রয়_রিপোর্ট${dateSuffix}.csv`;
  downloadCSV(csv, fileName);
}
