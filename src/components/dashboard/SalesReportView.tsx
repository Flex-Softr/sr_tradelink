"use client";

import { useEffect, useState, useTransition } from "react";

import {
  RiArrowRightUpLine,
  RiCalendarLine,
  RiCheckDoubleLine,
  RiCloseLine,
  RiCoinsLine,
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
  RiScales3Line,
  RiSearchLine,
  RiShoppingBag3Line,
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
import { type PeriodPreset, getPresetDates } from "@/lib/date-presets";
import { exportSalesReportPDF } from "@/lib/pdf-export";
import type { Product } from "@/lib/products";
import { exportCentralSalesReportToCSV, exportCentralSalesReportToExcel } from "@/lib/sheet-export";
import type { CentralSalesReportResult, GetCentralSalesReportOptions } from "@/lib/transactions";

interface SalesReportViewProps {
  initialProducts?: Product[];
  initialCustomers?: Customer[];
  initialData?: CentralSalesReportResult;
  initialStartDate?: string;
  initialEndDate?: string;
  initialPreset?: PeriodPreset;
}

function formatMoney(amount: number | null | undefined): string {
  return Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SalesReportView({
  initialProducts = [],
  initialData,
  initialStartDate,
  initialEndDate,
  initialPreset = "month",
}: SalesReportViewProps) {
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);

  // Filter States: Default to initialPreset ("month")
  const defaultDates = getPresetDates(initialPreset);
  const [preset, setPreset] = useState<PeriodPreset>(initialPreset);
  const [startDate, setStartDate] = useState<string>(initialStartDate ?? defaultDates.start);
  const [endDate, setEndDate] = useState<string>(initialEndDate ?? defaultDates.end);
  const [selectedProductId, setSelectedProductId] = useState<string | "all">("all");
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

  // Fetch products if not passed initially
  useEffect(() => {
    if (initialProducts.length === 0) {
      let active = true;
      void (async () => {
        try {
          const res = await fetch("/api/products", { cache: "no-store" });
          const json = await res.json();
          if (active && json.success && Array.isArray(json.data)) {
            setProductsList(json.data);
          }
        } catch (err) {
          console.error("Failed to load products list:", err);
        }
      })();
      return () => {
        active = false;
      };
    }
  }, [initialProducts]);

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
            startDate: startDate || defaultDates.start,
            endDate: endDate || defaultDates.end,
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
  }, [initialData, startDate, endDate, defaultDates.start, defaultDates.end]);

  // Fetch Report Data
  const loadReportData = (page = 1, overrides?: Partial<GetCentralSalesReportOptions>) => {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const options: GetCentralSalesReportOptions = {
          startDate:
            overrides?.startDate !== undefined ? overrides.startDate : startDate || undefined,
          endDate: overrides?.endDate !== undefined ? overrides.endDate : endDate || undefined,
          productId: overrides?.productId !== undefined ? overrides.productId : selectedProductId,
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
          message: "পণ্য বিক্রয় রিপোর্ট লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।",
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

  const handleProductChange = (newProductId: string) => {
    setSelectedProductId(newProductId);
    loadReportData(1, { productId: newProductId });
  };

  const handleResetFilters = () => {
    const defaultDates = getPresetDates("month");
    setPreset("month");
    setStartDate(defaultDates.start);
    setEndDate(defaultDates.end);
    setSelectedProductId("all");
    setSearchQuery("");
    loadReportData(1, {
      startDate: defaultDates.start,
      endDate: defaultDates.end,
      productId: "all",
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
            : "পণ্য বিক্রয় রিপোর্ট PDF সফলভাবে ডাউনলোড হয়েছে!",
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
    totalSaleWeight: 0,
    totalPurchaseCost: 0,
    totalPurchaseWeight: 0,
    totalCollected: 0,
    totalDue: 0,
    netTurnover: 0,
    collectionRate: 0,
    totalTransactions: 0,
    avgSaleAmount: 0,
    avgSellRate: 0,
    avgBuyRate: 0,
    simpleProfit: 0,
    otherCosts: 0,
    netProfit: 0,
  };

  const transactions = reportData?.transactions || [];
  const dailyTrend = reportData?.dailyTrend || [];
  const productsSummary = reportData?.productsSummary || [];

  // Find max daily amount for chart scaling
  const maxDayAmount = Math.max(
    ...dailyTrend.map((d) => Math.max(d.sales, d.purchases || 0)),
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
              <RiShoppingBag3Line className="mr-1 size-3.5" />
              পণ্য বিক্রয় মডিউল
            </span>
            <Badge
              variant="outline"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              SR Tradelink Product Ledger
            </Badge>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            পণ্য বিক্রয় ও আর্থিক বিবরণী রিপোর্ট
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            পণ্য মডিউলের লেনদেন ভিত্তিক মোট বিক্রয়, বিক্রয় ওজন, ক্রয় ব্যয়, মুনাফা ও ক্যাশফ্লো
            হিসাব
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

      {/* Date & Product Filter Bar */}
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
                  নির্দিষ্ট পণ্য
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="all">সকল পণ্য (All Products)</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.subtitle ? `(${p.subtitle})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  পণ্য সার্চ
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="পণ্যের নাম খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") loadReportData(1);
                    }}
                    className="h-9 pr-8 text-xs"
                  />
                  <RiSearchLine className="absolute top-2.5 right-2.5 size-4 text-slate-400" />
                </div>
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

      {/* 6 Hero KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Sales */}
        <Card className="border-border/60 bg-linear-to-br from-emerald-50/50 to-white shadow-xs dark:from-emerald-950/20 dark:to-slate-900">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট বিক্রয় মূল্য (Gross Sales)
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
              <span>মোট লেনদেন সংখ্যা:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {metrics.totalTransactions} টি
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Sale Weight */}
        <Card className="border-border/60 bg-linear-to-br from-blue-50/50 to-white shadow-xs dark:from-blue-950/20 dark:to-slate-900">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট বিক্রয় ওজন (Sales Volume)
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                <RiScales3Line className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black tracking-tight text-blue-700 sm:text-3xl dark:text-blue-400">
                {formatMoney(metrics.totalSaleWeight)} kg
              </h3>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>গড় বিক্রয় দর:</span>
              <span className="font-bold text-blue-700 dark:text-blue-400">
                ৳ {formatMoney(metrics.avgSellRate)} / kg
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Purchase Cost */}
        <Card className="border-border/60 bg-linear-to-br from-indigo-50/50 to-white shadow-xs dark:from-indigo-950/20 dark:to-slate-900">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট ক্রয় ব্যয় (Purchase Cost)
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                <RiShoppingBag3Line className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                ৳ {formatMoney(metrics.totalPurchaseCost)}
              </h3>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>ক্রয় ওজন:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {formatMoney(metrics.totalPurchaseWeight)} kg (দর: ৳{" "}
                {formatMoney(metrics.avgBuyRate)}/kg)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* সরল মুনাফা (Simple Profit) */}
        <Card className="border-border/60 bg-linear-to-br from-amber-50/60 via-white to-amber-50/30 shadow-xs dark:from-amber-950/20 dark:via-slate-900 dark:to-amber-950/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                সরল মুনাফা (Simple Profit)
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                <RiCoinsLine className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black tracking-tight text-amber-700 sm:text-3xl dark:text-amber-400">
                ৳ {formatMoney(metrics.simpleProfit)}
              </h3>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>হিসাব ভিত্তি:</span>
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                বিক্রিত পণ্যের দর ও ক্রয়মূল্য পার্থক্য
              </span>
            </div>
          </CardContent>
        </Card>

        {/* মোট অন্যান্য খরচ (Total Other Costs) */}
        <Card className="border-border/60 bg-linear-to-br from-slate-50 to-white shadow-xs dark:from-slate-900/60 dark:to-slate-900">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট অন্যান্য খরচ (Other Costs)
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <RiFileList3Line className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl dark:text-slate-100">
                ৳ {formatMoney(metrics.otherCosts)}
              </h3>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>ব্যয়ের খাত:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                অফিস, পরিবহন ও বিবিধ খরচ
              </span>
            </div>
          </CardContent>
        </Card>

        {/* নিট লাভ (Net Profit) */}
        <Card
          className={`border-border/60 shadow-xs transition-all ${
            metrics.netProfit >= 0
              ? "bg-linear-to-br from-emerald-50/70 via-white to-teal-50/40 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20"
              : "bg-linear-to-br from-rose-50/70 via-white to-red-50/40 dark:from-rose-950/30 dark:via-slate-900 dark:to-red-950/20"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                নিট লাভ (Net Profit)
              </span>
              <div
                className={`flex size-9 items-center justify-center rounded-lg ${
                  metrics.netProfit >= 0
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                }`}
              >
                <RiExchangeDollarLine className="size-5" />
              </div>
            </div>
            <div className="mt-2">
              <h3
                className={`text-2xl font-black tracking-tight sm:text-3xl ${
                  metrics.netProfit >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-700 dark:text-rose-400"
                }`}
              >
                ৳ {formatMoney(metrics.netProfit)}
              </h3>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>চূড়ান্ত স্থিতি:</span>
              <span
                className={`font-bold ${
                  metrics.netProfit >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-700 dark:text-rose-400"
                }`}
              >
                {metrics.netProfit >= 0 ? "✓ নিট মুনাফা অর্জিত" : "⚠ নিট লোকসান"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Daily Sales & Purchase Trend */}
      {dailyTrend.length > 0 && (
        <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                দৈনিক পণ্য বিক্রয় ও ক্রয় ট্রেন্ড (Daily Sales & Purchase Trend)
              </CardTitle>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                নির্বাচিত সময়কালে দিনভিত্তিক মোট পণ্য বিক্রয় ও ক্রয়ের তুলনামূলক চিত্র
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-xs bg-emerald-600"></span>
                <span className="text-slate-600 dark:text-slate-400">বিক্রয় (Sales ৳)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-xs bg-indigo-600"></span>
                <span className="text-slate-600 dark:text-slate-400">ক্রয় (Purchase ৳)</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 pb-3">
            <div className="grid auto-cols-max grid-flow-col items-end gap-3 overflow-x-auto pb-2">
              {dailyTrend.map((day) => {
                const salesHeight = Math.max(8, Math.round((day.sales / maxDayAmount) * 110));
                const buyHeight = Math.max(
                  4,
                  Math.round(((day.purchases || 0) / maxDayAmount) * 110)
                );

                return (
                  <div
                    key={day.date}
                    className="flex w-16 flex-col items-center gap-1.5 text-center transition-all hover:opacity-90"
                    title={`${day.date}\nবিক্রয়: ৳ ${day.sales} (${day.saleWeight || 0} kg)\nক্রয়: ৳ ${day.purchases || 0} (${day.purchaseWeight || 0} kg)`}
                  >
                    <div className="flex h-32 items-end justify-center gap-1">
                      {/* Sales Bar */}
                      <div
                        style={{ height: `${salesHeight}px` }}
                        className="w-3 rounded-t-sm bg-emerald-600 transition-all hover:bg-emerald-700"
                      />
                      {/* Buy Bar */}
                      {(day.purchases || 0) > 0 && (
                        <div
                          style={{ height: `${buyHeight}px` }}
                          className="w-3 rounded-t-sm bg-indigo-600 transition-all hover:bg-indigo-700"
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

      {/* Product Performance Breakdown */}
      {productsSummary.length > 0 && (
        <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  পণ্যভিত্তিক বিক্রয় ও লাভ-ক্ষতি বিশ্লেষণ (Product Performance Summary)
                </CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  নির্বাচিত সময়কালের মধ্যে প্রতিটি পণ্যের বিক্রয় ওজন, বিক্রয় মূল্য ও লভ্যাংশ
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {productsSummary.length} টি পণ্য
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {productsSummary.map((ps) => {
                const isProfitable = ps.profit >= 0;
                return (
                  <div
                    key={ps.productId}
                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {ps.productName}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${
                            isProfitable
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          {isProfitable ? "লাভ" : "ক্ষতি"}
                        </Badge>
                      </div>
                      {ps.subtitle && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {ps.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 space-y-1.5 border-t border-slate-200/60 pt-2 text-xs dark:border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-500">বিক্রয় ওজন:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ps.saleWeight} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">মোট বিক্রয়:</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          ৳ {formatMoney(ps.salePrice)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">গড় ক্রয় দর:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          ৳ {formatMoney(ps.buyRate)}/kg
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200/40 pt-1 dark:border-slate-800/60">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          মুনাফা:
                        </span>
                        <span
                          className={`font-black ${
                            isProfitable
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          ৳ {formatMoney(ps.profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Selection Dialog Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              পণ্য বিক্রয় রিপোর্ট এক্সপোর্ট করুন
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
