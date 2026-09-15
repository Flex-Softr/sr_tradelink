"use client";

import { useMemo, useState, useTransition } from "react";

import Link from "next/link";

import {
  RiArrowLeftSLine,
  RiCalendarLine,
  RiCheckLine,
  RiCloseLine,
  RiCoinsLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiEditLine,
  RiErrorWarningLine,
  RiExchangeDollarLine,
  RiEyeLine,
  RiFileExcel2Line,
  RiFilePdf2Line,
  RiFileTextLine,
  RiFilterLine,
  RiHandCoinLine,
  RiLoader4Line,
  RiMailLine,
  RiMapPinLine,
  RiPhoneLine,
  RiPrinterLine,
  RiRefreshLine,
  RiSearchLine,
  RiShieldCheckLine,
  RiShoppingBag3Line,
  RiVipCrownLine,
  RiWallet3Line,
} from "@remixicon/react";

import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "@/actions/transactions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import type { Customer, CustomerType } from "@/lib/customers";
import {
  calculateStatementLedger,
  exportCustomerStatementPDF,
  formatMoney,
} from "@/lib/pdf-export";
import {
  exportCustomerTransactionsToCSV,
  exportCustomerTransactionsToExcel,
} from "@/lib/sheet-export";
import {
  type CustomerTransactionSummary,
  type Transaction,
  type TransactionInput,
  type TransactionType,
} from "@/lib/transactions";

interface CustomerDetailsViewProps {
  customer: Customer;
  initialTransactions: Transaction[];
  initialSummary: CustomerTransactionSummary;
}

const TRANSACTION_TYPES: {
  value: TransactionType;
  label: string;
  badgeClass: string;
  desc: string;
}[] = [
  {
    value: "SALE",
    label: "বিক্রয় (Sale)",
    badgeClass:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300",
    desc: "নতুন পণ্য বিক্রয় চালান",
  },
  {
    value: "PAYMENT",
    label: "পরিশোধ / জমা (Payment)",
    badgeClass:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300",
    desc: "পূর্বের বকেয়া বা নগদ অর্থ প্রাপ্তি",
  },
  {
    value: "DUE",
    label: "বকেয়া যোগ (Due)",
    badgeClass:
      "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-950/60 dark:text-rose-300",
    desc: "প্রারম্ভিক বা পৃথক বকেয়া এন্ট্রি",
  },
];

function getCustomerTypeLabel(type: CustomerType) {
  switch (type) {
    case "WHOLESALE":
      return "পাইকারি";
    case "BOTH":
      return "খুচরা ও পাইকারি";
    case "RETAIL":
    default:
      return "খুচরা";
  }
}

function getTransactionTypeInfo(type: TransactionType) {
  return (
    TRANSACTION_TYPES.find((t) => t.value === type) || {
      value: type,
      label: type,
      badgeClass: "bg-slate-100 text-slate-700",
      desc: "",
    }
  );
}

export default function CustomerDetailsView({
  customer,
  initialTransactions,
  initialSummary,
}: CustomerDetailsViewProps) {
  const [transactionsList, setTransactionsList] = useState<Transaction[]>(initialTransactions);
  const [summary, setSummary] = useState<CustomerTransactionSummary>(initialSummary);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination state (20 items per page default)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Date filtering state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [datePreset, setDatePreset] = useState<string>("all");

  // Export Dialog States
  const [exportFormat, setExportFormat] = useState<"pdf" | "xlsx" | "csv">("pdf");
  const [exportScope, setExportScope] = useState<"all" | "filtered" | "custom">("all");
  const [exportStartDate, setExportStartDate] = useState<string>("");
  const [exportEndDate, setExportEndDate] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Helper to apply quick date presets
  const applyDatePreset = (preset: string, target: "filter" | "export") => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    let start = "";
    let end = todayStr;

    switch (preset) {
      case "today":
        start = todayStr;
        end = todayStr;
        break;
      case "this_week": {
        const d = new Date(today);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        start = monday.toISOString().split("T")[0];
        break;
      }
      case "this_month": {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        start = firstDay.toISOString().split("T")[0];
        break;
      }
      case "last_30_days": {
        const past30 = new Date();
        past30.setDate(past30.getDate() - 30);
        start = past30.toISOString().split("T")[0];
        break;
      }
      case "this_year": {
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        start = firstDayOfYear.toISOString().split("T")[0];
        break;
      }
      case "all":
      default:
        start = "";
        end = "";
        break;
    }

    if (target === "filter") {
      setDatePreset(preset);
      setStartDate(start);
      setEndDate(end);
      setCurrentPage(1);
    } else {
      setExportStartDate(start);
      setExportEndDate(end);
    }
  };

  // Active transaction
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    type: TransactionType;
    amount: string | number;
    paid_amount: string | number;
    due_amount: string | number;
    description: string;
    reference: string;
    date: string;
  }>({
    type: "SALE",
    amount: "",
    paid_amount: "",
    due_amount: "",
    description: "",
    reference: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // Toast / notification
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showFeedback = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Recompute summary locally when list changes
  const recalculateSummary = (list: Transaction[]) => {
    let sales = 0;
    let paid = 0;
    let dueAddition = 0;

    for (const t of list) {
      if (t.type === "SALE") {
        sales += t.amount || 0;
        paid += t.paid_amount || 0;
      } else if (t.type === "PAYMENT") {
        paid += t.paid_amount || t.amount || 0;
      } else if (t.type === "DUE") {
        dueAddition += t.amount || t.due_amount || 0;
        paid += t.paid_amount || 0;
      }
    }

    const netDue = Math.max(0, sales + dueAddition - paid);
    setSummary({
      totalSales: parseFloat(sales.toFixed(2)),
      totalPaid: parseFloat(paid.toFixed(2)),
      totalDue: parseFloat(netDue.toFixed(2)),
      transactionCount: list.length,
    });
  };

  // Filtered transactions (with search, type, and date range)
  const filteredTransactions = useMemo(() => {
    return transactionsList.filter((tx) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (tx.description && tx.description.toLowerCase().includes(term)) ||
        (tx.reference && tx.reference.toLowerCase().includes(term)) ||
        String(tx.amount).includes(term) ||
        String(tx.due_amount).includes(term);

      const matchesType = selectedTypeFilter === "all" || tx.type === selectedTypeFilter;

      const txDate = tx.date ? new Date(tx.date).toISOString().split("T")[0] : "";
      const matchesStart = !startDate || (txDate && txDate >= startDate);
      const matchesEnd = !endDate || (txDate && txDate <= endDate);

      return matchesSearch && matchesType && matchesStart && matchesEnd;
    });
  }, [transactionsList, searchTerm, selectedTypeFilter, startDate, endDate]);

  // Real-time ledger summary for the selected export scope / dates
  const currentExportLedger = useMemo(() => {
    let effStart = "";
    let effEnd = "";

    if (exportScope === "filtered") {
      effStart = startDate;
      effEnd = endDate;
    } else if (exportScope === "custom") {
      effStart = exportStartDate;
      effEnd = exportEndDate;
    }

    return calculateStatementLedger(transactionsList, effStart, effEnd);
  }, [transactionsList, exportScope, startDate, endDate, exportStartDate, exportEndDate]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Refresh data from server
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/transactions?limit=1000`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTransactionsList(data.data);
        if (data.summary) {
          setSummary(data.summary);
        } else {
          recalculateSummary(data.data);
        }
        showFeedback("success", "লেনদেন তালিকা সফলভাবে রিফ্রেশ করা হয়েছে");
      }
    } catch {
      showFeedback("error", "রিফ্রেশ করতে সমস্যা হয়েছে");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export customer transactions (PDF Statement / Excel / CSV)
  const handleExportTransactions = async (
    format: "pdf" | "xlsx" | "csv",
    mode: "download" | "print" = "download"
  ) => {
    let effStart = "";
    let effEnd = "";

    if (exportScope === "filtered") {
      effStart = startDate;
      effEnd = endDate;
    } else if (exportScope === "custom") {
      effStart = exportStartDate;
      effEnd = exportEndDate;
    }

    const ledger = calculateStatementLedger(transactionsList, effStart, effEnd);

    if (ledger.entries.length === 0 && !ledger.startDate) {
      showFeedback("error", "ডাউনলোড করার মতো কোনো লেনদেন নেই");
      return;
    }

    if (format === "pdf") {
      try {
        setIsGeneratingPdf(true);
        await exportCustomerStatementPDF({
          customer,
          allTransactions: transactionsList,
          startDate: effStart,
          endDate: effEnd,
          mode,
        });
        setIsExportOpen(false);
        showFeedback(
          "success",
          mode === "print"
            ? `${customer.name} এর ব্যাংক স্টেটমেন্ট প্রিন্ট প্রিভিউ প্রস্তুত হয়েছে!`
            : `${customer.name} এর ব্যাংক স্টেটমেন্ট PDF সফলভাবে ডাউনলোড হয়েছে!`
        );
      } catch (err) {
        console.error("PDF Export error:", err);
        showFeedback("error", "পিডিএফ স্টেটমেন্ট তৈরি করতে সমস্যা হয়েছে");
      } finally {
        setIsGeneratingPdf(false);
      }
      return;
    }

    const listToExport = ledger.entries;
    if (format === "xlsx") {
      exportCustomerTransactionsToExcel({
        customer,
        transactions: listToExport,
        summary: {
          totalSales: ledger.totalDebit,
          totalPaid: ledger.totalCredit,
          totalDue: ledger.closingBalance,
          transactionCount: listToExport.length,
        },
      });
    } else {
      exportCustomerTransactionsToCSV({
        customer,
        transactions: listToExport,
        summary: {
          totalSales: ledger.totalDebit,
          totalPaid: ledger.totalCredit,
          totalDue: ledger.closingBalance,
          transactionCount: listToExport.length,
        },
      });
    }

    setIsExportOpen(false);
    showFeedback(
      "success",
      `${customer.name} এর ${listToExport.length} টি লেনদেনের শিট সফলভাবে ডাউনলোড হয়েছে!`
    );
  };

  // Amount & Paid change handler with auto due calculation (can be manually overridden)
  const handleAmountChange = (val: string) => {
    const numAmount = parseFloat(val) || 0;
    const numPaid = parseFloat(String(formData.paid_amount)) || 0;
    setFormData((prev) => ({
      ...prev,
      amount: val,
      due_amount: prev.type === "SALE" ? Math.max(0, numAmount - numPaid) : prev.due_amount,
    }));
  };

  const handlePaidChange = (val: string) => {
    const numPaid = parseFloat(val) || 0;
    const numAmount = parseFloat(String(formData.amount)) || 0;
    setFormData((prev) => ({
      ...prev,
      paid_amount: val,
      due_amount: prev.type === "SALE" ? Math.max(0, numAmount - numPaid) : prev.due_amount,
    }));
  };

  // Open Add Dialog
  const openAddDialog = () => {
    setFormData({
      type: "SALE",
      amount: "",
      paid_amount: "",
      due_amount: "",
      description: "",
      reference: "",
      date: new Date().toISOString().split("T")[0],
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (tx: Transaction) => {
    setActiveTx(tx);
    const dateStr = tx.date
      ? new Date(tx.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    setFormData({
      type: tx.type,
      amount: tx.amount,
      paid_amount: tx.paid_amount,
      due_amount: tx.due_amount,
      description: tx.description || "",
      reference: tx.reference || "",
      date: dateStr,
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  // Open Delete Dialog
  const openDeleteDialog = (tx: Transaction) => {
    setActiveTx(tx);
    setIsDeleteOpen(true);
  };

  // Open Preview Dialog
  const openPreviewDialog = (tx: Transaction) => {
    setActiveTx(tx);
    setIsPreviewOpen(true);
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};
    const numAmount = parseFloat(String(formData.amount));

    if (isNaN(numAmount) || numAmount < 0) {
      errors.amount = "সঠিক টাকার পরিমাণ দিন (০ বা তার বেশি)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: TransactionInput = {
      customer_id: customer.id,
      type: formData.type,
      amount: parseFloat(String(formData.amount)) || 0,
      paid_amount: parseFloat(String(formData.paid_amount)) || 0,
      due_amount: parseFloat(String(formData.due_amount)) || 0,
      description: formData.description.trim() || null,
      reference: formData.reference.trim() || null,
      date: formData.date ? new Date(formData.date) : new Date(),
    };

    startTransition(async () => {
      const res = await createTransactionAction(payload);
      if (res.success && res.data) {
        const updatedList = [res.data, ...transactionsList];
        setTransactionsList(updatedList);
        recalculateSummary(updatedList);
        setIsAddOpen(false);
        showFeedback("success", "নতুন লেনদেন সফলভাবে যুক্ত করা হয়েছে!");
      } else {
        showFeedback("error", res.error || "লেনদেন যুক্ত করতে সমস্যা হয়েছে");
      }
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTx || !validateForm()) return;

    const payload: Partial<TransactionInput> = {
      type: formData.type,
      amount: parseFloat(String(formData.amount)) || 0,
      paid_amount: parseFloat(String(formData.paid_amount)) || 0,
      due_amount: parseFloat(String(formData.due_amount)) || 0,
      description: formData.description.trim() || null,
      reference: formData.reference.trim() || null,
      date: formData.date ? new Date(formData.date) : new Date(),
    };

    startTransition(async () => {
      const res = await updateTransactionAction(activeTx.id, customer.id, payload);
      if (res.success && res.data) {
        const updatedList = transactionsList.map((t) => (t.id === activeTx.id ? res.data! : t));
        setTransactionsList(updatedList);
        recalculateSummary(updatedList);
        setIsEditOpen(false);
        showFeedback("success", "লেনদেন সফলভাবে আপডেট করা হয়েছে!");
        setActiveTx(null);
      } else {
        showFeedback("error", res.error || "লেনদেন আপডেট করতে সমস্যা হয়েছে");
      }
    });
  };

  // Handle Delete Submit
  const handleDeleteSubmit = () => {
    if (!activeTx) return;

    startTransition(async () => {
      const res = await deleteTransactionAction(activeTx.id, customer.id);
      if (res.success) {
        const updatedList = transactionsList.filter((t) => t.id !== activeTx.id);
        setTransactionsList(updatedList);
        recalculateSummary(updatedList);
        setIsDeleteOpen(false);
        showFeedback("success", "লেনদেন সফলভাবে মুছে ফেলা হয়েছে!");
        setActiveTx(null);
      } else {
        showFeedback("error", res.error || "লেনদেন মুছে ফেলতে সমস্যা হয়েছে");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`animate-in fade-in slide-in-from-top-3 fixed top-5 right-5 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all ${
            notification.type === "success"
              ? "border border-emerald-500/50 bg-emerald-900/90 text-white backdrop-blur-md"
              : "border border-rose-500/50 bg-rose-900/90 text-white backdrop-blur-md"
          }`}
        >
          {notification.type === "success" ? (
            <RiCheckLine className="size-5 shrink-0 text-emerald-300" />
          ) : (
            <RiErrorWarningLine className="size-5 shrink-0 text-rose-300" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 rounded p-1 hover:bg-white/20"
            aria-label="বিজ্ঞপ্তি বন্ধ করুন"
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>
      )}

      {/* Customer Header Card */}
      <Card className="border-border/60 overflow-hidden shadow-sm">
        <div className="bg-linear-to-r from-green-700 to-emerald-800 p-6 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="size-16 shadow-md ring-4 ring-white/20">
                <AvatarFallback className="bg-white text-xl font-bold text-green-800">
                  {customer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
                  {customer.is_vip && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-slate-900 shadow-xs">
                      <RiVipCrownLine className="size-3.5" />
                      VIP সদস্য
                    </span>
                  )}
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-xs">
                    {getCustomerTypeLabel(customer.type)}
                  </span>
                </div>

                <p className="mt-1 font-mono text-xs text-green-100">গ্রাহক আইডি: {customer.id}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/dashboard/customers"
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white shadow-xs backdrop-blur-xs transition hover:bg-white/20"
              >
                <RiArrowLeftSLine className="size-4" />
                গ্রাহক তালিকায় ফিরে যান
              </Link>

              <Button
                onClick={() => {
                  setExportFormat("pdf");
                  setIsExportOpen(true);
                }}
                size="sm"
                className="gap-1.5 border border-white/20 bg-emerald-950/40 text-xs font-semibold text-white shadow-xs backdrop-blur-xs hover:bg-emerald-950/70"
                title="গ্রাহকের ব্যাংক ফরম্যাট লেনদেন স্টেটমেন্ট PDF তৈরি বা প্রিন্ট করুন"
              >
                <RiFilePdf2Line className="size-4 text-emerald-300" />
                <span>স্টেটমেন্ট PDF</span>
              </Button>

              <Button
                onClick={() => {
                  setExportFormat("xlsx");
                  setIsExportOpen(true);
                }}
                size="sm"
                className="gap-1.5 border border-white/20 bg-emerald-950/40 text-xs font-semibold text-white shadow-xs backdrop-blur-xs hover:bg-emerald-950/70"
                title="গ্রাহকের সকল লেনদেন এক্সেল বা সিএসভি শিট ফরম্যাটে ডাউনলোড করুন"
              >
                <RiFileExcel2Line className="size-4 text-emerald-300" />
                <span>খতিয়ান শিট</span>
              </Button>

              <Button
                onClick={openAddDialog}
                size="sm"
                className="bg-white text-xs font-semibold text-green-900 shadow-sm hover:bg-green-50"
              >
                <RiHandCoinLine className="mr-1 size-4 text-green-700" />
                নতুন লেনদেন এন্ট্রি
              </Button>
            </div>
          </div>
        </div>

        {/* Customer Contact Details Strip */}
        <div className="grid grid-cols-1 divide-y border-t border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5 py-2 sm:px-4 sm:py-0">
            <RiPhoneLine className="size-4 shrink-0 text-green-600 dark:text-green-400" />
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">মোবাইল নম্বর</p>
              {customer.phone ? (
                <a
                  href={`tel:${customer.phone}`}
                  className="block truncate text-xs font-semibold text-slate-900 hover:underline dark:text-white"
                >
                  {customer.phone}
                </a>
              ) : (
                <span className="text-xs text-slate-400">প্রদান করা হয়নি</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 py-2 sm:px-4 sm:py-0">
            <RiMailLine className="size-4 shrink-0 text-green-600 dark:text-green-400" />
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">ইমেইল ঠিকানা</p>
              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="block truncate text-xs font-semibold text-slate-900 hover:underline dark:text-white"
                >
                  {customer.email}
                </a>
              ) : (
                <span className="text-xs text-slate-400">প্রদান করা হয়নি</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 py-2 sm:px-4 sm:py-0">
            <RiMapPinLine className="size-4 shrink-0 text-green-600 dark:text-green-400" />
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">ঠিকানা</p>
              <p className="line-clamp-1 text-xs font-semibold text-slate-900 dark:text-white">
                {customer.address || "প্রদান করা হয়নি"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Total Sales */}
        <Card className="border-border/60 border shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              <RiShoppingBag3Line className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট বিক্রয় (Sales)
              </p>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                ৳ {summary.totalSales.toLocaleString("en-IN")}
              </h3>
              <p className="text-[11px] font-medium text-blue-700 dark:text-blue-400">
                সর্বমোট বিক্রির পরিমাণ
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Paid */}
        <Card className="border-border/60 border shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <RiWallet3Line className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট পরিশোধ (Paid)
              </p>
              <h3 className="text-xl font-bold tracking-tight text-emerald-700 sm:text-2xl dark:text-emerald-400">
                ৳ {summary.totalPaid.toLocaleString("en-IN")}
              </h3>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                নগদ আদায়কৃত অর্থ
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Due */}
        <Card
          className={`border shadow-xs ${
            summary.totalDue > 0
              ? "border-rose-500/40 bg-rose-50/30 dark:bg-rose-950/20"
              : "border-border/60"
          }`}
        >
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                summary.totalDue > 0
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <RiCoinsLine className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                বর্তমান মোট বকেয়া (Due)
              </p>
              <h3
                className={`text-xl font-bold tracking-tight sm:text-2xl ${
                  summary.totalDue > 0
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                ৳ {summary.totalDue.toLocaleString("en-IN")}
              </h3>
              <p
                className={`text-[11px] font-medium ${
                  summary.totalDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-green-600"
                }`}
              >
                {summary.totalDue > 0 ? "বকেয়া পাওনা রয়েছে" : "কোনো বকেয়া নেই"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Transactions Count */}
        <Card className="border-border/60 border shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              <RiExchangeDollarLine className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">মোট লেনদেন</p>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                {summary.transactionCount}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">ভাউচার ও মেমো রেকর্ড</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                <RiFileTextLine className="size-5 text-green-600 dark:text-green-400" />
                সকল লেনদেন ও বিক্রয়-বকেয়া খতিয়ান
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
              >
                মোট {filteredTransactions.length} টি রেকর্ড
              </Badge>
            </div>
            <CardDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              পণ্য বিক্রির হিসাব, নগদ জমা ও অবশিষ্ট বকেয়ার ম্যানুয়াল ভাউচার তালিকা
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isPending}
              className="border-slate-300 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              <RiRefreshLine className={`mr-1.5 size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              রিফ্রেশ
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExportFormat("pdf");
                setIsExportOpen(true);
              }}
              className="gap-1.5 border-emerald-600/30 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              title="গ্রাহকের ব্যাংক লেনদেন বিবরণী PDF ডাউনলোড বা প্রিন্ট করুন"
            >
              <RiFilePdf2Line className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>স্টেটমেন্ট PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExportFormat("xlsx");
                setIsExportOpen(true);
              }}
              className="gap-1.5 border-slate-300 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              title="সকল লেনদেনের খতিয়ান শিট ডাউনলোড করুন"
            >
              <RiFileExcel2Line className="size-3.5 text-slate-600 dark:text-slate-400" />
              <span>শিট ডাউনলোড</span>
            </Button>

            <Button
              onClick={openAddDialog}
              size="sm"
              className="bg-green-600 text-xs text-white shadow-xs hover:bg-green-700"
            >
              <RiHandCoinLine className="mr-1.5 size-3.5" />
              নতুন লেনদেন যোগ করুন
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          {/* Search, Type and Date Filters */}
          <div className="flex flex-col gap-3">
            {/* Top row: Search & Type */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search Box */}
              <div className="relative max-w-md flex-1">
                <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="বিবরণ, চালান বা ভাউচার নং দিয়ে খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 text-sm"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <RiCloseLine className="size-4" />
                  </button>
                )}
              </div>

              {/* Type and Preset Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <RiFilterLine className="size-3.5" />
                  <span>ধরন:</span>
                </div>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => {
                    setSelectedTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs focus:border-green-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="all">সকল ধরন ({transactionsList.length})</option>
                  <option value="SALE">বিক্রয় (SALE)</option>
                  <option value="PAYMENT">পরিশোধ (PAYMENT)</option>
                  <option value="DUE">বকেয়া (DUE)</option>
                </select>
              </div>
            </div>

            {/* Bottom row: Bank-Style Date-wise Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-emerald-950/10 bg-emerald-50/40 p-2.5 text-xs dark:border-emerald-500/10 dark:bg-emerald-950/20">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                  <RiCalendarLine className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>তারিখ অনুসারে ফিল্টার:</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400">হতে</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset("custom");
                      setCurrentPage(1);
                    }}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-800 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400">পর্যন্ত</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset("custom");
                      setCurrentPage(1);
                    }}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-800 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { id: "all", label: "সকল সময়" },
                    { id: "today", label: "আজ" },
                    { id: "this_week", label: "এই সপ্তাহ" },
                    { id: "this_month", label: "এই মাস" },
                    { id: "last_30_days", label: "৩০ দিন" },
                    { id: "this_year", label: "এই বছর" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyDatePreset(p.id, "filter")}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                        datePreset === p.id && !startDate && !endDate && p.id === "all"
                          ? "bg-emerald-600 text-white"
                          : datePreset === p.id && p.id !== "all"
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status & Reset */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  ফিল্টারে: <strong>{filteredTransactions.length}</strong> টি লেনদেন
                </span>
                {(startDate || endDate || searchTerm || selectedTypeFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedTypeFilter("all");
                      setStartDate("");
                      setEndDate("");
                      setDatePreset("all");
                      setCurrentPage(1);
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <RiCloseLine className="size-3.5" />
                    রিসেট
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 uppercase dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      তারিখ
                    </th>
                    <th scope="col" className="px-4 py-3">
                      চালান / মেমো নং
                    </th>
                    <th scope="col" className="px-4 py-3">
                      ধরন
                    </th>
                    <th scope="col" className="px-4 py-3">
                      বিবরণ / নোট
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      মোট টাকা
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      পরিশোধ
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      বকেয়া
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      অ্যাকশন
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <RiFileTextLine className="mb-2 size-10 text-slate-300 dark:text-slate-700" />
                          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                            কোনো লেনদেন পাওয়া যায়নি
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            এই গ্রাহকের জন্য এখনো কোনো বিক্রয় বা বকেয়া লেনদেন নথিভুক্ত করা হয়নি
                          </p>
                          <Button
                            onClick={openAddDialog}
                            size="sm"
                            className="mt-4 bg-green-600 text-xs text-white hover:bg-green-700"
                          >
                            প্রথম লেনদেন যোগ করুন
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => {
                      const typeInfo = getTransactionTypeInfo(tx.type);
                      const formattedDate = tx.date
                        ? new Date(tx.date).toLocaleDateString("bn-BD", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—";

                      return (
                        <tr
                          key={tx.id}
                          className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          {/* Date */}
                          <td className="px-4 py-3 text-xs font-medium whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {formattedDate}
                          </td>

                          {/* Reference / Invoice */}
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                            {tx.reference || "—"}
                          </td>

                          {/* Type Badge */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${typeInfo.badgeClass}`}
                            >
                              {typeInfo.label}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                            {tx.description || "—"}
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                            ৳ {tx.amount.toLocaleString("en-IN")}
                          </td>

                          {/* Paid */}
                          <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            ৳ {tx.paid_amount.toLocaleString("en-IN")}
                          </td>

                          {/* Due */}
                          <td className="px-4 py-3 text-right font-semibold">
                            {tx.due_amount > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400">
                                ৳ {tx.due_amount.toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="text-slate-400">৳ ০</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPreviewDialog(tx)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                title="রশিদ দেখুন"
                              >
                                <RiEyeLine className="size-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(tx)}
                                className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                                title="সম্পাদনা করুন"
                              >
                                <RiEditLine className="size-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteDialog(tx)}
                                className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                                title="মুছে ফেলুন"
                              >
                                <RiDeleteBinLine className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination component (20 items per page default) */}
            <div className="bg-slate-50/50 px-4 dark:bg-slate-900/50">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredTransactions.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemName="লেনদেন"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Add Transaction Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <RiHandCoinLine className="size-5 text-green-600" />
                নতুন লেনদেন ভাউচার তৈরি
              </DialogTitle>
              <DialogDescription>
                গ্রাহক <strong>{customer.name}</strong> এর জন্য বিক্রয়, পরিশোধ বা বকেয়ার তথ্য
                ম্যানুয়ালি লিপিবদ্ধ করুন।
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Type Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="tx-type">লেনদেনের ধরন (Transaction Type)</Label>
                <select
                  id="tx-type"
                  value={formData.type}
                  onChange={(e) => {
                    const newType = e.target.value as TransactionType;
                    setFormData((prev) => ({ ...prev, type: newType }));
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-green-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {TRANSACTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label} - {t.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Paid in 2 columns */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tx-amount">
                    {formData.type === "SALE"
                      ? "মোট বিক্রির পরিমাণ (৳)"
                      : formData.type === "PAYMENT"
                        ? "জমা / পরিশোধিত টাকা (৳)"
                        : "বকেয়ার পরিমাণ (৳)"}{" "}
                    <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="tx-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="০.০০"
                    value={formData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={formErrors.amount ? "border-rose-500" : ""}
                  />
                  {formErrors.amount && (
                    <p className="text-xs font-medium text-rose-500">{formErrors.amount}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tx-paid">নগদ পরিশোধ (৳)</Label>
                  <Input
                    id="tx-paid"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="০.০০"
                    value={formData.paid_amount}
                    onChange={(e) => handlePaidChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Due amount & Date */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tx-due">অবশিষ্ট বকেয়া (৳)</Label>
                  <Input
                    id="tx-due"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="০.০০"
                    value={formData.due_amount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, due_amount: e.target.value }))
                    }
                  />
                  <p className="text-[11px] text-slate-400">
                    স্বয়ংক্রিয় হিসাবের বাইরে ইচ্ছেমতো পরিবর্তন করতে পারেন
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tx-date">লেনদেনের তারিখ</Label>
                  <Input
                    id="tx-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Invoice / Reference */}
              <div className="space-y-1.5">
                <Label htmlFor="tx-ref">চালান বা মেমো নম্বর (ঐচ্ছিক)</Label>
                <Input
                  id="tx-ref"
                  placeholder="যেমন: INV-2026-001"
                  value={formData.reference}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reference: e.target.value }))}
                />
              </div>

              {/* Description / Note */}
              <div className="space-y-1.5">
                <Label htmlFor="tx-desc">পণ্যের বিবরণ / বিশেষ নোট</Label>
                <Textarea
                  id="tx-desc"
                  rows={3}
                  placeholder="যেমন: ৫০ বস্তা সরিষা খৈল ও ২০ কেজি বীজ সরবরাহ করা হয়েছে"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose render={<Button type="button" variant="outline" />}>বাতিল</DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {isPending ? (
                  <>
                    <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                    সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  "ভাউচার সংরক্ষণ করুন"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Edit Transaction Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <RiEditLine className="size-5 text-blue-600" />
                লেনদেন ভাউচার সম্পাদনা
              </DialogTitle>
              <DialogDescription>
                ভাউচারের তারিখ, মোট টাকা, পরিশোধ বা বকেয়ার তথ্য আপডেট করুন।
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Type */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-tx-type">লেনদেনের ধরন</Label>
                <select
                  id="edit-tx-type"
                  value={formData.type}
                  onChange={(e) => {
                    const newType = e.target.value as TransactionType;
                    setFormData((prev) => ({ ...prev, type: newType }));
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-blue-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {TRANSACTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Paid in 2 columns */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-tx-amount">মোট টাকা (৳)</Label>
                  <Input
                    id="edit-tx-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={formErrors.amount ? "border-rose-500" : ""}
                  />
                  {formErrors.amount && (
                    <p className="text-xs font-medium text-rose-500">{formErrors.amount}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-tx-paid">নগদ পরিশোধ (৳)</Label>
                  <Input
                    id="edit-tx-paid"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.paid_amount}
                    onChange={(e) => handlePaidChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Due & Date */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-tx-due">অবশিষ্ট বকেয়া (৳)</Label>
                  <Input
                    id="edit-tx-due"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.due_amount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, due_amount: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-tx-date">তারিখ</Label>
                  <Input
                    id="edit-tx-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Ref */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-tx-ref">চালান বা মেমো নম্বর</Label>
                <Input
                  id="edit-tx-ref"
                  value={formData.reference}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reference: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-tx-desc">পণ্যের বিবরণ / নোট</Label>
                <Textarea
                  id="edit-tx-desc"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose render={<Button type="button" variant="outline" />}>বাতিল</DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isPending ? (
                  <>
                    <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                    আপডেট হচ্ছে...
                  </>
                ) : (
                  "পরিবর্তন সংরক্ষণ করুন"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <RiErrorWarningLine className="size-5" />
              ভাউচার মুছে ফেলার নিশ্চিতকরণ
            </DialogTitle>
            <DialogDescription>
              আপনি কি নিশ্চিত যে আপনি <strong>{activeTx?.reference || "এই"}</strong> লেনদেনটি মুছে
              ফেলতে চান? গ্রাহকের মোট হিসাব থেকে এটি বাদ দেওয়া হবে।
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose render={<Button type="button" variant="outline" />}>
              বাতিল করুন
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleDeleteSubmit}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {isPending ? (
                <>
                  <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                  মুছে ফেলা হচ্ছে...
                </>
              ) : (
                "হ্যাঁ, নিশ্চিতভাবে মুছুন"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Preview Receipt Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <RiFileTextLine className="size-5" />
              লেনদেন ভাউচার রশিদ (Memo View)
            </DialogTitle>
          </DialogHeader>

          {activeTx && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-start justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {customer.name}
                    </h4>
                    <p className="text-xs text-slate-500">{customer.phone || "ফোন নম্বর নেই"}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        getTransactionTypeInfo(activeTx.type).badgeClass
                      }`}
                    >
                      {getTransactionTypeInfo(activeTx.type).label}
                    </span>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">
                      মেমো: {activeTx.reference || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 py-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">তারিখ:</span>
                    <span className="font-medium">
                      {activeTx.date
                        ? new Date(activeTx.date).toLocaleDateString("bn-BD", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                    <span className="font-semibold text-slate-600">মোট মূল্য:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ৳ {activeTx.amount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>পরিশোধিত:</span>
                    <span className="font-semibold">
                      ৳ {activeTx.paid_amount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-slate-100 pt-2 text-rose-600 dark:border-slate-800 dark:text-rose-400">
                    <span className="font-bold">অবশিষ্ট বকেয়া:</span>
                    <span className="font-bold">
                      ৳ {activeTx.due_amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {activeTx.description && (
                  <div className="border-t border-slate-200 pt-2 text-xs dark:border-slate-700">
                    <span className="mb-0.5 block text-slate-400">পণ্যের বিবরণ / নোট:</span>
                    <p className="text-slate-700 italic dark:text-slate-300">
                      &ldquo;{activeTx.description}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="w-full" />}>
              বন্ধ করুন
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Transactions Sheet & PDF Dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <div
                className={`flex size-8 items-center justify-center rounded-lg ${
                  exportFormat === "pdf"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                    : exportFormat === "xlsx"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {exportFormat === "pdf" ? (
                  <RiFilePdf2Line className="size-5" />
                ) : exportFormat === "xlsx" ? (
                  <RiFileExcel2Line className="size-5" />
                ) : (
                  <RiDownloadLine className="size-5" />
                )}
              </div>
              গ্রাহক হিসাব বিবরণী ও খতিয়ান ডাউনলোড
            </DialogTitle>
            <DialogDescription>
              {customer.name} এর ব্যাংক ফরম্যাট লেনদেন স্টেটমেন্ট (অফিসিয়াল হেডার ও সিল সহ) অথবা
              এক্সেল/সিএসভি শিট ডাউনলোড করুন
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Format Selector Tabs */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ফাইলের ফরম্যাট নির্বাচন করুন:
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat("pdf")}
                  className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-all ${
                    exportFormat === "pdf"
                      ? "border-emerald-600 bg-emerald-50/80 font-bold text-emerald-900 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <RiFilePdf2Line className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs">PDF স্টেটমেন্ট</span>
                  </div>
                  <span className="mt-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                    ব্যাংক ফরম্যাট ও সিল
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("xlsx")}
                  className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-all ${
                    exportFormat === "xlsx"
                      ? "border-emerald-600 bg-emerald-50/80 font-bold text-emerald-900 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <RiFileExcel2Line className="size-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs">Excel শিট</span>
                  </div>
                  <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    .xlsx স্প্রেডশিট
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("csv")}
                  className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-all ${
                    exportFormat === "csv"
                      ? "border-emerald-600 bg-emerald-50/80 font-bold text-emerald-900 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <RiDownloadLine className="size-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-xs">CSV ফাইল</span>
                  </div>
                  <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    .csv ডেটা
                  </span>
                </button>
              </div>
            </div>

            {/* Scope & Date Range Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                তারিখের আওতা (Date Range Scope):
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope("all")}
                  className={`rounded-lg border p-2 text-left transition-all ${
                    exportScope === "all"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                  }`}
                >
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                    সকল লেনদেন
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    মোট {transactionsList.length} টি
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope("filtered")}
                  className={`rounded-lg border p-2 text-left transition-all ${
                    exportScope === "filtered"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                  }`}
                >
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                    অন-স্ক্রিন ফিল্টার
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    বর্তমান {filteredTransactions.length} টি
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportScope("custom");
                    if (!exportStartDate && !exportEndDate) {
                      applyDatePreset("this_month", "export");
                    }
                  }}
                  className={`rounded-lg border p-2 text-left transition-all ${
                    exportScope === "custom"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                  }`}
                >
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                    কাস্টম তারিখ
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    নির্দিষ্ট সময়কাল
                  </span>
                </button>
              </div>

              {/* Custom Date Range Selector (When custom scope is selected) */}
              {exportScope === "custom" && (
                <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-slate-600 dark:text-slate-400">
                        শুরুর তারিখ (From Date):
                      </Label>
                      <input
                        type="date"
                        value={exportStartDate}
                        onChange={(e) => setExportStartDate(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-600 dark:text-slate-400">
                        শেষ তারিখ (To Date):
                      </Label>
                      <input
                        type="date"
                        value={exportEndDate}
                        onChange={(e) => setExportEndDate(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  {/* Preset Buttons for Export */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">প্রিসেট:</span>
                    {[
                      { id: "today", label: "আজ" },
                      { id: "this_week", label: "এই সপ্তাহ" },
                      { id: "this_month", label: "এই মাস" },
                      { id: "last_30_days", label: "৩০ দিন" },
                      { id: "this_year", label: "এই বছর" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyDatePreset(p.id, "export")}
                        className="rounded-md bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-700 shadow-2xs hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live Ledger Financial Summary Preview */}
            <div className="space-y-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  বিবরণীর হিসাব সারসংক্ষেপ:
                </span>
                <span>
                  সময়কাল:{" "}
                  <strong>
                    {currentExportLedger.startDate && currentExportLedger.endDate
                      ? `${currentExportLedger.startDate} হতে ${currentExportLedger.endDate}`
                      : currentExportLedger.startDate
                        ? `${currentExportLedger.startDate} হতে অদ্যাবধি`
                        : "সর্বমোট লেনদেন"}
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1 text-center text-xs">
                <div className="rounded-md border border-slate-100 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    প্রারম্ভিক জের
                  </span>
                  <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                    ৳ {formatMoney(currentExportLedger.openingBalance)}
                  </p>
                </div>
                <div className="rounded-md border border-slate-100 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    মোট বিক্রয়/ডেবিট
                  </span>
                  <p className="mt-0.5 font-bold text-blue-600 dark:text-blue-400">
                    ৳ {formatMoney(currentExportLedger.totalDebit)}
                  </p>
                </div>
                <div className="rounded-md border border-slate-100 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    মোট জমা/ক্রেডিট
                  </span>
                  <p className="mt-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                    ৳ {formatMoney(currentExportLedger.totalCredit)}
                  </p>
                </div>
                <div className="rounded-md border border-slate-100 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    সমাপনী বকেয়া
                  </span>
                  <p
                    className={`mt-0.5 font-bold ${
                      currentExportLedger.closingBalance > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    ৳ {formatMoney(currentExportLedger.closingBalance)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[10.5px] text-slate-500 dark:text-slate-400">
                <span>
                  অন্তর্ভুক্ত হবে: <strong>{currentExportLedger.transactionCount}</strong> টি ভাউচার
                </span>
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  {exportFormat === "pdf" ? "✓ অনুমোদিত সিল ও স্বাক্ষর সহ" : "✓ স্প্রেডশিট কলাম সহ"}
                </span>
              </div>
            </div>

            {/* Feature Highlights Note */}
            {exportFormat === "pdf" ? (
              <div className="space-y-1 rounded-lg bg-emerald-50/70 p-2.5 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                <div className="flex items-center gap-1.5 font-semibold">
                  <RiShieldCheckLine className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>ব্যাংক স্টেটমেন্ট PDF ফরম্যাটের সুবিধাসমূহ:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                  এসআর ট্রেডলিংক এর অফিসিয়াল হেডার, গ্রাহকের তথ্য, তারিখভিত্তিক প্রারম্ভিক ও সমাপনী
                  জের, প্রতিটি চালানের ডেবিট/ক্রেডিট ও রানিং ব্যালেন্স এবং হিসাবরক্ষক ও কর্তৃপক্ষের
                  অনুমোদিত স্বাক্ষর ও সিলসহ A4 সাইজে প্রস্তুত হবে।
                </p>
              </div>
            ) : (
              <div className="space-y-1 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  স্প্রেডশিটের বৈশিষ্ট্য:
                </p>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  প্রতিষ্ঠান ও গ্রাহকের নাম, তারিখ, চালান/মেমো নং, মোট টাকা, পরিশোধ, বকেয়া এবং
                  বিবরণ কলাম আকারে সাজানো থাকবে।
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <DialogClose render={<Button variant="outline" size="sm" />}>বাতিল</DialogClose>

            {exportFormat === "pdf" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportTransactions("pdf", "print")}
                  disabled={isGeneratingPdf}
                  className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  <RiPrinterLine className="size-4 text-slate-600" />
                  <span>প্রিন্ট / প্রিভিউ</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleExportTransactions("pdf", "download")}
                  disabled={isGeneratingPdf}
                  className="gap-1.5 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                >
                  {isGeneratingPdf ? (
                    <RiLoader4Line className="size-4 animate-spin" />
                  ) : (
                    <RiFilePdf2Line className="size-4" />
                  )}
                  <span>PDF স্টেটমেন্ট ডাউনলোড</span>
                </Button>
              </>
            ) : exportFormat === "xlsx" ? (
              <Button
                size="sm"
                onClick={() => handleExportTransactions("xlsx")}
                className="gap-1.5 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
              >
                <RiFileExcel2Line className="size-4" />
                <span>Excel (.xlsx) ডাউনলোড</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleExportTransactions("csv")}
                className="gap-1.5 bg-slate-800 text-white shadow-sm hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <RiDownloadLine className="size-4" />
                <span>CSV (.csv) ডাউনলোড</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
