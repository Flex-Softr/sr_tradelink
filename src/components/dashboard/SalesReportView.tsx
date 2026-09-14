"use client";

import { useEffect, useState, useTransition } from "react";

import Link from "next/link";

import {
  RiArrowDownLine,
  RiArrowRightUpLine,
  RiCalendarLine,
  RiCheckDoubleLine,
  RiCloseLine,
  RiDownload2Line,
  RiExchangeDollarLine,
  RiFileExcelLine,
  RiFileList3Line,
  RiFilePdfLine,
  RiFilter3Line,
  RiInformationLine,
  RiMoneyDollarCircleLine,
  RiPrinterLine,
  RiRefreshLine,
  RiSearchLine,
  RiUser3Line,
  RiVipCrownLine,
  RiWallet3Line,
} from "@remixicon/react";

import { fetchCentralSalesReportAction } from "@/actions/transactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Customer } from "@/lib/customers";
import { exportSalesReportPDF } from "@/lib/pdf-export";
import { exportCentralSalesReportToCSV, exportCentralSalesReportToExcel } from "@/lib/sheet-export";
import type {
  CentralSalesReportResult,
  GetCentralSalesReportOptions,
  TransactionType,
} from "@/lib/transactions";

interface SalesReportViewProps {
  initialCustomers?: Customer[];
  initialData?: CentralSalesReportResult;
}

type PeriodPreset = "today" | "week" | "month" | "30days" | "year" | "all" | "custom";

function formatMoney(amount: number | null | undefined): string {
  return Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateStr(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toISOString().split("T")[0];
  } catch {
    return "-";
  }
}

function getPresetDates(preset: PeriodPreset): { start: string; end: string } {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (preset === "today") {
    return { start: todayStr, end: todayStr };
  } else if (preset === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    return { start: formatDateStr(startOfWeek), end: todayStr };
  } else if (preset === "month") {
    return { start: `${yyyy}-${mm}-01`, end: todayStr };
  } else if (preset === "30days") {
    const past30 = new Date();
    past30.setDate(past30.getDate() - 30);
    return { start: formatDateStr(past30), end: todayStr };
  } else if (preset === "year") {
    return { start: `${yyyy}-01-01`, end: todayStr };
  }
  return { start: "", end: "" };
}

export default function SalesReportView({
  initialCustomers = [],
  initialData,
}: SalesReportViewProps) {
  const defaultDates = getPresetDates("month");

  // Filter States
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);
  const [selectedType, setSelectedType] = useState<TransactionType | "all">("all");
  const [selectedCustomerType, setSelectedCustomerType] = useState<string | "all">("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  // Data & Loading State
  const [reportData, setReportData] = useState<CentralSalesReportResult | null>(
    initialData || null
  );
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [topTab, setTopTab] = useState<"sales" | "due">("sales");

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // If initialData was not passed from server, load on mount
  useEffect(() => {
    if (!initialData) {
      let active = true;
      void (async () => {
        try {
          const res = await fetchCentralSalesReportAction({
            startDate: defaultDates.start,
            endDate: defaultDates.end,
            page: 1,
            limit: pageSize,
          });
          if (active) {
            setReportData(res);
            setIsLoading(false);
          }
        } catch (err) {
          if (active) {
            console.error("Initial sales report fetch failed:", err);
            setIsLoading(false);
          }
        }
      })();
      return () => {
        active = false;
      };
    }
  }, [initialData, defaultDates.start, defaultDates.end]);

  // Fetch Report Data
  const loadReportData = (page = 1, overrides?: Partial<GetCentralSalesReportOptions>) => {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const options: GetCentralSalesReportOptions = {
          startDate:
            overrides?.startDate !== undefined ? overrides.startDate : startDate || undefined,
          endDate: overrides?.endDate !== undefined ? overrides.endDate : endDate || undefined,
          type: overrides?.type !== undefined ? overrides.type : selectedType,
          customerType:
            overrides?.customerType !== undefined ? overrides.customerType : selectedCustomerType,
          customerId:
            overrides?.customerId !== undefined ? overrides.customerId : selectedCustomerId,
          search:
            overrides?.search !== undefined ? overrides.search : searchQuery.trim() || undefined,
          page,
          limit: pageSize,
        };

        const res = await fetchCentralSalesReportAction(options);
        setReportData(res);
        setCurrentPage(page);
      } catch (err: unknown) {
        console.error("Failed to load central sales report:", err);
        setFeedback({
          type: "error",
          message: "বিক্রয় রিপোর্ট লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।",
        });
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handlePresetChange = (newPreset: PeriodPreset) => {
    setPreset(newPreset);
    const dates = getPresetDates(newPreset);
    setStartDate(dates.start);
    setEndDate(dates.end);
    loadReportData(1, {
      startDate: dates.start || undefined,
      endDate: dates.end || undefined,
    });
  };

  const handleTypeChange = (newType: TransactionType | "all") => {
    setSelectedType(newType);
    loadReportData(1, { type: newType });
  };

  const handleCustomerChange = (newCustomerId: string) => {
    setSelectedCustomerId(newCustomerId);
    loadReportData(1, { customerId: newCustomerId });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReportData(1);
  };

  const handleResetFilters = () => {
    const dates = getPresetDates("month");
    setPreset("month");
    setStartDate(dates.start);
    setEndDate(dates.end);
    setSelectedType("all");
    setSelectedCustomerType("all");
    setSelectedCustomerId("all");
    setSearchQuery("");
    loadReportData(1, {
      startDate: dates.start,
      endDate: dates.end,
      type: "all",
      customerType: "all",
      customerId: "all",
      search: undefined,
    });
  };

  // Export handlers
  const handleExportPDF = async (mode: "download" | "print" = "download") => {
    if (!reportData || reportData.transactions.length === 0) {
      setFeedback({ type: "error", message: "এক্সপোর্ট করার মতো কোনো লেনদেন পাওয়া যায়নি।" });
      return;
    }

    try {
      setIsExporting(true);
      let filterScopeText = "চলতি মাস";
      if (startDate && endDate) {
        filterScopeText = `${startDate} হতে ${endDate}`;
      } else if (!startDate && !endDate) {
        filterScopeText = "সকল সময়কাল";
      }

      await exportSalesReportPDF({
        metrics: reportData.metrics,
        transactions: reportData.transactions,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        filterScopeText,
        mode,
      });

      setExportModalOpen(false);
      setFeedback({
        type: "success",
        message:
          mode === "print"
            ? "প্রিন্ট প্রিভিউ প্রস্তুত হয়েছে!"
            : "বিক্রয় রিপোর্ট PDF সফলভাবে ডাউনলোড হয়েছে!",
      });
    } catch (err) {
      console.error("PDF Export error:", err);
      setFeedback({ type: "error", message: "PDF রিপোর্ট তৈরি করতে ত্রুটি হয়েছে।" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (!reportData || reportData.transactions.length === 0) {
      setFeedback({ type: "error", message: "এক্সপোর্ট করার মতো কোনো লেনদেন নেই।" });
      return;
    }
    try {
      exportCentralSalesReportToExcel({
        metrics: reportData.metrics,
        transactions: reportData.transactions,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setExportModalOpen(false);
      setFeedback({ type: "success", message: "Excel ফাইল সফলভাবে ডাউনলোড হয়েছে!" });
    } catch (err) {
      console.error("Excel Export error:", err);
      setFeedback({ type: "error", message: "Excel ফাইল তৈরি করতে সমস্যা হয়েছে।" });
    }
  };

  const handleExportCSV = () => {
    if (!reportData || reportData.transactions.length === 0) {
      setFeedback({ type: "error", message: "এক্সপোর্ট করার মতো কোনো লেনদেন নেই।" });
      return;
    }
    try {
      exportCentralSalesReportToCSV({
        metrics: reportData.metrics,
        transactions: reportData.transactions,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setExportModalOpen(false);
      setFeedback({ type: "success", message: "CSV ফাইল সফলভাবে ডাউনলোড হয়েছে!" });
    } catch (err) {
      console.error("CSV Export error:", err);
      setFeedback({ type: "error", message: "CSV ফাইল তৈরি করতে সমস্যা হয়েছে।" });
    }
  };

  const metrics = reportData?.metrics || {
    totalSales: 0,
    totalCollected: 0,
    totalDue: 0,
    netTurnover: 0,
    collectionRate: 0,
    totalTransactions: 0,
    saleCount: 0,
    paymentCount: 0,
    dueCount: 0,
    avgSaleAmount: 0,
  };

  const transactions = reportData?.transactions || [];
  const dailyTrend = reportData?.dailyTrend || [];
  const topBySales = reportData?.topCustomersBySales || [];
  const topByDue = reportData?.topCustomersByDue || [];

  // Find max daily amount for chart scaling
  const maxDayAmount = Math.max(
    ...dailyTrend.map((d) => Math.max(d.sales, d.collected, d.due)),
    1000
  );

  return (
    <div className="space-y-6">
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium shadow-sm transition-all duration-300 ${
            feedback.type === "success"
              ? "border border-green-200 bg-green-50 text-green-800 dark:border-green-800/40 dark:bg-green-950/40 dark:text-green-300"
              : "border border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <RiCheckDoubleLine className="size-5 shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <RiInformationLine className="size-5 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>
      )}

      {/* Main Header & Quick Actions */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-linear-to-r from-emerald-50/50 via-white to-green-50/30 p-5 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:from-emerald-950/20 dark:via-slate-900 dark:to-green-950/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-900/60 dark:text-emerald-300">
              <RiExchangeDollarLine className="mr-1 size-3.5" />
              কেন্দ্রীয় বিক্রয় মডিউল
            </span>
            <Badge
              variant="outline"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              SR Tradelink Central Ledger
            </Badge>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            কেন্দ্রীয় বিক্রয় ও আর্থিক বিবরণী রিপোর্ট
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            প্রতিষ্ঠানটির সামগ্রিক বিক্রয়, নগদ আদায়, চলতি বকেয়া ও সময়ভিত্তিক ক্যাশফ্লো হিসাব
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadReportData(currentPage)}
            disabled={isLoading || isPending}
            className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RiRefreshLine
              className={`size-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`}
            />
            <span>রিফ্রেশ</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportPDF("print")}
            disabled={isExporting || isLoading || transactions.length === 0}
            className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RiPrinterLine className="size-4 text-slate-600 dark:text-slate-300" />
            <span>প্রিন্ট / প্রিভিউ</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setExportModalOpen(true)}
            className="gap-1.5 bg-emerald-700 text-white shadow-xs hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            <RiDownload2Line className="size-4" />
            <span>রিপোর্ট ডাউনলোড</span>
          </Button>
        </div>
      </div>

      {/* Date Filter & Presets Bar */}
      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            {/* Presets Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <RiCalendarLine className="size-4 text-emerald-600" />
                <span>সময়কাল নির্বাচন:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "today", label: "আজ" },
                    { id: "week", label: "এই সপ্তাহ" },
                    { id: "month", label: "এই মাস" },
                    { id: "30days", label: "৩০ দিন" },
                    { id: "year", label: "এই বছর" },
                    { id: "all", label: "সকল সময়" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetChange(p.id)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      preset === p.id
                        ? "bg-emerald-700 text-white shadow-xs dark:bg-emerald-600"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range & Attribute Filters */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  শুরুর তারিখ
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPreset("custom");
                  }}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  শেষের তারিখ
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPreset("custom");
                  }}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  লেনদেনের ধরণ
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => handleTypeChange(e.target.value as TransactionType | "all")}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="all">সকল লেনদেন (All)</option>
                  <option value="SALE">শুধুমাত্র বিক্রয় (Sales)</option>
                  <option value="PAYMENT">পরিশোধ / জমা (Payments)</option>
                  <option value="DUE">বকেয়া সমন্বয় (Due Entry)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  নির্দিষ্ট গ্রাহক
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="all">সকল গ্রাহক (All Customers)</option>
                  {initialCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  onClick={() => loadReportData(1)}
                  className="h-9 flex-1 gap-1 bg-emerald-700 text-xs text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  <RiFilter3Line className="size-3.5" />
                  ফিল্টার
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFilters}
                  className="h-9 gap-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  রিসেট
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4 Hero KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales */}
        <Card className="border-border/60 bg-linear-to-br from-emerald-50/50 to-white shadow-xs dark:from-emerald-950/20 dark:to-slate-900">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট বিক্রয় (Gross Sales)
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                <RiMoneyDollarCircleLine className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                ৳ {formatMoney(metrics.totalSales)}
              </h3>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>মোট বিক্রয় চালান:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {metrics.saleCount} টি
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Collected */}
        <Card className="border-border/60 bg-linear-to-br from-green-50/50 to-white shadow-xs dark:from-green-950/20 dark:to-slate-900">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                নগদ আদায় (Cash Collection)
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300">
                <RiWallet3Line className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black tracking-tight text-green-700 sm:text-3xl dark:text-green-400">
                ৳ {formatMoney(metrics.totalCollected)}
              </h3>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>আদায় অনুপাত:</span>
              <span className="font-bold text-green-700 dark:text-green-400">
                {metrics.collectionRate}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Due */}
        <Card
          className={`border-border/60 shadow-xs transition-all ${
            metrics.totalDue > 0
              ? "bg-linear-to-br from-rose-50/60 to-white dark:from-rose-950/20 dark:to-slate-900"
              : "bg-white dark:bg-slate-900"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                চলতি বকেয়া (Receivables)
              </span>
              <div
                className={`flex size-9 items-center justify-center rounded-lg ${
                  metrics.totalDue > 0
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                }`}
              >
                <RiArrowDownLine className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <h3
                className={`text-2xl font-black tracking-tight sm:text-3xl ${
                  metrics.totalDue > 0
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-slate-800 dark:text-slate-200"
                }`}
              >
                ৳ {formatMoney(metrics.totalDue)}
              </h3>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>বকেয়া চালানের সংখ্যা:</span>
              <span
                className={`font-bold ${
                  metrics.totalDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-600"
                }`}
              >
                {metrics.dueCount} টি
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Transactions & Ticket Size */}
        <Card className="border-border/60 bg-linear-to-br from-slate-50 to-white shadow-xs dark:from-slate-900/60 dark:to-slate-900">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট লেনদেন সংখ্যা
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                <RiFileList3Line className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {metrics.totalTransactions} টি
              </h3>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>গড় চালান মূল্য:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                ৳ {formatMoney(metrics.avgSaleAmount)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Daily Sales & Collection Trend */}
      {dailyTrend.length > 0 && (
        <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                দৈনিক বিক্রয় ও নগদ আদায় ট্রেন্ড (Daily Cashflow Trend)
              </CardTitle>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                নির্বাচিত সময়কালে দিনভিত্তিক মোট বিক্রয় ও নগদ আদায় চিত্র
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-xs bg-emerald-600"></span>
                <span className="text-slate-600 dark:text-slate-400">বিক্রয় (Sales)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-xs bg-blue-600"></span>
                <span className="text-slate-600 dark:text-slate-400">আদায় (Paid)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-xs bg-rose-500"></span>
                <span className="text-slate-600 dark:text-slate-400">বকেয়া (Due)</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 pb-3">
            <div className="grid auto-cols-max grid-flow-col items-end gap-3 overflow-x-auto pb-2">
              {dailyTrend.map((day) => {
                const salesHeight = Math.max(8, Math.round((day.sales / maxDayAmount) * 110));
                const paidHeight = Math.max(8, Math.round((day.collected / maxDayAmount) * 110));
                const dueHeight = Math.max(4, Math.round((day.due / maxDayAmount) * 110));

                return (
                  <div
                    key={day.date}
                    className="flex w-16 flex-col items-center gap-1.5 text-center transition-all hover:opacity-90"
                    title={`${day.date}\nবিক্রয়: ৳ ${day.sales}\nআদায়: ৳ ${day.collected}\nবকেয়া: ৳ ${day.due}`}
                  >
                    <div className="flex h-32 items-end justify-center gap-1">
                      {/* Sales Bar */}
                      <div
                        style={{ height: `${salesHeight}px` }}
                        className="w-3 rounded-t-sm bg-emerald-600 transition-all hover:bg-emerald-700"
                      />
                      {/* Collected Bar */}
                      <div
                        style={{ height: `${paidHeight}px` }}
                        className="w-3 rounded-t-sm bg-blue-600 transition-all hover:bg-blue-700"
                      />
                      {/* Due Bar */}
                      {day.due > 0 && (
                        <div
                          style={{ height: `${dueHeight}px` }}
                          className="w-2 rounded-t-sm bg-rose-500 transition-all hover:bg-rose-600"
                        />
                      )}
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {day.displayDate}
                    </span>
                    <span className="text-[10px] font-bold text-slate-900 dark:text-white">
                      ৳ {day.sales >= 1000 ? `${(day.sales / 1000).toFixed(1)}k` : day.sales}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two Comparative Analytics Panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Panel 1: Breakdown by Transaction Type & Customer Category */}
        <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800/80">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
              লেনদেন ও গ্রাহক ধরণ বিশ্লেষণ (Breakdown by Category)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Transaction Types */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  বিক্রয় চালান (Sales): {metrics.saleCount} টি
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ৳ {formatMoney(metrics.totalSales)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-emerald-600"
                  style={{
                    width: `${metrics.totalSales > 0 ? 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  নগদ আদায় / কিস্তি জমা (Payments): {metrics.paymentCount} টি
                </span>
                <span className="font-bold text-green-700 dark:text-green-400">
                  ৳ {formatMoney(metrics.totalCollected)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-blue-600"
                  style={{
                    width: `${Math.min(100, metrics.collectionRate)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  বকেয়া সমন্বয় (Due Adjustment): {metrics.dueCount} টি
                </span>
                <span className="font-bold text-rose-700 dark:text-rose-400">
                  ৳ {formatMoney(metrics.totalDue)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-rose-500"
                  style={{
                    width: `${
                      metrics.totalSales > 0
                        ? Math.min(100, (metrics.totalDue / metrics.totalSales) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Wholesale vs Retail quick stat */}
            <div className="mt-4 rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  পাইকারি বিক্রয় (Wholesale):
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  ৳ {formatMoney(reportData?.customerTypeBreakdown.wholesaleSales || 0)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">খুচরা বিক্রয় (Retail):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  ৳ {formatMoney(reportData?.customerTypeBreakdown.retailSales || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel 2: Top Customers by Sales vs Due Monitoring */}
        <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTopTab("sales")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  topTab === "sales"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                শীর্ষ ক্রেতা (Top Buyers)
              </button>
              <button
                type="button"
                onClick={() => setTopTab("due")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  topTab === "due"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                বকেয়াপ্রাপ্ত গ্রাহক (Pending Due)
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            {topTab === "sales" ? (
              topBySales.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  কোনো বিক্রয়ের রেকর্ড পাওয়া যায়নি
                </div>
              ) : (
                <div className="space-y-2.5">
                  {topBySales.map((cust, idx) => (
                    <div
                      key={cust.customerId}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-2.5 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/dashboard/customers/${cust.customerId}`}
                              className="text-xs font-bold text-slate-900 hover:text-emerald-600 dark:text-white"
                            >
                              {cust.customerName}
                            </Link>
                            {cust.isVip && (
                              <span title="VIP">
                                <RiVipCrownLine className="size-3.5 text-amber-500" />
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">{cust.phone || "-"}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-slate-900 dark:text-white">
                          ৳ {formatMoney(cust.totalSales)}
                        </div>
                        <span className="text-[10px] text-slate-500">চালান: {cust.txCount} টি</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : topByDue.length === 0 ? (
              <div className="py-6 text-center text-xs font-semibold text-emerald-600">
                ✓ কোনো অনাদায়ী বকেয়া গ্রাহক নেই!
              </div>
            ) : (
              <div className="space-y-2.5">
                {topByDue.map((cust, idx) => (
                  <div
                    key={cust.customerId}
                    className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/30 p-2.5 transition hover:bg-rose-50/60 dark:border-rose-950/40 dark:bg-rose-950/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-6 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-800 dark:bg-rose-900/60 dark:text-rose-300">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/dashboard/customers/${cust.customerId}`}
                            className="text-xs font-bold text-slate-900 hover:text-rose-600 dark:text-white"
                          >
                            {cust.customerName}
                          </Link>
                          {cust.isVip && (
                            <span title="VIP">
                              <RiVipCrownLine className="size-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">{cust.phone || "-"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-rose-700 dark:text-rose-400">
                        ৳ {formatMoney(cust.totalDue)}
                      </div>
                      <Link
                        href={`/dashboard/customers/${cust.customerId}`}
                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 hover:underline"
                      >
                        আদায় করুন <RiArrowRightUpLine className="size-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Central Transactions Detailed Table */}
      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center dark:border-slate-800/80">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              সার্বিক লেনদেন খতিয়ান (Central Transactions Ledger)
            </CardTitle>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              সর্বমোট {reportData?.total || 0} টি লেনদেনের বিস্তারিত বিবরণ ও হিসাব
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <RiSearchLine className="absolute top-2.5 left-2.5 size-4 text-slate-400" />
              <Input
                type="text"
                placeholder="গ্রাহক, মোবাইল, মেমো নং..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-60 pl-8 text-xs"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs">
              খুঁজুন
            </Button>
          </form>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="py-3 pr-2 pl-4 text-center">ক্র.</th>
                  <th className="px-3 py-3">তারিখ ও সময়</th>
                  <th className="px-3 py-3">ভাউচার / মেমো</th>
                  <th className="px-3 py-3">গ্রাহকের নাম ও যোগাযোগ</th>
                  <th className="px-3 py-3 text-center">লেনদেন ধরণ</th>
                  <th className="px-3 py-3 text-right">মোট মূল্য</th>
                  <th className="px-3 py-3 text-right">পরিশোধ</th>
                  <th className="px-3 py-3 text-right">অবশিষ্ট বকেয়া</th>
                  <th className="px-3 py-3 text-center">স্ট্যাটাস</th>
                  <th className="py-3 pr-4 pl-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <RiRefreshLine className="mx-auto size-6 animate-spin text-emerald-600" />
                      <span className="mt-2 block text-xs">বিক্রয় ডেটা লোড হচ্ছে...</span>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <RiFileList3Line className="mx-auto size-9 text-slate-300 dark:text-slate-600" />
                      <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        কোনো লেনদেন পাওয়া যায়নি
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        তারিখ বা সার্চ ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="mt-3 text-xs"
                      >
                        ফিল্টার রিসেট করুন
                      </Button>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx, index) => {
                    const serialNumber = (currentPage - 1) * pageSize + index + 1;
                    const refNo = tx.reference || tx.id.slice(-6).toUpperCase();
                    const isFullyPaid = tx.due_amount === 0 || tx.paid_amount >= tx.amount;
                    const isPartial = !isFullyPaid && tx.paid_amount > 0;

                    return (
                      <tr
                        key={tx.id}
                        className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-3 pr-2 pl-4 text-center font-mono text-slate-400">
                          {serialNumber}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatDateStr(tx.date)}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(tx.date).toLocaleTimeString("bn-BD", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          #{refNo}
                        </td>
                        <td className="px-3 py-3">
                          {tx.customer ? (
                            <div>
                              <div className="flex items-center gap-1">
                                <Link
                                  href={`/dashboard/customers/${tx.customer.id}`}
                                  className="font-bold text-slate-900 hover:text-emerald-600 dark:text-white"
                                >
                                  {tx.customer.name}
                                </Link>
                                {tx.customer.is_vip && (
                                  <span title="VIP">
                                    <RiVipCrownLine className="size-3 text-amber-500" />
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {tx.customer.phone || "-"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">গ্রাহকের নাম নেই</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {tx.type === "SALE" ? (
                            <Badge className="border-emerald-300/40 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              বিক্রয় (Sale)
                            </Badge>
                          ) : tx.type === "PAYMENT" ? (
                            <Badge className="border-blue-300/40 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              পরিশোধ (Paid)
                            </Badge>
                          ) : (
                            <Badge className="border-amber-300/40 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              বকেয়া (Due)
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white">
                          ৳ {formatMoney(tx.amount)}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                          ৳ {formatMoney(tx.paid_amount)}
                        </td>
                        <td
                          className={`px-3 py-3 text-right font-bold ${
                            tx.due_amount > 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-400"
                          }`}
                        >
                          ৳ {formatMoney(tx.due_amount)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {isFullyPaid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 ring-1 ring-green-600/20 ring-inset dark:bg-green-950/40 dark:text-green-300">
                              পরিশোধিত
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-600/20 ring-inset dark:bg-amber-950/40 dark:text-amber-300">
                              আংশিক পরিশোধ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-600/20 ring-inset dark:bg-rose-950/40 dark:text-rose-300">
                              সম্পূর্ণ বকেয়া
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 pl-3 text-center">
                          {tx.customer && (
                            <Link
                              href={`/dashboard/customers/${tx.customer.id}`}
                              className="inline-flex items-center gap-1 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                              title="গ্রাহকের খতিয়ান দেখুন"
                            >
                              <RiUser3Line className="size-4" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {reportData && reportData.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                পৃষ্ঠা {currentPage} / {reportData.totalPages} (মোট {reportData.total} টি রেকর্ড)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isLoading}
                  onClick={() => loadReportData(currentPage - 1)}
                  className="h-8 text-xs"
                >
                  পূর্ববর্তী
                </Button>
                {Array.from({ length: Math.min(5, reportData.totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (reportData.totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > reportData.totalPages) {
                      pageNum = reportData.totalPages - (4 - i);
                    }
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadReportData(pageNum)}
                      className={`size-8 p-0 text-xs ${
                        currentPage === pageNum
                          ? "bg-emerald-700 text-white hover:bg-emerald-800"
                          : ""
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= reportData.totalPages || isLoading}
                  onClick={() => loadReportData(currentPage + 1)}
                  className="h-8 text-xs"
                >
                  পরবর্তী
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Selection Dialog Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              বিক্রয় রিপোর্ট এক্সপোর্ট করুন
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              এসআর ট্রেডলিংক এর প্রাতিষ্ঠানিক হেডার ও সিল সম্বলিত রিপোর্ট ডাউনলোড করুন।
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* PDF Bank & Executive Statement */}
            <button
              type="button"
              onClick={() => handleExportPDF("download")}
              disabled={isExporting}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-emerald-500 hover:bg-emerald-50/40 dark:border-slate-800 dark:hover:bg-emerald-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
                  <RiFilePdfLine className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    অফিসিয়াল PDF রিপোর্ট (.pdf)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    কোম্পানি হেডার, ৩টি অনুমোদিত সিল ও স্বাক্ষর সহ সম্পূর্ণ A4 স্টেটমেন্ট
                  </p>
                </div>
              </div>
              <RiDownload2Line className="size-4 text-slate-400" />
            </button>

            {/* Print Direct */}
            <button
              type="button"
              onClick={() => handleExportPDF("print")}
              disabled={isExporting}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-blue-500 hover:bg-blue-50/40 dark:border-slate-800 dark:hover:bg-blue-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  <RiPrinterLine className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    সরাসরি প্রিন্ট / প্রিভিউ
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    ব্রাউজার প্রিন্টার ডায়ালগ ওপেন করে তাৎক্ষণিক হার্ডকপি প্রিন্ট করুন
                  </p>
                </div>
              </div>
              <RiArrowRightUpLine className="size-4 text-slate-400" />
            </button>

            {/* Excel Sheet */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-emerald-500 hover:bg-emerald-50/40 dark:border-slate-800 dark:hover:bg-emerald-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                  <RiFileExcelLine className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Excel স্প্রেডশিট (.xlsx)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    অডিট ও ডেটা অ্যানালাইসিসের জন্য স্প্রেডশিট ডেটাসেট
                  </p>
                </div>
              </div>
              <RiDownload2Line className="size-4 text-slate-400" />
            </button>

            {/* CSV File */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <RiFileList3Line className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    CSV ডেটা ফাইল (.csv)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    অন্যান্য একাউন্টিং সফটওয়্যারে ইমপোর্ট করার উপযোগী
                  </p>
                </div>
              </div>
              <RiDownload2Line className="size-4 text-slate-400" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
