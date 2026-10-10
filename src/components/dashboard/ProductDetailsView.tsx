"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  RiAddLine,
  RiArrowLeftSLine,
  RiCalendarLine,
  RiCheckLine,
  RiCloseLine,
  RiCoinsLine,
  RiDeleteBinLine,
  RiEditLine,
  RiErrorWarningLine,
  RiFilePdf2Line,
  RiLoader4Line,
  RiPriceTag3Line,
  RiScales3Line,
  RiShoppingBag3Line,
  RiStackLine,
} from "@remixicon/react";

import {
  createProductTransactionAction,
  deleteProductTransactionAction,
  updateProductTransactionAction,
} from "@/actions/products";
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
import { exportProductProfitPDF, formatDateStr, formatMoney } from "@/lib/pdf-export";
import {
  type ProductTransaction,
  type ProductWithTransactions,
  calculateProductReportData,
} from "@/lib/products";
import { sanitizeImageUrl } from "@/lib/utils";

interface ProductDetailsViewProps {
  product: ProductWithTransactions;
}

export default function ProductDetailsView({ product }: ProductDetailsViewProps) {
  const router = useRouter();

  // Transactions list
  const [transactions, setTransactions] = useState<ProductTransaction[]>(
    product.transactions || []
  );

  // Report Date Range Filters
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [reportEndDate, setReportEndDate] = useState<string>(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
  });

  // Date Range Filters for transactions table
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeTx, setActiveTx] = useState<ProductTransaction | null>(null);

  // Form states
  const [date, setDate] = useState<string>("");
  const [kroyweight, setKroyweight] = useState<number | string>("");
  const [kroyprice, setKroyprice] = useState<number | string>("");
  const [dailysaleweight, setDailysaleweight] = useState<number | string>("");
  const [dailysaleprice, setDailysaleprice] = useState<number | string>("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Toast feedback
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const showFeedback = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Overall Statistics Calculations
  const totalStats = useMemo(() => {
    let totalBuyWeight = 0;
    let totalBuyPrice = 0;
    let totalSaleWeight = 0;
    let totalSalePrice = 0;

    transactions.forEach((t) => {
      totalBuyWeight += Number(t.kroyweight || 0);
      totalBuyPrice += Number(t.kroyprice || 0);
      totalSaleWeight += Number(t.dailysaleweight || 0);
      totalSalePrice += Number(t.dailysaleprice || 0);
    });

    const presentStockWeight = Number((totalBuyWeight - totalSaleWeight).toFixed(2));

    return {
      totalBuyWeight: Number(totalBuyWeight.toFixed(2)),
      totalBuyPrice: Number(totalBuyPrice.toFixed(2)),
      totalSaleWeight: Number(totalSaleWeight.toFixed(2)),
      totalSalePrice: Number(totalSalePrice.toFixed(2)),
      presentStockWeight: Math.max(0, presentStockWeight),
    };
  }, [transactions]);

  // Report Calculation for selected date range
  const monthlyReport = useMemo(() => {
    return calculateProductReportData(transactions, reportStartDate, reportEndDate);
  }, [transactions, reportStartDate, reportEndDate]);

  // Pagination for transactions list
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset to first page when filters change
  useEffect(() => {
    // eslint-disable-next-line
    setCurrentPage(1);
  }, [filterStartDate, filterEndDate]);

  const filteredAndSortedTransactions = useMemo(() => {
    return [...transactions]
      .filter((t) => {
        // safely convert t.date to YYYY-MM-DD string
        const tDateStr = formatDateStr(t.date);

        if (filterStartDate && tDateStr < filterStartDate) return false;
        if (filterEndDate && tDateStr > filterEndDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterStartDate, filterEndDate]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedTransactions.length / itemsPerPage));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions.slice(start, start + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage, itemsPerPage]);

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!date) errors.date = "তারিখ নির্বাচন করুন";
    if (kroyweight === "" || Number(kroyweight) < 0)
      errors.kroyweight = "ক্রয় ওজন প্রদান করুন (সর্বনিম্ন ০)";
    if (kroyprice === "" || Number(kroyprice) < 0)
      errors.kroyprice = "ক্রয় মূল্য প্রদান করুন (সর্বনিম্ন ০)";
    if (dailysaleweight === "" || Number(dailysaleweight) < 0)
      errors.dailysaleweight = "বিক্রয় ওজন প্রদান করুন (সর্বনিম্ন ০)";
    if (dailysaleprice === "" || Number(dailysaleprice) < 0)
      errors.dailysaleprice = "বিক্রয় মূল্য প্রদান করুন (সর্বনিম্ন ০)";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open Add Dialog
  const openAddDialog = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    setDate(todayStr);
    setKroyweight(0);
    setKroyprice(0);
    setDailysaleweight(0);
    setDailysaleprice(0);
    setFormErrors({});
    setIsAddOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (tx: ProductTransaction) => {
    setActiveTx(tx);
    setDate(formatDateStr(tx.date));
    setKroyweight(tx.kroyweight);
    setKroyprice(tx.kroyprice);
    setDailysaleweight(tx.dailysaleweight);
    setDailysaleprice(tx.dailysaleprice);
    setFormErrors({});
    setIsEditOpen(true);
  };

  // Open Delete Dialog
  const openDeleteDialog = (tx: ProductTransaction) => {
    setActiveTx(tx);
    setIsDeleteOpen(true);
  };

  // Submit Add Transaction
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    startTransition(async () => {
      const res = await createProductTransactionAction({
        product_id: product.id,
        date,
        kroyweight: Number(kroyweight),
        kroyprice: Number(kroyprice),
        dailysaleweight: Number(dailysaleweight),
        dailysaleprice: Number(dailysaleprice),
      });

      if (res.success && res.data) {
        setTransactions((prev) => [res.data!, ...prev]);
        setIsAddOpen(false);
        showFeedback("success", "নতুন লেনদেন রেকর্ড সফলভাবে যোগ হয়েছে!");
        router.refresh();
      } else {
        showFeedback("error", res.error || "লেনদেন যোগ করতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Edit Transaction
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTx || !validateForm()) return;

    startTransition(async () => {
      const res = await updateProductTransactionAction(activeTx.id, product.id, {
        date,
        kroyweight: Number(kroyweight),
        kroyprice: Number(kroyprice),
        dailysaleweight: Number(dailysaleweight),
        dailysaleprice: Number(dailysaleprice),
      });

      if (res.success && res.data) {
        setTransactions((prev) => prev.map((t) => (t.id === activeTx.id ? res.data! : t)));
        setIsEditOpen(false);
        showFeedback("success", "লেনদেন রেকর্ড আপডেট করা হয়েছে!");
        router.refresh();
      } else {
        showFeedback("error", res.error || "লেনদেন আপডেট করতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Delete Transaction
  const handleDeleteSubmit = () => {
    if (!activeTx) return;

    startTransition(async () => {
      const res = await deleteProductTransactionAction(activeTx.id, product.id);

      if (res.success) {
        setTransactions((prev) => prev.filter((t) => t.id !== activeTx.id));
        setIsDeleteOpen(false);
        showFeedback("success", "লেনদেন রেকর্ড মুছে ফেলা হয়েছে!");
        setActiveTx(null);
        router.refresh();
      } else {
        showFeedback("error", res.error || "লেনদেন মুছে ফেলতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Handle PDF Export
  const handleDownloadPDF = async () => {
    try {
      await exportProductProfitPDF({
        products: [
          {
            id: product.id,
            name: product.name,
            saleWeight: monthlyReport.saleWeight,
            salePrice: monthlyReport.salePrice,
            buyRate: monthlyReport.buyRate,
            profit: monthlyReport.profit,
          },
        ],
        selectedMonth:
          reportStartDate || reportEndDate
            ? `${reportStartDate || "শুরু"} থেকে ${reportEndDate || "বর্তমান"}`
            : "সম্পূর্ণ সময়",
      });
      showFeedback("success", "মালের লাভ-ক্ষতি পিডিএফ তৈরি হয়েছে");
    } catch (err) {
      console.error(err);
      showFeedback("error", "পিডিএফ ডাউনলোড করতে সমস্যা হয়েছে");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {/* Navigation Breadcrumb & Report Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
          >
            <RiArrowLeftSLine className="size-4" />
            পণ্য ব্যবস্থাপনা
          </Link>
          <span>/</span>
          <span className="max-w-[200px] truncate font-semibold text-slate-900 sm:max-w-none dark:text-white">
            {product.name}
          </span>
        </nav>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Date range for report */}
          <div className="flex w-full items-center gap-1.5 sm:w-auto">
            <div className="relative flex-1 sm:w-32">
              <Input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="h-9 w-full text-xs font-semibold"
                title="রিপোর্ট শুরুর তারিখ"
              />
            </div>
            <span className="text-xs text-slate-400">-</span>
            <div className="relative flex-1 sm:w-32">
              <Input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="h-9 w-full text-xs font-semibold"
                title="রিপোর্ট শেষ তারিখ"
              />
            </div>
            {(reportStartDate || reportEndDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReportStartDate("");
                  setReportEndDate("");
                }}
                className="h-9 px-2 text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                title="ফিল্টার মুছুন"
              >
                <RiCloseLine className="size-4" />
              </Button>
            )}
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="h-9 flex-1 justify-center gap-1.5 text-xs text-blue-700 hover:bg-blue-50 sm:flex-none dark:text-blue-400"
            >
              <RiFilePdf2Line className="size-4" />
              <span>পিডিএফ রিপোর্ট</span>
            </Button>

            <Button
              onClick={openAddDialog}
              size="sm"
              className="h-9 flex-1 justify-center gap-1.5 bg-green-600 text-white hover:bg-green-700 sm:flex-none"
            >
              <RiAddLine className="size-4" />
              <span>নতুন লেনদেন</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Product Hero Header */}
      <Card className="border-border/60 overflow-hidden bg-gradient-to-r from-emerald-800 to-green-700 text-white shadow-md dark:from-emerald-950 dark:to-green-900">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              {sanitizeImageUrl(product.image) && (
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/30 bg-white/10 shadow-md sm:size-20">
                  <Image
                    src={sanitizeImageUrl(product.image)!}
                    alt={product.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl">
                  {product.name}
                </h1>
                <p className="mt-1 line-clamp-2 text-xs opacity-90 sm:text-sm">
                  {product.subtitle || "পণ্য ক্রয়, বিক্রয় ও স্টোক হিসাব বিবরণী"}
                </p>
                {product.price !== null && product.price !== undefined && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-xs">
                    মূল্য: ৳ {product.price}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-md sm:rounded-2xl sm:p-4">
              <div className="text-xs font-medium text-emerald-100">
                রিপোর্ট:{" "}
                {reportStartDate || reportEndDate
                  ? `${reportStartDate || "শুরু"} থেকে ${reportEndDate || "বর্তমান"}`
                  : "সম্পূর্ণ সময়"}{" "}
                (মুনাফা/ক্ষতি)
              </div>
              <div className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                ৳ {formatMoney(monthlyReport.profit)}
              </div>
              <div className="mt-0.5 text-[11px] opacity-80 sm:mt-1">
                গড় ক্রয় দর: ৳ {monthlyReport.buyRate}/kg
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {/* Total Buy Weight */}
        <Card className="border-border/60">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 sm:gap-2 sm:text-xs">
              <RiScales3Line className="size-3.5 shrink-0 text-blue-600 sm:size-4" />
              <span className="truncate">সর্বমোট ক্রয় ওজন</span>
            </div>
            <div className="mt-1.5 truncate text-base font-bold text-slate-900 sm:mt-2 sm:text-lg lg:text-xl dark:text-white">
              {totalStats.totalBuyWeight} kg
            </div>
          </CardContent>
        </Card>

        {/* Total Sale Weight */}
        <Card className="border-border/60">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 sm:gap-2 sm:text-xs">
              <RiShoppingBag3Line className="size-3.5 shrink-0 text-emerald-600 sm:size-4" />
              <span className="truncate">সর্বমোট বিক্রয় ওজন</span>
            </div>
            <div className="mt-1.5 truncate text-base font-bold text-slate-900 sm:mt-2 sm:text-lg lg:text-xl dark:text-white">
              {totalStats.totalSaleWeight} kg
            </div>
          </CardContent>
        </Card>

        {/* Present Stock Weight */}
        <Card className="border-border/60 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 sm:gap-2 sm:text-xs dark:text-emerald-300">
              <RiStackLine className="size-3.5 shrink-0 text-emerald-600 sm:size-4" />
              <span className="truncate">বর্তমান মজুদ</span>
            </div>
            <div className="mt-1.5 truncate text-base font-bold text-emerald-700 sm:mt-2 sm:text-lg lg:text-xl dark:text-emerald-400">
              {totalStats.presentStockWeight} kg
            </div>
          </CardContent>
        </Card>

        {/* Total Buy Price */}
        <Card className="border-border/60">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 sm:gap-2 sm:text-xs">
              <RiCoinsLine className="size-3.5 shrink-0 text-blue-600 sm:size-4" />
              <span className="truncate">সর্বমোট ক্রয় টাকা</span>
            </div>
            <div className="mt-1.5 truncate text-base font-bold text-slate-900 sm:mt-2 sm:text-lg lg:text-xl dark:text-white">
              ৳ {formatMoney(totalStats.totalBuyPrice)}
            </div>
          </CardContent>
        </Card>

        {/* Total Sale Price */}
        <Card className="border-border/60">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 sm:gap-2 sm:text-xs">
              <RiPriceTag3Line className="size-3.5 shrink-0 text-emerald-600 sm:size-4" />
              <span className="truncate">সর্বমোট বিক্রয় টাকা</span>
            </div>
            <div className="mt-1.5 truncate text-base font-bold text-slate-900 sm:mt-2 sm:text-lg lg:text-xl dark:text-white">
              ৳ {formatMoney(totalStats.totalSalePrice)}
            </div>
          </CardContent>
        </Card>

        {/* Selected Month Profit */}
        <Card
          className={`border-border/60 ${monthlyReport.profit >= 0 ? "bg-green-50/50 dark:bg-green-950/20" : "bg-rose-50/50 dark:bg-rose-950/20"}`}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 sm:gap-2 sm:text-xs dark:text-slate-300">
              <RiCalendarLine className="size-3.5 shrink-0 text-green-600 sm:size-4" />
              <span className="truncate">নিট লাভ (রিপোর্ট)</span>
            </div>
            <div
              className={`mt-1.5 truncate text-base font-bold sm:mt-2 sm:text-lg lg:text-xl ${monthlyReport.profit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
            >
              ৳ {formatMoney(monthlyReport.profit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table Section */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-3 border-b border-slate-100 p-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6 sm:pb-4 dark:border-slate-800">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">
              পণ্য লেনদেন ও স্টক খতিয়ান
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs sm:text-sm">
              প্রতিদিনের ক্রয় দর, ক্রয় ওজন, বিক্রি দর ও বিক্রি ওজনের বিবরণ
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <div className="flex w-full items-center gap-1.5 sm:w-auto">
              <div className="shrink-0 text-xs font-medium text-slate-500">তারিখ:</div>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="h-8 flex-1 text-xs sm:w-32"
                title="শুরুর তারিখ"
              />
              <span className="text-slate-400">-</span>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="h-8 flex-1 text-xs sm:w-32"
                title="শেষ তারিখ"
              />
              {(filterStartDate || filterEndDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                  className="h-8 px-2 text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  title="ফিল্টার মুছুন"
                >
                  <RiCloseLine className="size-4" />
                </Button>
              )}
            </div>
            <Badge variant="secondary" className="self-start text-xs font-semibold sm:self-auto">
              মোট {filteredAndSortedTransactions.length} টি লেনদেন
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-4 sm:p-6 sm:pt-6">
          {filteredAndSortedTransactions.length === 0 ? (
            <div className="px-4 py-10 text-center sm:py-12">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <RiShoppingBag3Line className="size-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {transactions.length === 0
                  ? "কোনো লেনদেনের রেকর্ড নেই"
                  : "কোনো ফলাফল পাওয়া যায়নি"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 sm:text-sm">
                {transactions.length === 0
                  ? "এই পণ্যের জন্য এখনো কোনো ক্রয় বা বিক্রয়ের লেনদেন এন্ট্রি করা হয়নি।"
                  : "আপনার নির্বাচিত তারিখের মধ্যে কোনো লেনদেন পাওয়া যায়নি।"}
              </p>
              {transactions.length === 0 && (
                <Button onClick={openAddDialog} className="mt-4 gap-1.5 bg-green-600 text-white">
                  <RiAddLine className="size-4" />
                  <span>প্রথম লেনদেন যোগ করুন</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto rounded-lg border border-slate-200/80 md:block dark:border-slate-800">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wider text-slate-700 uppercase dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                    <tr className="whitespace-nowrap">
                      <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                        তারিখ
                      </th>
                      <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                        মাল ক্রয় ওজন
                      </th>
                      <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                        মাল ক্রয় দর (৳)
                      </th>
                      <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                        আজকের বিক্রয় ওজন
                      </th>
                      <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                        আজকের বিক্রয় দর (৳)
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-right whitespace-nowrap">
                        অ্যাকশন
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
                    {paginatedTransactions.map((t) => (
                      <tr
                        key={t.id}
                        className="group transition hover:bg-slate-50/75 dark:hover:bg-slate-900/60"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {formatDateStr(t.date)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-blue-700 dark:text-blue-400">
                          {t.kroyweight} kg
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          ৳ {formatMoney(t.kroyprice)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">
                          {t.dailysaleweight} kg
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          ৳ {formatMoney(t.dailysaleprice)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditDialog(t)}
                              title="সম্পাদনা করুন"
                              className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                            >
                              <RiEditLine className="size-4" />
                              <span className="sr-only">সম্পাদনা</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openDeleteDialog(t)}
                              title="মুছে ফেলুন"
                              className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            >
                              <RiDeleteBinLine className="size-4" />
                              <span className="sr-only">মুছুন</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {paginatedTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    {/* Header: Date + Action Buttons */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                        <RiCalendarLine className="size-3.5 text-slate-400" />
                        <span>{formatDateStr(t.date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEditDialog(t)}
                          title="সম্পাদনা"
                          className="size-7 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                        >
                          <RiEditLine className="size-3.5" />
                          <span className="sr-only">সম্পাদনা</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openDeleteDialog(t)}
                          title="মুছুন"
                          className="size-7 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        >
                          <RiDeleteBinLine className="size-3.5" />
                          <span className="sr-only">মুছুন</span>
                        </Button>
                      </div>
                    </div>

                    {/* Side-by-side Buy & Sale Columns */}
                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                      {/* Buy details */}
                      <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-2.5 dark:border-blue-900/30 dark:bg-blue-950/30">
                        <div className="flex items-center gap-1 font-semibold text-blue-800 dark:text-blue-300">
                          <RiScales3Line className="size-3 shrink-0" />
                          <span>মাল ক্রয়</span>
                        </div>
                        <div className="mt-1.5 space-y-0.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span>ওজন:</span>
                            <span className="font-bold text-blue-900 dark:text-blue-200">
                              {t.kroyweight} kg
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span>দর:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              ৳ {formatMoney(t.kroyprice)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sale details */}
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-2.5 dark:border-emerald-900/30 dark:bg-emerald-950/30">
                        <div className="flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-300">
                          <RiShoppingBag3Line className="size-3 shrink-0" />
                          <span>আজকের বিক্রয়</span>
                        </div>
                        <div className="mt-1.5 space-y-0.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span>ওজন:</span>
                            <span className="font-bold text-emerald-900 dark:text-emerald-200">
                              {t.dailysaleweight} kg
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span>দর:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              ৳ {formatMoney(t.dailysaleprice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="rounded-lg bg-slate-50/50 px-3 sm:px-4 dark:bg-slate-900/50">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredAndSortedTransactions.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  itemName="লেনদেন"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* ADD TRANSACTION DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">নতুন লেনদেন যোগ করুন</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {product.name} এর জন্য দৈনিক ক্রয় ও বিক্রয়ের তথ্য প্রদান করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-3.5 pt-2 sm:space-y-4">
            <div>
              <Label htmlFor="tx-date" className="text-xs font-medium sm:text-sm">
                তারিখ <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                aria-invalid={!!formErrors.date}
              />
              {formErrors.date && <p className="mt-1 text-xs text-rose-500">{formErrors.date}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <Label htmlFor="tx-kroyweight" className="text-xs font-medium sm:text-sm">
                  ক্রয় ওজন (kg)
                </Label>
                <Input
                  id="tx-kroyweight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={kroyweight}
                  onChange={(e) => setKroyweight(e.target.value)}
                  className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="tx-kroyprice" className="text-xs font-medium sm:text-sm">
                  ক্রয় দর (৳)
                </Label>
                <Input
                  id="tx-kroyprice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={kroyprice}
                  onChange={(e) => setKroyprice(e.target.value)}
                  className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <Label htmlFor="tx-saleweight" className="text-xs font-medium sm:text-sm">
                  বিক্রয় ওজন (kg)
                </Label>
                <Input
                  id="tx-saleweight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dailysaleweight}
                  onChange={(e) => setDailysaleweight(e.target.value)}
                  className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="tx-saleprice" className="text-xs font-medium sm:text-sm">
                  বিক্রয় দর (৳)
                </Label>
                <Input
                  id="tx-saleprice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dailysaleprice}
                  onChange={(e) => setDailysaleprice(e.target.value)}
                  className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                />
              </div>
            </div>

            <DialogFooter className="flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end sm:pt-4 dark:border-slate-800">
              <DialogClose
                render={<Button type="button" variant="outline" className="w-full sm:w-auto" />}
              >
                বাতিল
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full justify-center gap-1.5 bg-green-600 text-white hover:bg-green-700 sm:w-auto"
              >
                {isPending && <RiLoader4Line className="size-4 animate-spin" />}
                <span>সংরক্ষণ করুন</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* EDIT TRANSACTION DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">লেনদেন আপডেট করুন</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {product.name} এর লেনদেন তথ্য সংশোধন করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3.5 pt-2 sm:space-y-4">
            <div>
              <Label htmlFor="edit-tx-date" className="text-xs font-medium sm:text-sm">
                তারিখ <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <Label htmlFor="edit-tx-kroyweight" className="text-xs font-medium sm:text-sm">
                  ক্রয় ওজন (kg)
                </Label>
                <Input
                  id="edit-tx-kroyweight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={kroyweight}
                  onChange={(e) => setKroyweight(e.target.value)}
                  className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="edit-tx-kroyprice" className="text-xs font-medium sm:text-sm">
                  ক্রয় দর (৳)
                </Label>
                <Input
                  id="edit-tx-kroyprice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={kroyprice}
                  onChange={(e) => setKroyprice(e.target.value)}
                  className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <Label htmlFor="edit-tx-saleweight" className="text-xs font-medium sm:text-sm">
                  বিক্রয় ওজন (kg)
                </Label>
                <Input
                  id="edit-tx-saleweight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dailysaleweight}
                  onChange={(e) => setDailysaleweight(e.target.value)}
                  className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="edit-tx-saleprice" className="text-xs font-medium sm:text-sm">
                  বিক্রয় দর (৳)
                </Label>
                <Input
                  id="edit-tx-saleprice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dailysaleprice}
                  onChange={(e) => setDailysaleprice(e.target.value)}
                  className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                />
              </div>
            </div>

            <DialogFooter className="flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end sm:pt-4 dark:border-slate-800">
              <DialogClose
                render={<Button type="button" variant="outline" className="w-full sm:w-auto" />}
              >
                বাতিল
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full justify-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
              >
                {isPending && <RiLoader4Line className="size-4 animate-spin" />}
                <span>আপডেট করুন</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DELETE TRANSACTION DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base text-rose-600 sm:text-lg">
              লেনদেন মুছে ফেলুন
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              আপনি কি নিশ্চিত যে এই লেনদেন রেকর্ডটি মুছে ফেলতে চান? এটি স্থায়ীভাবে মুছে যাবে।
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end sm:pt-4 dark:border-slate-800">
            <DialogClose
              render={<Button type="button" variant="outline" className="w-full sm:w-auto" />}
            >
              বাতিল
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={isPending}
              className="w-full justify-center gap-1.5 sm:w-auto"
            >
              {isPending && <RiLoader4Line className="size-4 animate-spin" />}
              <span>হ্যাঁ, মুছে দিন</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
