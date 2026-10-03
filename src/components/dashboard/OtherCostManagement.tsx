"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  RiAddLine,
  RiCalendarLine,
  RiCheckLine,
  RiCloseLine,
  RiCoinsLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiEditLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiFileExcel2Line,
  RiFileList3Line,
  RiFilePdf2Line,
  RiFileTextLine,
  RiFilterLine,
  RiHandCoinLine,
  RiHashtag,
  RiMoneyDollarCircleLine,
  RiPriceTag3Line,
  RiPrinterLine,
  RiRefreshLine,
  RiSearchLine,
  RiWallet3Line,
} from "@remixicon/react";

import {
  createOtherCostAction,
  deleteOtherCostAction,
  updateOtherCostAction,
} from "@/actions/other-costs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
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
import {
  OTHER_COST_CATEGORIES,
  type OtherCost,
  type OtherCostInput,
  type OtherCostStats,
  type PaginatedOtherCostsResult,
  getCategoryBadgeClass,
  getCategoryLabel,
} from "@/lib/other-costs";
import { exportOtherCostsListPDF, printOtherCostVoucherPDF } from "@/lib/pdf-export";
import { exportOtherCostsToCSV, exportOtherCostsToExcel } from "@/lib/sheet-export";

interface OtherCostManagementProps {
  initialData?: PaginatedOtherCostsResult;
  initialOtherCosts?: OtherCost[];
}

export default function OtherCostManagement({
  initialData,
  initialOtherCosts,
}: OtherCostManagementProps) {
  const [costsList, setCostsList] = useState<OtherCost[]>(
    initialData?.otherCosts || initialOtherCosts || []
  );
  const [totalItems, setTotalItems] = useState<number>(
    initialData?.total ?? (initialOtherCosts?.length || 0)
  );
  const [totalPages, setTotalPages] = useState<number>(
    initialData?.totalPages ?? Math.max(1, Math.ceil((initialOtherCosts?.length || 0) / 20))
  );
  const [currentPage, setCurrentPage] = useState<number>(initialData?.currentPage ?? 1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(initialData?.limit ?? 20);
  const [stats, setStats] = useState<OtherCostStats>(
    initialData?.stats ?? {
      totalAmount: (initialOtherCosts || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0),
      totalCount: initialOtherCosts?.length || 0,
      thisMonthAmount: (initialOtherCosts || []).reduce(
        (acc, c) => acc + (Number(c.amount) || 0),
        0
      ),
      todayAmount: 0,
    }
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [datePreset, setDatePreset] = useState<string>("all");

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isInitialMount = useRef(true);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Export states
  const [exportScope, setExportScope] = useState<"all" | "filtered">("all");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Active Cost for View / Edit / Delete
  const [activeCost, setActiveCost] = useState<OtherCost | null>(null);

  // Form states
  const [formData, setFormData] = useState<OtherCostInput>({
    title: "",
    category: "other",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Toast / notification feedback
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

  // Debounce search term changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch costs from server
  const fetchCosts = useCallback(
    async (
      page: number,
      limit: number,
      search: string,
      category: string,
      sDate: string,
      eDate: string
    ) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (search.trim()) params.set("search", search.trim());
        if (category && category !== "all") params.set("category", category);
        if (sDate) params.set("startDate", sDate);
        if (eDate) params.set("endDate", eDate);

        const res = await fetch(`/api/other-costs?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCostsList(data.data);
          if (data.pagination) {
            setTotalItems(data.pagination.total);
            setTotalPages(data.pagination.totalPages);
            setCurrentPage(data.pagination.currentPage);
          }
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch {
        showFeedback("error", "খরচের তালিকা লোড করতে সমস্যা হয়েছে");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Trigger fetch when filters or pagination changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchCosts(currentPage, itemsPerPage, debouncedSearch, selectedCategory, startDate, endDate);
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearch,
    selectedCategory,
    startDate,
    endDate,
    fetchCosts,
  ]);

  // Apply quick date preset
  const applyDatePreset = (preset: string) => {
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

    setDatePreset(preset);
    setStartDate(start);
    setEndDate(end);
    setCurrentPage(1);
  };

  // Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchCosts(
        currentPage,
        itemsPerPage,
        debouncedSearch,
        selectedCategory,
        startDate,
        endDate
      );
      showFeedback("success", "অন্যান্য খরচের তালিকা সফলভাবে রিফ্রেশ করা হয়েছে");
    } catch {
      showFeedback("error", "রিফ্রেশ করতে সমস্যা হয়েছে");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setStartDate("");
    setEndDate("");
    setDatePreset("all");
    setCurrentPage(1);
  };

  // Open Add Dialog
  const openAddDialog = () => {
    setFormData({
      title: "",
      category: "other",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      description: "",
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (cost: OtherCost) => {
    setActiveCost(cost);
    setFormData({
      title: cost.title,
      category: cost.category || "other",
      amount: cost.amount,
      date: cost.date ? new Date(cost.date).toISOString().split("T")[0] : "",
      description: cost.description || "",
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  // Open Delete Dialog
  const openDeleteDialog = (cost: OtherCost) => {
    setActiveCost(cost);
    setIsDeleteOpen(true);
  };

  // Open Preview Dialog
  const openPreviewDialog = (cost: OtherCost) => {
    setActiveCost(cost);
    setIsPreviewOpen(true);
  };

  // Validate Form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.title || formData.title.trim() === "") {
      errors.title = "খরচের শিরোনাম / বিবরণ অবশ্যই দিতে হবে";
    }
    const num = Number(formData.amount);
    if (isNaN(num) || num <= 0) {
      errors.amount = "সঠিক খরচের পরিমাণ প্রদান করুন (০ এর বেশি)";
    }
    if (!formData.date) {
      errors.date = "তারিখ নির্বাচন করুন";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    startTransition(async () => {
      const res = await createOtherCostAction({
        ...formData,
        amount: Number(formData.amount),
      });

      if (res.success) {
        setIsAddOpen(false);
        showFeedback("success", "নতুন খরচ সফলভাবে যোগ করা হয়েছে!");
        await fetchCosts(1, itemsPerPage, debouncedSearch, selectedCategory, startDate, endDate);
      } else {
        showFeedback("error", res.error || "খরচ যোগ করতে সমস্যা হয়েছে");
      }
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCost || !validateForm()) return;

    startTransition(async () => {
      const res = await updateOtherCostAction(activeCost.id, {
        ...formData,
        amount: Number(formData.amount),
      });

      if (res.success) {
        setIsEditOpen(false);
        showFeedback("success", "খরচের তথ্য সফলভাবে আপডেট করা হয়েছে!");
        setActiveCost(null);
        await fetchCosts(
          currentPage,
          itemsPerPage,
          debouncedSearch,
          selectedCategory,
          startDate,
          endDate
        );
      } else {
        showFeedback("error", res.error || "খরচ আপডেট করতে সমস্যা হয়েছে");
      }
    });
  };

  // Handle Delete Submit
  const handleDeleteSubmit = () => {
    if (!activeCost) return;

    startTransition(async () => {
      const res = await deleteOtherCostAction(activeCost.id);
      if (res.success) {
        setIsDeleteOpen(false);
        showFeedback("success", "খরচ সফলভাবে মুছে ফেলা হয়েছে!");
        setActiveCost(null);
        const targetPage =
          costsList.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
        await fetchCosts(
          targetPage,
          itemsPerPage,
          debouncedSearch,
          selectedCategory,
          startDate,
          endDate
        );
      } else {
        showFeedback("error", res.error || "খরচ মুছে ফেলতে সমস্যা হয়েছে");
      }
    });
  };

  // Handle Export (Excel, CSV, PDF)
  const handleExport = async (
    format: "excel" | "csv" | "pdf",
    mode: "download" | "print" = "download"
  ) => {
    setIsGeneratingPdf(true);
    try {
      let exportData: OtherCost[] = costsList;

      if (exportScope === "all") {
        const res = await fetch("/api/other-costs?all=true");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          exportData = json.data;
        }
      } else {
        const params = new URLSearchParams({ all: "true" });
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        if (selectedCategory && selectedCategory !== "all")
          params.set("category", selectedCategory);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);

        const res = await fetch(`/api/other-costs?${params.toString()}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          exportData = json.data;
        }
      }

      if (exportData.length === 0) {
        showFeedback("error", "এক্সপোর্ট করার জন্য কোনো তথ্য পাওয়া যায়নি");
        return;
      }

      if (format === "excel") {
        exportOtherCostsToExcel(exportData);
        showFeedback("success", "Excel ফাইল ডাউনলোড শুরু হয়েছে");
      } else if (format === "csv") {
        exportOtherCostsToCSV(exportData);
        showFeedback("success", "CSV ফাইল ডাউনলোড শুরু হয়েছে");
      } else if (format === "pdf") {
        let dateRangeStr = "";
        if (exportScope === "filtered" && (startDate || endDate)) {
          dateRangeStr = `${startDate || "শুরু"} হতে ${endDate || "বর্তমান"}`;
        }
        await exportOtherCostsListPDF({
          costs: exportData,
          mode,
          titleInfo: {
            subtitle:
              exportScope === "all" ? "সকল অন্যান্য খরচের তালিকা" : "ফিল্টারকৃত খরচের তালিকা",
            dateRange: dateRangeStr,
          },
        });
        showFeedback(
          "success",
          mode === "print" ? "প্রিন্ট উইন্ডো খোলা হয়েছে" : "PDF ডাউনলোড সম্পন্ন হয়েছে"
        );
      }

      setIsExportOpen(false);
    } catch {
      showFeedback("error", "রিপোর্ট তৈরিতে সমস্যা হয়েছে");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    selectedCategory !== "all" ||
    Boolean(startDate) ||
    Boolean(endDate);

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

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Total Other Costs */}
        <Card className="border-border/60 border shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <RiWallet3Line className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট অন্যান্য খরচ
              </p>
              <h3 className="text-xl font-bold tracking-tight text-amber-700 sm:text-2xl dark:text-amber-400">
                ৳ {stats.totalAmount.toLocaleString("en-IN")}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                সর্বমোট ব্যয়ের পরিমাণ
              </p>
            </div>
          </CardContent>
        </Card>

        {/* This Month's Cost */}
        <Card className="border-border/60 border shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              <RiCalendarLine className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                চলতি মাসের খরচ
              </p>
              <h3 className="text-xl font-bold tracking-tight text-blue-700 sm:text-2xl dark:text-blue-400">
                ৳ {stats.thisMonthAmount.toLocaleString("en-IN")}
              </h3>
              <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                বর্তমান ক্যালেন্ডার মাস
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Today's Cost */}
        <Card className="border-border/60 border shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
              <RiCoinsLine className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">আজকের খরচ</p>
              <h3 className="text-xl font-bold tracking-tight text-rose-700 sm:text-2xl dark:text-rose-400">
                ৳ {stats.todayAmount.toLocaleString("en-IN")}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                দৈনিক খরচের হিসাব
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Cost Entries */}
        <Card className="border-border/60 border shadow-xs">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              <RiFileTextLine className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট খরচ ভাউচার
              </p>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                {stats.totalCount}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">নথিভুক্ত রেকর্ড</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                <RiMoneyDollarCircleLine className="size-5 text-green-600 dark:text-green-400" />
                অন্যান্য খরচ ও বিবিধ ব্যয় খাতা
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
              >
                মোট {totalItems} টি রেকর্ড
              </Badge>
            </div>
            <CardDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              পরিবহন, বেতন, দোকান ভাড়া, বিদ্যুৎ বিল ও সকল অফিসের আনুষঙ্গিক ব্যয়ের হিসাব
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
              onClick={() => setIsExportOpen(true)}
              className="gap-1.5 border-emerald-600/30 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              title="অন্যান্য খরচের PDF, Excel ও CSV রিপোর্ট ডাউনলোড বা প্রিন্ট করুন"
            >
              <RiFileList3Line className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Reports</span>
            </Button>

            <Button
              onClick={openAddDialog}
              size="sm"
              className="bg-green-600 text-xs text-white shadow-xs hover:bg-green-700"
            >
              <RiHandCoinLine className="mr-1.5 size-3.5" />
              নতুন খরচ যোগ করুন
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          {/* Search, Category & Date Filter Bar */}
          <div className="flex flex-col gap-3">
            {/* Top row: Search & Category */}
            {/* Top row: Search & Category */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search Box */}
              <div className="relative max-w-md flex-1">
                <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="খরচের শিরোনাম, ক্যাটাগরি বা নোট দিয়ে খুঁজুন..."
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

              {/* Category Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium whitespace-nowrap text-slate-600 dark:text-slate-400">
                  ক্যাটাগরি:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-green-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {OTHER_COST_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bottom row: Date-wise Filter Bar */}
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
                      onClick={() => applyDatePreset(p.id)}
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
                  ফিল্টারে: <strong>{totalItems}</strong> টি খরচ
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <RiCloseLine className="size-3.5" />
                    রিসেট
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            {isLoading && (
              <div className="backdrop-blur-2xs absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-950/60">
                <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-md dark:bg-slate-900 dark:text-slate-200">
                  <RiRefreshLine className="size-4 animate-spin text-green-600" />
                  <span>লোড হচ্ছে...</span>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 uppercase dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                  <tr className="whitespace-nowrap">
                    <th scope="col" className="w-16 px-4 py-3 text-center whitespace-nowrap">
                      ক্রমিক নং
                    </th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap">
                      তারিখ
                    </th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap">
                      খরচের বিবরণ / শিরোনাম
                    </th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap">
                      ক্যাটাগরি
                    </th>
                    <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">
                      পরিমাণ
                    </th>
                    <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">
                      অ্যাকশন
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
                  {costsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <RiFileTextLine className="mb-2 size-10 text-slate-300 dark:text-slate-700" />
                          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                            কোনো খরচের রেকর্ড পাওয়া যায়নি
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            নতুন খরচের এন্ট্রি যোগ করতে নিচের বাটনে ক্লিক করুন
                          </p>
                          <Button
                            onClick={openAddDialog}
                            size="sm"
                            className="mt-4 bg-green-600 text-xs text-white hover:bg-green-700"
                          >
                            প্রথম খরচ যোগ করুন
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    costsList.map((cost, idx) => {
                      const formattedDate = cost.date
                        ? new Date(cost.date).toLocaleDateString("bn-BD", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—";

                      return (
                        <tr
                          key={cost.id}
                          className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          {/* SL Number */}
                          <td className="px-4 py-3 text-center font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3 text-xs font-medium whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {formattedDate}
                          </td>

                          {/* Title & Description */}
                          <td className="max-w-xs px-4 py-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {cost.title}
                            </div>
                            {cost.description && (
                              <div className="line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                                {cost.description}
                              </div>
                            )}
                          </td>

                          {/* Category Badge */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getCategoryBadgeClass(
                                cost.category
                              )}`}
                            >
                              {getCategoryLabel(cost.category)}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3 text-right font-bold whitespace-nowrap text-slate-900 dark:text-white">
                            ৳ {cost.amount.toLocaleString("en-IN")}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPreviewDialog(cost)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                title="ভাউচার মেমো দেখুন ও প্রিন্ট করুন"
                              >
                                <RiEyeLine className="size-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(cost)}
                                className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                                title="সম্পাদনা করুন"
                              >
                                <RiEditLine className="size-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteDialog(cost)}
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

            {/* Pagination Component */}
            <div className="bg-slate-50/50 px-4 dark:bg-slate-900/50">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(newLimit) => {
                  setItemsPerPage(newLimit);
                  setCurrentPage(1);
                }}
                itemName="খরচ"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Add Other Cost Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <RiHandCoinLine className="size-5 text-green-600" />
                নতুন অন্যান্য খরচ যোগ করুন
              </DialogTitle>
              <DialogDescription>
                ব্যবসায়িক পরিবহন, কর্মচারীর বেতন, দোকান ভাড়া বা আনুষঙ্গিক খরচের তথ্য লিপিবদ্ধ
                করুন।
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="cost-title" className="text-xs font-semibold">
                  খরচের শিরোনাম / বিবরণ <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="cost-title"
                  placeholder="যেমন: ট্রাক পরিবহন ভাড়া, কর্মচারী দৈনিক হাজিরা, চা-নাস্তা"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={formErrors.title ? "border-rose-500" : ""}
                />
                {formErrors.title && (
                  <p className="text-[11px] text-rose-500">{formErrors.title}</p>
                )}
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cost-amount" className="text-xs font-semibold">
                    খরচের পরিমাণ (৳) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="cost-amount"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="০.০০"
                    value={formData.amount === 0 ? "" : formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    className={formErrors.amount ? "border-rose-500" : ""}
                  />
                  {formErrors.amount && (
                    <p className="text-[11px] text-rose-500">{formErrors.amount}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cost-category" className="text-xs font-semibold">
                    ক্যাটাগরি / খাত
                  </Label>
                  <select
                    id="cost-category"
                    value={formData.category || "other"}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs focus:border-green-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {OTHER_COST_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="cost-date" className="text-xs font-semibold">
                  তারিখ <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="cost-date"
                  type="date"
                  value={
                    formData.date
                      ? typeof formData.date === "string"
                        ? formData.date.split("T")[0]
                        : new Date(formData.date).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={formErrors.date ? "border-rose-500" : ""}
                />
                {formErrors.date && <p className="text-[11px] text-rose-500">{formErrors.date}</p>}
              </div>

              {/* Description / Note */}
              <div className="space-y-1.5">
                <Label htmlFor="cost-desc" className="text-xs font-semibold">
                  অতিরিক্ত বিবরণ বা মন্তব্য (ঐচ্ছিক)
                </Label>
                <Textarea
                  id="cost-desc"
                  rows={2}
                  placeholder="খরচের বিস্তারিত ব্যাখ্যা লিখুন..."
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                বাতিল
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {isPending ? "সংরক্ষণ হচ্ছে..." : "খরচ সংরক্ষণ করুন"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Edit Other Cost Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <RiEditLine className="size-5 text-blue-600" />
                খরচের তথ্য সম্পাদনা করুন
              </DialogTitle>
              <DialogDescription>
                পূর্বে লিপিবদ্ধ খরচের তথ্য বা টাকার পরিমাণ পরিবর্তন করুন।
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-cost-title" className="text-xs font-semibold">
                  খরচের শিরোনাম / বিবরণ <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="edit-cost-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={formErrors.title ? "border-rose-500" : ""}
                />
                {formErrors.title && (
                  <p className="text-[11px] text-rose-500">{formErrors.title}</p>
                )}
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-cost-amount" className="text-xs font-semibold">
                    খরচের পরিমাণ (৳) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="edit-cost-amount"
                    type="number"
                    min="0"
                    step="any"
                    value={formData.amount === 0 ? "" : formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    className={formErrors.amount ? "border-rose-500" : ""}
                  />
                  {formErrors.amount && (
                    <p className="text-[11px] text-rose-500">{formErrors.amount}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-cost-category" className="text-xs font-semibold">
                    ক্যাটাগরি / খাত
                  </Label>
                  <select
                    id="edit-cost-category"
                    value={formData.category || "other"}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs focus:border-green-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {OTHER_COST_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-cost-date" className="text-xs font-semibold">
                  তারিখ <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="edit-cost-date"
                  type="date"
                  value={
                    formData.date
                      ? typeof formData.date === "string"
                        ? formData.date.split("T")[0]
                        : new Date(formData.date).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={formErrors.date ? "border-rose-500" : ""}
                />
              </div>

              {/* Description / Note */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-cost-desc" className="text-xs font-semibold">
                  অতিরিক্ত বিবরণ বা মন্তব্য (ঐচ্ছিক)
                </Label>
                <Textarea
                  id="edit-cost-desc"
                  rows={2}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isPending ? "আপডেট হচ্ছে..." : "আপডেট সংরক্ষণ করুন"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-rose-600">
              <RiDeleteBinLine className="size-5" />
              খরচের রেকর্ড মুছে ফেলতে চান?
            </DialogTitle>
            <DialogDescription>
              আপনি কি নিশ্চিত যে <strong>&ldquo;{activeCost?.title}&rdquo;</strong> (৳{" "}
              {activeCost?.amount.toLocaleString("en-IN")}) খরচের এই এন্ট্রিটি মুছে ফেলতে চান? এটি
              স্থায়ীভাবে ডেটাবেজ থেকে মুছে যাবে।
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
            >
              বাতিল
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteSubmit}
              disabled={isPending}
            >
              {isPending ? "মুছে ফেলা হচ্ছে..." : "হ্যাঁ, মুছে ফেলুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Voucher Preview & Print Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <RiPriceTag3Line className="size-5 text-green-600" />
              খরচ ভাউচার / ডেবিট রশিদ
            </DialogTitle>
            <DialogDescription>খরচ ও ব্যয়ের বিস্তারিত বিবরণ</DialogDescription>
          </DialogHeader>

          {activeCost && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">তারিখ:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {activeCost.date
                      ? new Date(activeCost.date).toLocaleDateString("bn-BD", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400">খাত / ক্যাটাগরি:</span>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getCategoryBadgeClass(
                        activeCost.category
                      )}`}
                    >
                      {getCategoryLabel(activeCost.category)}
                    </span>
                  </div>
                </div>

                <div className="col-span-2">
                  <span className="text-slate-500 dark:text-slate-400">শিরোনাম / বিবরণ:</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeCost.title}
                  </div>
                </div>

                {activeCost.description && (
                  <div className="col-span-2">
                    <span className="text-slate-500 dark:text-slate-400">মন্তব্য / নোট:</span>
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      {activeCost.description}
                    </div>
                  </div>
                )}
              </div>

              {/* Amount Box */}
              <div className="rounded-lg border border-green-200 bg-green-50/80 p-3 text-center dark:border-green-900/40 dark:bg-green-950/40">
                <span className="text-xs font-medium text-green-800 dark:text-green-300">
                  পরিশোধিত মোট খরচের পরিমাণ
                </span>
                <div className="text-2xl font-black text-green-700 dark:text-green-400">
                  ৳ {activeCost.amount.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-row items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeCost) printOtherCostVoucherPDF(activeCost, "print");
              }}
              className="gap-1.5"
            >
              <RiPrinterLine className="size-4 text-slate-600" />
              <span>প্রিন্ট ভাউচার</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (activeCost) printOtherCostVoucherPDF(activeCost, "download");
              }}
              className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
            >
              <RiDownloadLine className="size-4" />
              <span>PDF ডাউনলোড</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Reports & Export Dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <RiFileList3Line className="size-5 text-green-600" />
              অন্যান্য খরচের রিপোর্ট ও এক্সপোর্ট
            </DialogTitle>
            <DialogDescription>
              সকল খরচ বা ফিল্টারকৃত খরচের তালিকা PDF, Excel বা CSV ফরম্যাটে এক্সপোর্ট করুন।
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Scope Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                এক্সপোর্টের আওতা (Scope)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope("all")}
                  className={`rounded-lg border p-3 text-left transition ${
                    exportScope === "all"
                      ? "border-green-600 bg-green-50 ring-2 ring-green-600/20 dark:border-green-500 dark:bg-green-950/40"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                  }`}
                >
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                    সকল রেকর্ড
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    মোট {stats.totalCount} টি খরচ
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope("filtered")}
                  className={`rounded-lg border p-3 text-left transition ${
                    exportScope === "filtered"
                      ? "border-green-600 bg-green-50 ring-2 ring-green-600/20 dark:border-green-500 dark:bg-green-950/40"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                  }`}
                >
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                    বর্তমান ফিল্টার
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    ফিল্টারে {totalItems} টি খরচ
                  </span>
                </button>
              </div>
            </div>

            {/* Export Format Actions */}
            <div className="grid grid-cols-1 gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleExport("pdf", "download")}
                disabled={isGeneratingPdf}
                className="justify-between border-slate-300 hover:bg-slate-50 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <RiFilePdf2Line className="size-4 text-rose-600" />
                  <span className="text-xs font-semibold">PDF তালিকা রিপোর্ট ডাউনলোড</span>
                </div>
                <RiDownloadLine className="size-4 text-slate-400" />
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleExport("pdf", "print")}
                disabled={isGeneratingPdf}
                className="justify-between border-slate-300 hover:bg-slate-50 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <RiPrinterLine className="size-4 text-emerald-600" />
                  <span className="text-xs font-semibold">সরাসরি প্রিন্ট করুন</span>
                </div>
                <span className="text-[11px] text-slate-400">A4 সাইজ</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleExport("excel")}
                disabled={isGeneratingPdf}
                className="justify-between border-slate-300 hover:bg-slate-50 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <RiFileExcel2Line className="size-4 text-emerald-700" />
                  <span className="text-xs font-semibold">Microsoft Excel (.xlsx) এক্সপোর্ট</span>
                </div>
                <RiDownloadLine className="size-4 text-slate-400" />
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={isGeneratingPdf}
                className="justify-between border-slate-300 hover:bg-slate-50 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <RiFileTextLine className="size-4 text-blue-600" />
                  <span className="text-xs font-semibold">CSV ফরম্যাটে ডাউনলোড</span>
                </div>
                <RiDownloadLine className="size-4 text-slate-400" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsExportOpen(false)}
            >
              বন্ধ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
