"use client";

import { useMemo, useState, useTransition } from "react";

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
import { exportMonthlyProductProfitPDF, formatDateStr, formatMoney } from "@/lib/pdf-export";
import {
  type ProductTransaction,
  type ProductWithTransactions,
  calculateMonthlyProductData,
} from "@/lib/products";

interface ProductDetailsViewProps {
  product: ProductWithTransactions;
}

export default function ProductDetailsView({ product }: ProductDetailsViewProps) {
  const router = useRouter();

  // Transactions list
  const [transactions, setTransactions] = useState<ProductTransaction[]>(
    product.transactions || []
  );

  // Filter Month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

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

  // Monthly Report Calculation for selected month
  const monthlyReport = useMemo(() => {
    return calculateMonthlyProductData(transactions, selectedMonth);
  }, [transactions, selectedMonth]);

  // Pagination for transactions list
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [transactions]);

  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / itemsPerPage));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(start, start + itemsPerPage);
  }, [sortedTransactions, currentPage, itemsPerPage]);

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
      await exportMonthlyProductProfitPDF({
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
        selectedMonth,
      });
      showFeedback("success", "মাসিক মালের লাভ-ক্ষতি পিডিএফ তৈরি হয়েছে");
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

      {/* Navigation Breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
          >
            <RiArrowLeftSLine className="size-4" />
            পণ্য ব্যবস্থাপনা
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-900 dark:text-white">{product.name}</span>
        </nav>

        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 w-40 text-xs font-semibold"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="gap-1.5 text-xs text-blue-700 hover:bg-blue-50 dark:text-blue-400"
          >
            <RiFilePdf2Line className="size-4" />
            <span>পিডিএফ রিপোর্ট</span>
          </Button>

          <Button
            onClick={openAddDialog}
            size="sm"
            className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
          >
            <RiAddLine className="size-4" />
            <span>নতুন লেনদেন</span>
          </Button>
        </div>
      </div>

      {/* Product Hero Header */}
      <Card className="border-border/60 overflow-hidden bg-gradient-to-r from-emerald-800 to-green-700 text-white shadow-md dark:from-emerald-950 dark:to-green-900">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white backdrop-blur-sm">
                  {product.unit || "KG"}
                </Badge>
                {product.badge && (
                  <Badge className="bg-amber-400 font-bold text-slate-950">{product.badge}</Badge>
                )}
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {product.name}
              </h1>
              <p className="mt-1 text-sm opacity-90">
                {product.subtitle || "পণ্য ক্রয়, বিক্রয় ও স্টোক হিসাব বিবরণী"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
              <div className="text-xs font-medium text-emerald-100">
                নির্বাচিত মাস: {selectedMonth} (মুনাফা/ক্ষতি)
              </div>
              <div className="mt-1 text-2xl font-bold tracking-tight">
                ৳ {formatMoney(monthlyReport.profit)}
              </div>
              <div className="mt-1 text-[11px] opacity-80">
                গড় ক্রয় দর: ৳ {monthlyReport.buyRate}/kg
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {/* Total Buy Weight */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <RiScales3Line className="size-4 text-blue-600" />
              <span>সর্বমোট ক্রয় ওজন</span>
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {totalStats.totalBuyWeight} kg
            </div>
          </CardContent>
        </Card>

        {/* Total Sale Weight */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <RiShoppingBag3Line className="size-4 text-emerald-600" />
              <span>সর্বমোট বিক্রয় ওজন</span>
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {totalStats.totalSaleWeight} kg
            </div>
          </CardContent>
        </Card>

        {/* Present Stock Weight */}
        <Card className="border-border/60 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <RiStackLine className="size-4 text-emerald-600" />
              <span>বর্তমান মজুদ (Stock)</span>
            </div>
            <div className="mt-2 text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {totalStats.presentStockWeight} kg
            </div>
          </CardContent>
        </Card>

        {/* Total Buy Price */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <RiCoinsLine className="size-4 text-blue-600" />
              <span>সর্বমোট ক্রয় টাকা</span>
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              ৳ {formatMoney(totalStats.totalBuyPrice)}
            </div>
          </CardContent>
        </Card>

        {/* Total Sale Price */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <RiPriceTag3Line className="size-4 text-emerald-600" />
              <span>সর্বমোট বিক্রয় টাকা</span>
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              ৳ {formatMoney(totalStats.totalSalePrice)}
            </div>
          </CardContent>
        </Card>

        {/* Selected Month Profit */}
        <Card
          className={`border-border/60 ${monthlyReport.profit >= 0 ? "bg-green-50/50 dark:bg-green-950/20" : "bg-rose-50/50 dark:bg-rose-950/20"}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <RiCalendarLine className="size-4 text-green-600" />
              <span>মাসিক লভ্যাংশ</span>
            </div>
            <div
              className={`mt-2 text-xl font-bold ${monthlyReport.profit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
            >
              ৳ {formatMoney(monthlyReport.profit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table Section */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              পণ্য লেনদেন ও স্টক খতিয়ান
            </CardTitle>
            <CardDescription className="mt-0.5">
              প্রতিদিনের ক্রয় দর, ক্রয় ওজন, বিক্রি দর ও বিক্রি ওজনের বিবরণ
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-semibold">
            মোট {transactions.length} টি লেনদেন
          </Badge>
        </CardHeader>

        <CardContent className="pt-6">
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <RiShoppingBag3Line className="size-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                কোনো লেনদেনের রেকর্ড নেই
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                এই পণ্যের জন্য এখনো কোনো ক্রয় বা বিক্রয়ের লেনদেন এন্ট্রি করা হয়নি।
              </p>
              <Button onClick={openAddDialog} className="mt-4 gap-1.5 bg-green-600 text-white">
                <RiAddLine className="size-4" />
                <span>প্রথম লেনদেন যোগ করুন</span>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wider text-slate-700 uppercase dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">
                      তারিখ
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      মাল ক্রয় ওজন
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      মাল ক্রয় দর (৳)
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      আজকের বিক্রয় ওজন
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      আজকের বিক্রয় দর (৳)
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
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

              <div className="bg-slate-50/50 px-4 dark:bg-slate-900/50">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={sortedTransactions.length}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>নতুন লেনদেন যোগ করুন</DialogTitle>
            <DialogDescription>
              {product.name} এর জন্য দৈনিক ক্রয় ও বিক্রয়ের তথ্য প্রদান করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="tx-date" className="text-sm font-medium">
                তারিখ <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
                aria-invalid={!!formErrors.date}
              />
              {formErrors.date && <p className="mt-1 text-xs text-rose-500">{formErrors.date}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tx-kroyweight" className="text-sm font-medium">
                  মাল ক্রয় ওজন (kg)
                </Label>
                <Input
                  id="tx-kroyweight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={kroyweight}
                  onChange={(e) => setKroyweight(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tx-kroyprice" className="text-sm font-medium">
                  মাল ক্রয় দর (৳)
                </Label>
                <Input
                  id="tx-kroyprice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={kroyprice}
                  onChange={(e) => setKroyprice(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tx-saleweight" className="text-sm font-medium">
                  আজকের বিক্রয় ওজন (kg)
                </Label>
                <Input
                  id="tx-saleweight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dailysaleweight}
                  onChange={(e) => setDailysaleweight(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tx-saleprice" className="text-sm font-medium">
                  আজকের বিক্রয় দর (৳)
                </Label>
                <Input
                  id="tx-saleprice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dailysaleprice}
                  onChange={(e) => setDailysaleprice(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>বাতিল</DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>লেনদেন আপডেট করুন</DialogTitle>
            <DialogDescription>{product.name} এর লেনদেন তথ্য সংশোধন করুন।</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="edit-tx-date" className="text-sm font-medium">
                তারিখ <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-tx-kroyweight" className="text-sm font-medium">
                  মাল ক্রয় ওজন (kg)
                </Label>
                <Input
                  id="edit-tx-kroyweight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={kroyweight}
                  onChange={(e) => setKroyweight(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-tx-kroyprice" className="text-sm font-medium">
                  মাল ক্রয় দর (৳)
                </Label>
                <Input
                  id="edit-tx-kroyprice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={kroyprice}
                  onChange={(e) => setKroyprice(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-tx-saleweight" className="text-sm font-medium">
                  আজকের বিক্রয় ওজন (kg)
                </Label>
                <Input
                  id="edit-tx-saleweight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dailysaleweight}
                  onChange={(e) => setDailysaleweight(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-tx-saleprice" className="text-sm font-medium">
                  আজকের বিক্রয় দর (৳)
                </Label>
                <Input
                  id="edit-tx-saleprice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dailysaleprice}
                  onChange={(e) => setDailysaleprice(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>বাতিল</DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600">লেনদেন মুছে ফেলুন</DialogTitle>
            <DialogDescription>
              আপনি কি নিশ্চিত যে এই লেনদেন রেকর্ডটি মুছে ফেলতে চান? এটি স্থায়ীভাবে মুছে যাবে।
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <DialogClose render={<Button type="button" variant="outline" />}>বাতিল</DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={isPending}
              className="gap-1.5"
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
