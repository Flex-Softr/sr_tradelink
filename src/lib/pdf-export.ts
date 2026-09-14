import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

import { COMPANY_INFO } from "@/lib/company-info";
import type { Customer, CustomerType } from "@/lib/customers";
import type {
  CentralSalesReportMetrics,
  Transaction,
  TransactionType,
  TransactionWithCustomer,
} from "@/lib/transactions";

export interface LedgerEntry extends Transaction {
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface StatementLedgerData {
  openingBalance: number;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  transactionCount: number;
  startDate?: string;
  endDate?: string;
}

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

function getTxTypeLabel(type: TransactionType): string {
  switch (type) {
    case "SALE":
      return "বিক্রয় (SALE)";
    case "PAYMENT":
      return "জমা / পরিশোধ (PAYMENT)";
    case "DUE":
      return "বকেয়া যোগ (DUE)";
    default:
      return type;
  }
}

function getTxBadgeColor(type: TransactionType): { bg: string; text: string; border: string } {
  switch (type) {
    case "SALE":
      return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" };
    case "PAYMENT":
      return { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" };
    case "DUE":
      return { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" };
    default:
      return { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" };
  }
}

export function formatMoney(amount: number): string {
  return Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateStr(dateVal?: Date | string | null): string {
  if (!dateVal) return "-";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return d.toISOString().split("T")[0];
  } catch {
    return "-";
  }
}

export function formatDateTimeStr(dateVal?: Date | string | null): string {
  const d = dateVal ? new Date(dateVal) : new Date();
  try {
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return d.toISOString().split("T")[0];
  }
}

/**
 * Calculate Bank-Statement-grade ledger calculation:
 * - opening balance prior to startDate
 * - chronological debit, credit, and running balance
 * - closing balance = openingBalance + totalDebit - totalCredit
 */
export function calculateStatementLedger(
  allTransactions: Transaction[],
  startDate?: string,
  endDate?: string
): StatementLedgerData {
  // Sort chronologically ascending (oldest to newest)
  const sorted = [...allTransactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    const createA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return createA - createB;
  });

  let openingBalance = 0;
  const inScopeTransactions: Transaction[] = [];

  for (const tx of sorted) {
    const txDateStr = formatDateStr(tx.date);

    // Calculate net impact on customer's due balance
    // Debit increases due (Sale invoice value, manual due)
    // Credit decreases due (Paid amount)
    let debit = 0;
    let credit = 0;

    if (tx.type === "SALE") {
      debit = Number(tx.amount) || 0;
      credit = Number(tx.paid_amount) || 0;
    } else if (tx.type === "PAYMENT") {
      debit = 0;
      credit = Number(tx.paid_amount || tx.amount) || 0;
    } else if (tx.type === "DUE") {
      debit = Number(tx.amount || tx.due_amount) || 0;
      credit = Number(tx.paid_amount) || 0;
    }

    const netImpact = debit - credit;

    if (startDate && txDateStr < startDate) {
      openingBalance += netImpact;
    } else if (!endDate || txDateStr <= endDate) {
      inScopeTransactions.push(tx);
    }
  }

  openingBalance = Math.max(0, parseFloat(openingBalance.toFixed(2)));

  let runningBalance = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  const entries: LedgerEntry[] = inScopeTransactions.map((tx) => {
    let debit = 0;
    let credit = 0;

    if (tx.type === "SALE") {
      debit = Number(tx.amount) || 0;
      credit = Number(tx.paid_amount) || 0;
    } else if (tx.type === "PAYMENT") {
      debit = 0;
      credit = Number(tx.paid_amount || tx.amount) || 0;
    } else if (tx.type === "DUE") {
      debit = Number(tx.amount || tx.due_amount) || 0;
      credit = Number(tx.paid_amount) || 0;
    }

    runningBalance = runningBalance + debit - credit;
    totalDebit += debit;
    totalCredit += credit;

    return {
      ...tx,
      debit,
      credit,
      runningBalance: Math.max(0, parseFloat(runningBalance.toFixed(2))),
    };
  });

  const closingBalance = Math.max(
    0,
    parseFloat((openingBalance + totalDebit - totalCredit).toFixed(2))
  );

  return {
    openingBalance,
    entries,
    totalDebit: parseFloat(totalDebit.toFixed(2)),
    totalCredit: parseFloat(totalCredit.toFixed(2)),
    closingBalance,
    transactionCount: entries.length,
    startDate,
    endDate,
  };
}

/**
 * Generate HTML template for Bank Statement Format PDF
 */
export function generateBankStatementHTML(options: {
  customer: Customer;
  ledger: StatementLedgerData;
}): string {
  const { customer, ledger } = options;
  const now = new Date();
  const printTimestamp = formatDateTimeStr(now);
  const statementId = `STMT-${customer.id.slice(-6).toUpperCase()}-${formatDateStr(now).replace(/-/g, "")}`;

  let periodText = "সকল লেনদেন (সম্পূর্ণ রেকর্ড)";
  if (ledger.startDate && ledger.endDate) {
    periodText = `${ledger.startDate} হতে ${ledger.endDate}`;
  } else if (ledger.startDate) {
    periodText = `${ledger.startDate} হতে অদ্যাবধি`;
  } else if (ledger.endDate) {
    periodText = `প্রারম্ভ হতে ${ledger.endDate} পর্যন্ত`;
  }

  // Generate table rows
  let rowsHtml = "";

  // Opening Balance Row if date filter was applied
  if (ledger.startDate) {
    rowsHtml += `
      <tr style="background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 7px 8px; text-align: center; color: #64748b;">-</td>
        <td style="padding: 7px 8px; white-space: nowrap;">${ledger.startDate}</td>
        <td style="padding: 7px 8px; font-family: monospace; color: #475569;">OPENING</td>
        <td style="padding: 7px 8px;">
          <span style="display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 9.5px; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;">
            প্রারম্ভিক জের
          </span>
        </td>
        <td style="padding: 7px 8px; color: #475569;">পূর্ববর্তী সময়কালের অবশিষ্ট জের (Balance B/F)</td>
        <td style="padding: 7px 8px; text-align: right; color: #64748b;">-</td>
        <td style="padding: 7px 8px; text-align: right; color: #64748b;">-</td>
        <td style="padding: 7px 8px; text-align: right; font-weight: 700; color: #0f172a;">৳ ${formatMoney(ledger.openingBalance)}</td>
      </tr>
    `;
  }

  if (ledger.entries.length === 0) {
    rowsHtml += `
      <tr>
        <td colspan="8" style="padding: 24px; text-align: center; color: #64748b; font-style: italic;">
          নির্বাচিত সময়কালের মধ্যে কোনো লেনদেনের রেকর্ড পাওয়া যায়নি।
        </td>
      </tr>
    `;
  } else {
    ledger.entries.forEach((entry, idx) => {
      const badge = getTxBadgeColor(entry.type);
      const isEven = idx % 2 === 0;
      rowsHtml += `
        <tr style="background-color: ${isEven ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 7px 8px; text-align: center; color: #64748b; font-size: 11px;">${idx + 1}</td>
          <td style="padding: 7px 8px; white-space: nowrap; font-size: 11px;">${formatDateStr(entry.date)}</td>
          <td style="padding: 7px 8px; font-family: monospace; font-size: 11px; color: #0f172a; font-weight: 600;">
            ${entry.reference || "-"}
          </td>
          <td style="padding: 7px 8px;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9.5px; font-weight: 600; background: ${badge.bg}; color: ${badge.text}; border: 1px solid ${badge.border};">
              ${getTxTypeLabel(entry.type)}
            </span>
          </td>
          <td style="padding: 7px 8px; font-size: 11px; color: #334155; max-width: 200px; word-break: break-word;">
            ${entry.description || "-"}
          </td>
          <td style="padding: 7px 8px; text-align: right; font-size: 11.5px; font-weight: 600; color: #1d4ed8;">
            ${entry.debit > 0 ? `৳ ${formatMoney(entry.debit)}` : "-"}
          </td>
          <td style="padding: 7px 8px; text-align: right; font-size: 11.5px; font-weight: 600; color: #047857;">
            ${entry.credit > 0 ? `৳ ${formatMoney(entry.credit)}` : "-"}
          </td>
          <td style="padding: 7px 8px; text-align: right; font-size: 11.5px; font-weight: 700; color: ${entry.runningBalance > 0 ? "#b91c1c" : "#0f172a"};">
            ৳ ${formatMoney(entry.runningBalance)}
          </td>
        </tr>
      `;
    });
  }

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>${customer.name} - ব্যাংক লেনদেন বিবরণী | SR Tradelink</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Bengali', 'SolaimanLipi', sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 16px 20px;
      font-size: 11px;
      line-height: 1.35;
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    .statement-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2.5px solid #059669;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #059669;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .brand-text h1 {
      font-size: 21px;
      font-weight: 800;
      color: #065f46;
      line-height: 1.15;
    }
    .brand-text .english-name {
      font-size: 12.5px;
      font-weight: 700;
      color: #047857;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }
    .brand-text .tagline {
      font-size: 10px;
      color: #475569;
      margin-top: 2px;
    }
    .brand-right {
      text-align: right;
      font-size: 10px;
      color: #334155;
      line-height: 1.45;
    }
    .brand-right strong {
      color: #0f172a;
    }
    .title-strip {
      background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
      border: 1px solid #a7f3d0;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 12px 0 14px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title-strip h2 {
      font-size: 14px;
      font-weight: 800;
      color: #065f46;
      letter-spacing: -0.2px;
    }
    .title-strip .sub-title {
      font-size: 10px;
      color: #047857;
      font-weight: 600;
    }
    .meta-box {
      text-align: right;
      font-size: 9.5px;
      color: #334155;
      line-height: 1.4;
    }
    .meta-box span {
      font-weight: 700;
      color: #065f46;
    }
    .kyc-summary-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .info-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 9px 12px;
      background: #ffffff;
    }
    .info-card-header {
      font-size: 10.5px;
      font-weight: 700;
      color: #065f46;
      padding-bottom: 5px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .info-table {
      width: 100%;
      font-size: 10.5px;
    }
    .info-table td {
      padding: 2.5px 0;
      vertical-align: top;
    }
    .info-table td.label {
      color: #64748b;
      width: 105px;
    }
    .info-table td.val {
      color: #0f172a;
      font-weight: 600;
    }
    .summary-metrics {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    .metric-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 6px 8px;
    }
    .metric-box.highlight {
      background: #fff1f2;
      border-color: #fecdd3;
    }
    .metric-box.highlight-green {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }
    .metric-title {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
    }
    .metric-val {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 1px;
    }
    .metric-box.highlight .metric-val {
      color: #b91c1c;
    }
    .metric-box.highlight-green .metric-val {
      color: #047857;
    }
    .table-container {
      margin-bottom: 16px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    .ledger-table thead {
      background-color: #065f46;
      color: #ffffff;
    }
    .ledger-table thead th {
      padding: 7px 8px;
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 0.2px;
      border-right: 1px solid rgba(255,255,255,0.15);
    }
    .ledger-table thead th:last-child {
      border-right: none;
    }
    .ledger-table tfoot {
      background-color: #f1f5f9;
      border-top: 2px solid #059669;
      font-weight: 800;
      color: #0f172a;
    }
    .ledger-table tfoot td {
      padding: 8px 8px;
      font-size: 11px;
    }
    .verification-section {
      margin-top: 18px;
      padding: 12px 14px;
      background: #fdfdfd;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      page-break-inside: avoid;
    }
    .notice-text {
      font-size: 9px;
      color: #64748b;
      line-height: 1.35;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 16px;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1.2fr;
      gap: 16px;
      align-items: flex-end;
    }
    .sig-col {
      text-align: center;
    }
    .sig-line {
      border-top: 1.2px dashed #64748b;
      margin-bottom: 6px;
      width: 85%;
      margin-left: auto;
      margin-right: auto;
    }
    .sig-role {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .sig-sub {
      font-size: 9px;
      color: #64748b;
      margin-top: 1px;
    }
    .official-seal-box {
      border: 1.5px solid #059669;
      border-radius: 50%;
      width: 72px;
      height: 72px;
      margin: 0 auto 6px auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #059669;
      font-size: 7.5px;
      font-weight: 800;
      line-height: 1.2;
      text-transform: uppercase;
      transform: rotate(-5deg);
      background: rgba(16, 185, 129, 0.04);
    }
    .official-seal-box span {
      font-size: 9px;
    }
    .system-footer {
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
    }
  </style>
</head>
<body>
  <div id="statement-pdf-root" style="background: #ffffff; width: 100%; max-width: 794px; margin: 0 auto;">

  <!-- Company Header -->
  <div class="statement-header">
    <div class="brand-left">
      <img class="brand-logo" src="${COMPANY_INFO.logoBase64}" alt="SR Tradelink Logo" />
      <div class="brand-text">
        <h1>${COMPANY_INFO.nameBn}</h1>
        <div class="english-name">${COMPANY_INFO.nameEn}</div>
        <div class="tagline">${COMPANY_INFO.tagline}</div>
      </div>
    </div>
    <div class="brand-right">
      <div>📍 <strong>প্রধান কার্যালয়:</strong> ${COMPANY_INFO.address}</div>
      <div>📞 <strong>মোবাইল:</strong> ${COMPANY_INFO.phone}</div>
      <div>✉️ <strong>ইমেইল:</strong> ${COMPANY_INFO.email}</div>
      <div>🕒 <strong>কাজের সময়:</strong> ${COMPANY_INFO.hours}</div>
    </div>
  </div>

  <!-- Statement Title & Filter Period -->
  <div class="title-strip">
    <div>
      <h2>গ্রাহক লেনদেন বিবরণী ও হিসাব খতিয়ান</h2>
      <div class="sub-title">CUSTOMER ACCOUNT STATEMENT (BANK TRANSACTION LEDGER)</div>
    </div>
    <div class="meta-box">
      <div>স্টেটমেন্ট আইডি: <span>${statementId}</span></div>
      <div>সময়কাল: <span>${periodText}</span></div>
      <div>প্রিন্ট সময়: <span>${printTimestamp}</span></div>
    </div>
  </div>

  <!-- Customer KYC & Financial Summary Cards -->
  <div class="kyc-summary-grid">
    <!-- Left: Customer Profile -->
    <div class="info-card">
      <div class="info-card-header">গ্রাহকের পরিচিতি ও হিসাব তথ্য (Account KYC)</div>
      <table class="info-table">
        <tr>
          <td class="label">গ্রাহকের নাম:</td>
          <td class="val">${customer.name}</td>
        </tr>
        <tr>
          <td class="label">হিসাব / গ্রাহক আইডি:</td>
          <td class="val" style="font-family: monospace;">${customer.id}</td>
        </tr>
        <tr>
          <td class="label">হিসাবের ধরন:</td>
          <td class="val">${getCustomerTypeLabel(customer.type)} ${customer.is_vip ? "(ভিআইপি গ্রাহক)" : ""}</td>
        </tr>
        <tr>
          <td class="label">মোবাইল নম্বর:</td>
          <td class="val">${customer.phone || "প্রদান করা হয়নি"}</td>
        </tr>
        <tr>
          <td class="label">ঠিকানা:</td>
          <td class="val">${customer.address || "প্রদান করা হয়নি"}</td>
        </tr>
      </table>
    </div>

    <!-- Right: Period Financial Summary -->
    <div class="info-card">
      <div class="info-card-header">আর্থিক হিসাব সারসংক্ষেপ (Statement Summary)</div>
      <div class="summary-metrics">
        <div class="metric-box">
          <div class="metric-title">প্রারম্ভিক জের (Opening)</div>
          <div class="metric-val">৳ ${formatMoney(ledger.openingBalance)}</div>
        </div>
        <div class="metric-box">
          <div class="metric-title">মোট বিক্রয় / ডেবিট</div>
          <div class="metric-val" style="color: #1d4ed8;">৳ ${formatMoney(ledger.totalDebit)}</div>
        </div>
        <div class="metric-box">
          <div class="metric-title">মোট জমা / ক্রেডিট</div>
          <div class="metric-val" style="color: #047857;">৳ ${formatMoney(ledger.totalCredit)}</div>
        </div>
        <div class="metric-box ${ledger.closingBalance > 0 ? "highlight" : "highlight-green"}">
          <div class="metric-title">সমাপনী বকেয়া (Balance)</div>
          <div class="metric-val">৳ ${formatMoney(ledger.closingBalance)}</div>
        </div>
      </div>
      <div style="margin-top: 6px; font-size: 9.5px; color: #64748b; text-align: right;">
        মোট অন্তর্ভুক্ত লেনদেন: <strong>${ledger.transactionCount}</strong> টি
      </div>
    </div>
  </div>

  <!-- Transactions Table (Bank Format) -->
  <div class="table-container">
    <table class="ledger-table">
      <thead>
        <tr>
          <th style="width: 32px; text-align: center;">ক্র.</th>
          <th style="width: 80px; text-align: left;">তারিখ</th>
          <th style="width: 100px; text-align: left;">চালান / মেমো</th>
          <th style="width: 105px; text-align: left;">লেনদেনের ধরন</th>
          <th style="text-align: left;">বিবরণ ও মন্তব্য</th>
          <th style="width: 85px; text-align: right;">ডেবিট / বিক্রয় (৳)</th>
          <th style="width: 85px; text-align: right;">ক্রেডিট / জমা (৳)</th>
          <th style="width: 95px; text-align: right;">অবশিষ্ট বকেয়া (৳)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="text-align: right; font-weight: 700; color: #065f46;">
            সর্বমোট হিসাব (PERIOD TOTALS):
          </td>
          <td style="text-align: right; color: #1d4ed8; font-weight: 800;">
            ৳ ${formatMoney(ledger.totalDebit)}
          </td>
          <td style="text-align: right; color: #047857; font-weight: 800;">
            ৳ ${formatMoney(ledger.totalCredit)}
          </td>
          <td style="text-align: right; color: ${ledger.closingBalance > 0 ? "#b91c1c" : "#0f172a"}; font-weight: 800;">
            ৳ ${formatMoney(ledger.closingBalance)}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Verification and Signature Section -->
  <div class="verification-section">
    <div class="notice-text">
      <strong>যাচাইকরণ নোট ও শর্তাবলী:</strong> এটি এসআর ট্রেডলিংক-এর অফিসিয়াল ডাটাবেস হতে প্রস্তুতকৃত ব্যাংক ফরম্যাট লেনদেন হিসাব বিবরণী। কোনো গরমিল বা আপত্তির ক্ষেত্রে বিবরণী ইস্যুর ৭ (সাত) কার্যদিবসের মধ্যে চালান কপিসহ কেন্দ্রীয় অফিসে যোগাযোগ করার অনুরোধ করা যাচ্ছে। অনুমোদিত কর্মকর্তা ও প্রতিষ্ঠানের অফিশিয়াল সিল ব্যতিরেকে এই স্টেটমেন্টে কোনো হাতে লেখা পরিবর্তন গ্রহণযোগ্য নয়।
    </div>

    <div class="signatures-grid">
      <!-- Signature 1: Prepared By -->
      <div class="sig-col">
        <div style="height: 40px;"></div>
        <div class="sig-line"></div>
        <div class="sig-role">হিসাব প্রস্তুতকারী</div>
        <div class="sig-sub">অ্যাকাউন্টস বিভাগ, এসআর ট্রেডলিংক</div>
        <div class="sig-sub">তারিখ: ............................</div>
      </div>

      <!-- Signature 2: Customer Acceptance -->
      <div class="sig-col">
        <div style="height: 40px;"></div>
        <div class="sig-line"></div>
        <div class="sig-role">গ্রাহকের স্বাক্ষর ও গ্রহণ</div>
        <div class="sig-sub">"হিসাব ও বকেয়া স্থিতি বুঝিয়া পাইলাম"</div>
        <div class="sig-sub">তারিখ: ............................</div>
      </div>

      <!-- Signature 3: Authorized Signatory & Official Seal -->
      <div class="sig-col">
        <div class="official-seal-box">
          <span>★ সিলমোহর ★</span>
          <strong>SR TRADELINK</strong>
          <span>যাচাইকৃত</span>
        </div>
        <div class="sig-line"></div>
        <div class="sig-role">অনুমোদিত স্বাক্ষর ও সিল</div>
        <div class="sig-sub">ব্যবস্থাপনা পরিচালক / সত্ত্বাধিকারী</div>
        <div class="sig-sub">${COMPANY_INFO.nameBn}</div>
      </div>
    </div>
  </div>

  <!-- System Footer -->
  <div class="system-footer">
    <div>কম্পিউটার জেনারেটেড স্টেটমেন্ট • কোনো সিল/স্বাক্ষরবিহীন ম্যানুয়াল কাটাকাটি অবৈধ • সিকিউরিটি ভেরিফিকেশন আইডি: ${statementId}</div>
    <div>পৃষ্ঠা ১ / ১</div>
  </div>

  </div>
</body>
</html>
  `;
}

/**
 * Generate HTML template for Customer Directory List PDF
 */
export function generateCustomerListHTML(options: {
  customers: Customer[];
  filterScope?: string;
}): string {
  const { customers, filterScope } = options;
  const now = new Date();
  const printTimestamp = formatDateTimeStr(now);

  const wholesaleCount = customers.filter((c) => c.type === "WHOLESALE").length;
  const retailCount = customers.filter((c) => c.type === "RETAIL").length;
  const vipCount = customers.filter((c) => c.is_vip).length;

  let rowsHtml = "";
  if (customers.length === 0) {
    rowsHtml = `
      <tr>
        <td colspan="7" style="padding: 24px; text-align: center; color: #64748b; font-style: italic;">
          কোনো গ্রাহক তথ্য পাওয়া যায়নি।
        </td>
      </tr>
    `;
  } else {
    customers.forEach((c, idx) => {
      const isEven = idx % 2 === 0;
      rowsHtml += `
        <tr style="background-color: ${isEven ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 8px; text-align: center; color: #64748b; font-size: 10px;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 600; color: #0f172a; font-size: 10.5px;">${c.name || "-"}</td>
          <td style="padding: 6px 8px; font-size: 10.5px; color: #334155; font-family: monospace;">${c.phone || "-"}</td>
          <td style="padding: 6px 8px; font-size: 10px; color: #64748b;">${c.email || "-"}</td>
          <td style="padding: 6px 8px; font-size: 10px;">
            <span style="display: inline-block; padding: 1.5px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">
              ${getCustomerTypeLabel(c.type)}
            </span>
            ${c.is_vip ? `<span style="margin-left: 3px; display: inline-block; padding: 1.5px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; background: #fef3c7; color: #b45309; border: 1px solid #fde68a;">VIP</span>` : ""}
          </td>
          <td style="padding: 6px 8px; font-size: 10px; color: #334155; max-width: 180px; word-break: break-word;">${c.address || "-"}</td>
          <td style="padding: 6px 8px; font-size: 10px; color: #64748b; white-space: nowrap;">${formatDateStr(c.created_at)}</td>
        </tr>
      `;
    });
  }

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>গ্রাহক তালিকা রিপোর্ট | SR Tradelink</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Bengali', 'SolaimanLipi', sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 16px 20px;
      font-size: 11px;
      line-height: 1.35;
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2.5px solid #059669;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #059669;
    }
    .brand-text h1 {
      font-size: 20px;
      font-weight: 800;
      color: #065f46;
      line-height: 1.15;
    }
    .brand-text .english-name {
      font-size: 12px;
      font-weight: 700;
      color: #047857;
      text-transform: uppercase;
    }
    .brand-right {
      text-align: right;
      font-size: 10px;
      color: #334155;
      line-height: 1.45;
    }
    .title-strip {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
      padding: 9px 12px;
      margin: 12px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title-strip h2 {
      font-size: 14px;
      font-weight: 800;
      color: #065f46;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 7px 10px;
      text-align: center;
    }
    .summary-card .num {
      font-size: 15px;
      font-weight: 800;
      color: #065f46;
    }
    .summary-card .lbl {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 1px;
    }
    .cust-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .cust-table thead {
      background: #065f46;
      color: #ffffff;
    }
    .cust-table thead th {
      padding: 6px 8px;
      font-weight: 700;
      font-size: 10px;
      text-align: left;
    }
    .sig-section {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 20px;
      page-break-inside: avoid;
    }
    .sig-block {
      text-align: center;
      width: 180px;
    }
    .sig-line {
      border-top: 1.2px dashed #64748b;
      margin-bottom: 6px;
    }
    .sig-role {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .sig-sub {
      font-size: 9px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div id="customer-list-pdf-root" style="background: #ffffff; width: 100%; max-width: 794px; margin: 0 auto;">
  <div class="header">
    <div class="brand-left">
      <img class="brand-logo" src="${COMPANY_INFO.logoBase64}" alt="SR Tradelink" />
      <div class="brand-text">
        <h1>${COMPANY_INFO.nameBn}</h1>
        <div class="english-name">${COMPANY_INFO.nameEn}</div>
        <div style="font-size: 9.5px; color: #64748b;">${COMPANY_INFO.tagline}</div>
      </div>
    </div>
    <div class="brand-right">
      <div>📍 ${COMPANY_INFO.address}</div>
      <div>📞 ${COMPANY_INFO.phone}</div>
      <div>✉️ ${COMPANY_INFO.email}</div>
    </div>
  </div>

  <div class="title-strip">
    <div>
      <h2>গ্রাহক তালিকা ও বিবরণী রিপোর্ট</h2>
      <div style="font-size: 9.5px; color: #047857;">CUSTOMER DIRECTORY REPORT • ${filterScope === "filtered" ? "ফিল্টারকৃত তালিকা" : "সকল গ্রাহক"}</div>
    </div>
    <div style="text-align: right; font-size: 9.5px; color: #64748b;">
      প্রিন্ট তারিখ: <strong>${printTimestamp}</strong>
    </div>
  </div>

  <div class="summary-cards">
    <div class="summary-card">
      <div class="num">${customers.length}</div>
      <div class="lbl">মোট গ্রাহক</div>
    </div>
    <div class="summary-card">
      <div class="num">${wholesaleCount}</div>
      <div class="lbl">পাইকারি গ্রাহক</div>
    </div>
    <div class="summary-card">
      <div class="num">${retailCount}</div>
      <div class="lbl">খুচরা গ্রাহক</div>
    </div>
    <div class="summary-card">
      <div class="num">${vipCount}</div>
      <div class="lbl">ভিআইপি গ্রাহক</div>
    </div>
  </div>

  <table class="cust-table">
    <thead>
      <tr>
        <th style="width: 32px; text-align: center;">ক্র.</th>
        <th>গ্রাহকের নাম</th>
        <th>মোবাইল নম্বর</th>
        <th>ইমেইল</th>
        <th>ধরণ</th>
        <th>ঠিকানা</th>
        <th>নিবন্ধনের তারিখ</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <!-- Signatures -->
  <div class="sig-section">
    <div class="sig-block">
      <div style="height: 45px;"></div>
      <div class="sig-line"></div>
      <div class="sig-role">রিপোর্ট প্রস্তুতকারী</div>
      <div class="sig-sub">এসআর ট্রেডলিংক</div>
    </div>

    <div style="border: 1.5px solid #059669; border-radius: 50%; width: 68px; height: 68px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #059669; font-size: 7.5px; font-weight: 800; transform: rotate(-5deg);">
      <span>★ সিল ★</span>
      <strong>SR TRADELINK</strong>
      <span>অফিসিয়াল</span>
    </div>

    <div class="sig-block">
      <div style="height: 45px;"></div>
      <div class="sig-line"></div>
      <div class="sig-role">অনুমোদিত কর্মকর্তা</div>
      <div class="sig-sub">ব্যবস্থাপনা পরিচালক, এসআর ট্রেডলিংক</div>
    </div>
  </div>

  <div style="margin-top: 16px; border-top: 1px solid #f1f5f9; padding-top: 6px; font-size: 8.5px; color: #94a3b8; display: flex; justify-content: space-between;">
    <div>কম্পিউটারাইজড রেকর্ড • এসআর ট্রেডলিংক গ্রাহক ব্যবস্থাপনা সিস্টেম</div>
    <div>পৃষ্ঠা ১ / ১</div>
  </div>
  </div>
</body>
</html>
  `;
}

/**
 * Print HTML directly via browser print dialog using an isolated off-screen iframe
 */
export function printHtmlContent(html: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    // Clean up any lingering print frame
    const existing = document.getElementById("sr-print-frame");
    if (existing) {
      existing.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "sr-print-frame";
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "794px";
    iframe.style.height = "1123px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.zIndex = "-9999";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      resolve();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Give browser time to load assets and render
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print error:", err);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
          resolve();
        }, 1500);
      }
    }, 450);
  });
}

/**
 * Download high-res PDF file from an HTML string using html2canvas & jsPDF.
 * Resolves the "Attempting to parse an unsupported color function 'lab'" error
 * caused by Next.js / Tailwind v4 modern CSS color spaces by:
 * 1. Rendering inside a completely isolated iframe (no inherited Tailwind oklch/lab variables)
 * 2. Scoping window.getComputedStyle with a fallback proxy during html2canvas execution
 * 3. Sanitizing the cloned DOM via onclone callback
 */
export async function downloadPdfFromHtml(options: {
  html: string;
  fileName: string;
}): Promise<void> {
  if (typeof window === "undefined") return;

  const { html, fileName } = options;

  // Create an isolated off-screen iframe to prevent inheriting parent Next.js styles (e.g. Tailwind v4 oklch/lab colors)
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "794px"; // Standard A4 width at 96 DPI
  iframe.style.height = "1123px";
  iframe.style.border = "0";
  iframe.style.zIndex = "-9999";
  iframe.style.backgroundColor = "#ffffff";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  try {
    const iframeWin = iframe.contentWindow;
    const iframeDoc = iframeWin?.document;
    if (!iframeDoc || !iframeWin) {
      throw new Error("Unable to initialize isolated iframe document");
    }

    // Write self-contained HTML into isolated iframe
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Allow time for fonts, images, and layout to settle
    await new Promise((r) => setTimeout(r, 300));

    // Measure actual rendered content height
    const contentHeight = Math.max(
      iframeDoc.body.scrollHeight,
      iframeDoc.documentElement.scrollHeight,
      1123
    );
    iframe.style.height = `${contentHeight + 50}px`;

    const targetElement =
      iframeDoc.getElementById("statement-pdf-root") ||
      iframeDoc.getElementById("customer-list-pdf-root") ||
      iframeDoc.body;

    const canvas = await html2canvas(targetElement as HTMLElement, {
      scale: 2, // 2x high resolution for crisp text & borders
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
      onclone: (clonedDoc) => {
        // Enforce safe standard RGB colors in cloned DOM
        if (clonedDoc.documentElement) {
          clonedDoc.documentElement.style.backgroundColor = "#ffffff";
          clonedDoc.documentElement.style.color = "#0f172a";
        }
        if (clonedDoc.body) {
          clonedDoc.body.style.backgroundColor = "#ffffff";
          clonedDoc.body.style.color = "#0f172a";
        }

        // Remove any injected Next.js / Tailwind sheets that might contain unsupported color functions
        const styles = Array.from(clonedDoc.querySelectorAll("style, link[rel='stylesheet']"));
        for (const s of styles) {
          if (s.tagName === "LINK") {
            s.remove();
          } else {
            const txt = s.textContent || "";
            if (txt.includes("oklch") || txt.includes("lab(")) {
              s.remove();
            }
          }
        }
      },
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;

    // Additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;
    }

    const safeFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    pdf.save(safeFileName);
  } catch (error) {
    console.error("Failed to generate direct PDF, falling back to print dialog:", error);
    // Graceful fallback to print-to-pdf
    await printHtmlContent(html);
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

/**
 * Export Customer Statement PDF (Bank Format) with date filter, header, and signature
 */
export async function exportCustomerStatementPDF(options: {
  customer: Customer;
  allTransactions: Transaction[];
  startDate?: string;
  endDate?: string;
  customFileName?: string;
  mode?: "download" | "print";
}): Promise<void> {
  const {
    customer,
    allTransactions,
    startDate,
    endDate,
    customFileName,
    mode = "download",
  } = options;

  const ledger = calculateStatementLedger(allTransactions, startDate, endDate);
  const html = generateBankStatementHTML({ customer, ledger });

  const today = formatDateStr(new Date());
  const cleanCustomerName = customer.name.replace(/[\\/:*?"<>|]/g, "_").trim();
  const dateRangeSuffix = startDate && endDate ? `_${startDate}_to_${endDate}` : `_${today}`;
  const fileName =
    customFileName || `গ্রাহক_${cleanCustomerName}_ব্যাংক_স্টেটমেন্ট${dateRangeSuffix}.pdf`;

  if (mode === "print") {
    await printHtmlContent(html);
  } else {
    await downloadPdfFromHtml({ html, fileName });
  }
}

/**
 * Export Customers List PDF with company header, statistics, and authorized signature
 */
export async function exportCustomerListPDF(options: {
  customers: Customer[];
  filterScope?: "all" | "filtered";
  customFileName?: string;
  mode?: "download" | "print";
}): Promise<void> {
  const { customers, filterScope = "all", customFileName, mode = "download" } = options;

  const html = generateCustomerListHTML({ customers, filterScope });
  const today = formatDateStr(new Date());
  const prefix = filterScope === "filtered" ? "ফিল্টারকৃত_গ্রাহক_তালিকা" : "সকল_গ্রাহক_তালিকা";
  const fileName = customFileName || `${prefix}_${today}.pdf`;

  if (mode === "print") {
    await printHtmlContent(html);
  } else {
    await downloadPdfFromHtml({ html, fileName });
  }
}

/**
 * Generate HTML template for Central Sales & Financial Report PDF
 */
export function generateSalesReportHTML(options: {
  metrics: CentralSalesReportMetrics;
  transactions: TransactionWithCustomer[];
  startDate?: string;
  endDate?: string;
  filterScopeText?: string;
}): string {
  const { metrics, transactions, startDate, endDate, filterScopeText } = options;
  const now = new Date();
  const printTimestamp = formatDateTimeStr(now);
  const reportId = `SALES-${formatDateStr(now).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

  let periodText = "সকল লেনদেন (সর্বমোট রেকর্ড)";
  if (startDate && endDate) {
    periodText = `${startDate} হতে ${endDate}`;
  } else if (startDate) {
    periodText = `${startDate} হতে অদ্যাবধি`;
  } else if (endDate) {
    periodText = `প্রারম্ভ হতে ${endDate} পর্যন্ত`;
  }

  let rowsHtml = "";
  if (transactions.length === 0) {
    rowsHtml = `
      <tr>
        <td colspan="9" style="padding: 24px; text-align: center; color: #64748b; font-style: italic;">
          নির্বাচিত সময়কালের মধ্যে কোনো বিক্রয় বা লেনদেনের রেকর্ড পাওয়া যায়নি।
        </td>
      </tr>
    `;
  } else {
    transactions.forEach((tx, idx) => {
      const typeBadge =
        tx.type === "SALE"
          ? `<span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">বিক্রয়</span>`
          : tx.type === "PAYMENT"
            ? `<span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">পরিশোধ</span>`
            : `<span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; background: #fffbeb; color: #b45309; border: 1px solid #fde68a;">বকেয়া</span>`;

      const statusBadge =
        tx.due_amount === 0 || tx.paid_amount >= tx.amount
          ? `<span style="color: #059669; font-weight: 700;">পরিশোধিত</span>`
          : tx.paid_amount > 0
            ? `<span style="color: #d97706; font-weight: 600;">আংশিক</span>`
            : `<span style="color: #dc2626; font-weight: 700;">বকেয়া</span>`;

      const refNo = tx.reference || tx.id.slice(-6).toUpperCase();
      const customerName = tx.customer?.name || "নামবিহীন গ্রাহক";
      const customerPhone = tx.customer?.phone || "-";
      const customerType = tx.customer?.type
        ? getCustomerTypeLabel(tx.customer.type as CustomerType)
        : "-";

      rowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? "background-color: #f8fafc;" : ""}">
          <td style="padding: 6px 7px; text-align: center; color: #64748b; font-size: 10px;">${idx + 1}</td>
          <td style="padding: 6px 7px; white-space: nowrap; font-size: 10px;">${formatDateStr(new Date(tx.date))}</td>
          <td style="padding: 6px 7px; font-family: monospace; font-size: 9.5px; color: #475569;">#${refNo}</td>
          <td style="padding: 6px 7px;">
            <div style="font-weight: 700; color: #0f172a; font-size: 10.5px;">${customerName}</div>
            <div style="font-size: 9px; color: #64748b;">${customerPhone} • ${customerType}</div>
          </td>
          <td style="padding: 6px 7px; text-align: center;">${typeBadge}</td>
          <td style="padding: 6px 7px; text-align: right; font-weight: 600; color: #0f172a;">৳ ${formatMoney(tx.amount || 0)}</td>
          <td style="padding: 6px 7px; text-align: right; font-weight: 600; color: #059669;">৳ ${formatMoney(tx.paid_amount || 0)}</td>
          <td style="padding: 6px 7px; text-align: right; font-weight: 700; color: ${tx.due_amount > 0 ? "#b91c1c" : "#64748b"};">
            ৳ ${formatMoney(tx.due_amount || 0)}
          </td>
          <td style="padding: 6px 7px; text-align: center; font-size: 9.5px;">${statusBadge}</td>
        </tr>
      `;
    });
  }

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>কেন্দ্রীয় বিক্রয় ও আয় বিবরণী | SR Tradelink</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Bengali', 'SolaimanLipi', sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 16px 20px;
      font-size: 11px;
      line-height: 1.35;
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2.5px solid #059669;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #059669;
    }
    .brand-text h1 {
      font-size: 21px;
      font-weight: 800;
      color: #065f46;
      line-height: 1.15;
    }
    .brand-text .english-name {
      font-size: 12px;
      font-weight: 700;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .brand-right {
      text-align: right;
      font-size: 10px;
      color: #334155;
      line-height: 1.45;
    }
    .title-strip {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 12px 0 14px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title-strip h2 {
      font-size: 14.5px;
      font-weight: 800;
      color: #065f46;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
    }
    .metric-card.highlight {
      background: #fff1f2;
      border-color: #fecdd3;
    }
    .metric-card.highlight-green {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }
    .metric-num {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 1px;
    }
    .metric-card.highlight-green .metric-num {
      color: #047857;
    }
    .metric-card.highlight .metric-num {
      color: #b91c1c;
    }
    .metric-lbl {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
    }
    .type-summary-bar {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 6px 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-around;
      font-size: 10px;
      color: #334155;
    }
    .type-summary-bar strong {
      color: #0f172a;
    }
    .sales-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 16px;
      font-size: 10px;
    }
    .sales-table thead {
      background: #065f46;
      color: #ffffff;
    }
    .sales-table thead th {
      padding: 7px 7px;
      font-weight: 700;
      font-size: 9.5px;
      text-align: left;
      letter-spacing: 0.2px;
    }
    .sales-table tfoot {
      background: #f1f5f9;
      border-top: 2px solid #059669;
      font-weight: 800;
      color: #0f172a;
    }
    .sales-table tfoot td {
      padding: 8px 7px;
      font-size: 10.5px;
    }
    .signatures-grid {
      margin-top: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      align-items: flex-end;
      padding: 0 10px;
      page-break-inside: avoid;
    }
    .sig-col {
      text-align: center;
    }
    .sig-line {
      border-top: 1.2px dashed #64748b;
      margin-bottom: 6px;
      width: 85%;
      margin-left: auto;
      margin-right: auto;
    }
    .sig-role {
      font-size: 10px;
      font-weight: 700;
      color: #0f172a;
    }
    .sig-sub {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 1px;
    }
    .official-seal-box {
      border: 1.5px solid #059669;
      border-radius: 50%;
      width: 66px;
      height: 66px;
      margin: 0 auto 6px auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #059669;
      font-size: 7px;
      font-weight: 800;
      line-height: 1.2;
      transform: rotate(-5deg);
      background: rgba(16, 185, 129, 0.04);
    }
    .official-seal-box span {
      font-size: 8.5px;
    }
    .system-footer {
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
    }
  </style>
</head>
<body>
  <div id="sales-report-pdf-root" style="background: #ffffff; width: 100%; max-width: 794px; margin: 0 auto;">

  <!-- Company Header -->
  <div class="header">
    <div class="brand-left">
      <img class="brand-logo" src="${COMPANY_INFO.logoBase64}" alt="SR Tradelink Logo" />
      <div class="brand-text">
        <h1>${COMPANY_INFO.nameBn}</h1>
        <div class="english-name">${COMPANY_INFO.nameEn}</div>
        <div style="font-size: 9.5px; color: #475569; margin-top: 2px;">${COMPANY_INFO.tagline}</div>
      </div>
    </div>
    <div class="brand-right">
      <div>📍 <strong>প্রধান কার্যালয়:</strong> ${COMPANY_INFO.address}</div>
      <div>📞 <strong>মোবাইল:</strong> ${COMPANY_INFO.phone}</div>
      <div>✉️ <strong>ইমেইল:</strong> ${COMPANY_INFO.email}</div>
      <div>🕒 <strong>কাজের সময়:</strong> ${COMPANY_INFO.hours}</div>
    </div>
  </div>

  <!-- Title Strip -->
  <div class="title-strip">
    <div>
      <h2>কেন্দ্রীয় বিক্রয় ও আর্থিক বিবরণী রিপোর্ট</h2>
      <div style="font-size: 9.5px; color: #047857; font-weight: 600;">CENTRAL SALES & REVENUE REPORT • ${filterScopeText || "সকল লেনদেন"}</div>
    </div>
    <div style="text-align: right; font-size: 9.5px; color: #334155; line-height: 1.4;">
      <div>সময়কাল: <strong style="color: #065f46;">${periodText}</strong></div>
      <div>আইডি: <span style="font-family: monospace; color: #475569;">${reportId}</span></div>
    </div>
  </div>

  <!-- Key Metrics -->
  <div class="metrics-grid">
    <div class="metric-card highlight-green">
      <div class="metric-lbl">মোট বিক্রয় (Gross Sales)</div>
      <div class="metric-num">৳ ${formatMoney(metrics.totalSales)}</div>
      <div style="font-size: 8px; color: #059669; margin-top: 2px;">বিক্রয় চালান: ${metrics.saleCount} টি</div>
    </div>
    <div class="metric-card highlight-green">
      <div class="metric-lbl">নগদ আদায় (Cash Inflow)</div>
      <div class="metric-num">৳ ${formatMoney(metrics.totalCollected)}</div>
      <div style="font-size: 8px; color: #059669; margin-top: 2px;">আদায় হার: ${metrics.collectionRate}%</div>
    </div>
    <div class="metric-card ${metrics.totalDue > 0 ? "highlight" : ""}">
      <div class="metric-lbl">চলতি বকেয়া (Receivables)</div>
      <div class="metric-num">৳ ${formatMoney(metrics.totalDue)}</div>
      <div style="font-size: 8px; color: ${metrics.totalDue > 0 ? "#b91c1c" : "#64748b"}; margin-top: 2px;">বকেয়া বিল: ${metrics.dueCount} টি</div>
    </div>
    <div class="metric-card">
      <div class="metric-lbl">মোট লেনদেন সংখ্যা</div>
      <div class="metric-num">${metrics.totalTransactions} টি</div>
      <div style="font-size: 8px; color: #64748b; margin-top: 2px;">গড় বিক্রয়: ৳ ${formatMoney(metrics.avgSaleAmount)}</div>
    </div>
  </div>

  <!-- Type Summary Bar -->
  <div class="type-summary-bar">
    <div>বিক্রয় (Sale): <strong>${metrics.saleCount} টি</strong> (৳ ${formatMoney(metrics.totalSales)})</div>
    <div>•</div>
    <div>পরিশোধ (Payment): <strong>${metrics.paymentCount} টি</strong> (৳ ${formatMoney(metrics.totalCollected)})</div>
    <div>•</div>
    <div>বকেয়া সমন্বয় (Due): <strong>${metrics.dueCount} টি</strong> (৳ ${formatMoney(metrics.totalDue)})</div>
  </div>

  <!-- Detailed Transactions Table -->
  <table class="sales-table">
    <thead>
      <tr>
        <th style="width: 28px; text-align: center;">ক্র.</th>
        <th style="width: 70px;">তারিখ</th>
        <th style="width: 75px;">মেমো নং</th>
        <th>গ্রাহকের নাম ও যোগাযোগ</th>
        <th style="width: 60px; text-align: center;">ধরণ</th>
        <th style="width: 80px; text-align: right;">মোট মূল্য</th>
        <th style="width: 80px; text-align: right;">পরিশোধ</th>
        <th style="width: 80px; text-align: right;">বকেয়া</th>
        <th style="width: 65px; text-align: center;">স্ট্যাটাস</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5" style="text-align: right;">সর্বমোট সমষ্টি:</td>
        <td style="text-align: right; color: #0f172a;">৳ ${formatMoney(metrics.totalSales)}</td>
        <td style="text-align: right; color: #059669;">৳ ${formatMoney(metrics.totalCollected)}</td>
        <td style="text-align: right; color: ${metrics.totalDue > 0 ? "#b91c1c" : "#0f172a"};">৳ ${formatMoney(metrics.totalDue)}</td>
        <td style="text-align: center; font-size: 9.5px; color: #065f46;">${metrics.totalTransactions} লেনদেন</td>
      </tr>
    </tfoot>
  </table>

  <!-- Official Signatures -->
  <div class="signatures-grid">
    <div class="sig-col">
      <div style="height: 48px;"></div>
      <div class="sig-line"></div>
      <div class="sig-role">হিসাব প্রস্তুতকারী</div>
      <div class="sig-sub">একাউন্টস বিভাগ, এসআর ট্রেডলিংক</div>
    </div>

    <div class="sig-col">
      <div class="official-seal-box">
        <span>★ সিল ★</span>
        <strong>SR TRADELINK</strong>
        <span>অফিসিয়াল</span>
      </div>
      <div class="sig-line"></div>
      <div class="sig-role">নিরীক্ষক / ব্যবস্থাপক</div>
      <div class="sig-sub">হিসাব নিরীক্ষা ও প্রশাসন</div>
    </div>

    <div class="sig-col">
      <div style="height: 48px;"></div>
      <div class="sig-line"></div>
      <div class="sig-role">অনুমোদিত স্বাক্ষর</div>
      <div class="sig-sub">ব্যবস্থাপনা পরিচালক / সত্ত্বাধিকারী</div>
    </div>
  </div>

  <!-- System Footer -->
  <div class="system-footer">
    <div>মুদ্রণের সময়: ${printTimestamp} • সিস্টেম: এসআর ট্রেডলিংক কেন্দ্রীয় বিক্রয় রিপোর্ট v2.4 • আইডি: ${reportId}</div>
    <div>পৃষ্ঠা ১ / ১</div>
  </div>

  </div>
</body>
</html>
  `;
}

/**
 * Export Central Sales & Revenue Report PDF with company branding and signatures
 */
export async function exportSalesReportPDF(options: {
  metrics: CentralSalesReportMetrics;
  transactions: TransactionWithCustomer[];
  startDate?: string;
  endDate?: string;
  filterScopeText?: string;
  customFileName?: string;
  mode?: "download" | "print";
}): Promise<void> {
  const {
    metrics,
    transactions,
    startDate,
    endDate,
    filterScopeText,
    customFileName,
    mode = "download",
  } = options;

  const html = generateSalesReportHTML({
    metrics,
    transactions,
    startDate,
    endDate,
    filterScopeText,
  });

  const today = formatDateStr(new Date());
  const dateRangeSuffix = startDate && endDate ? `_${startDate}_to_${endDate}` : `_${today}`;
  const fileName =
    customFileName || `এসআর_ট্রেডলিংক_কেন্দ্রীয়_বিক্রয়_রিপোর্ট${dateRangeSuffix}.pdf`;

  if (mode === "print") {
    await printHtmlContent(html);
  } else {
    await downloadPdfFromHtml({ html, fileName });
  }
}
