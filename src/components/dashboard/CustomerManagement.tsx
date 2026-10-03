"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import Link from "next/link";

import {
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiEditLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiFileExcel2Line,
  RiFilePdf2Line,
  RiFileTextLine,
  RiLoader4Line,
  RiMapPinLine,
  RiPhoneLine,
  RiPrinterLine,
  RiRefreshLine,
  RiSearchLine,
  RiStoreLine,
  RiUserAddLine,
  RiUserLine,
} from "@remixicon/react";

import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "@/actions/customers";
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
import {
  type Customer,
  type CustomerInput,
  type CustomerStats,
  type PaginatedCustomersResult,
} from "@/lib/customers";
import { exportCustomerListPDF } from "@/lib/pdf-export";
import { exportCustomersToCSV, exportCustomersToExcel } from "@/lib/sheet-export";

interface CustomerManagementProps {
  initialData?: PaginatedCustomersResult;
  initialCustomers?: Customer[];
}

export default function CustomerManagement({
  initialData,
  initialCustomers,
}: CustomerManagementProps) {
  const [customersList, setCustomersList] = useState<Customer[]>(
    initialData?.customers || initialCustomers || []
  );
  const [totalItems, setTotalItems] = useState<number>(
    initialData?.total ?? (initialCustomers?.length || 0)
  );
  const [totalPages, setTotalPages] = useState<number>(
    initialData?.totalPages ?? Math.max(1, Math.ceil((initialCustomers?.length || 0) / 20))
  );
  const [currentPage, setCurrentPage] = useState<number>(initialData?.currentPage ?? 1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(initialData?.limit ?? 20);
  const [stats, setStats] = useState<CustomerStats>(
    initialData?.stats ?? {
      total: initialCustomers?.length || 0,
      totalDue: (initialCustomers || []).reduce(
        (acc, c) => acc + (Number(c.total_due ?? c.due) || 0),
        0
      ),
      dueCustomersCount: (initialCustomers || []).filter(
        (c) => (Number(c.total_due ?? c.due) || 0) > 0
      ).length,
    }
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isInitialMount = useRef(true);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"all" | "filtered">("all");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Active customer for view / edit / delete
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  // Form states
  const [formData, setFormData] = useState<CustomerInput>({
    name: "",
    phone: "",
    address: "",
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
      setNotification((current) => (current?.message === message ? null : current));
    }, 4000);
  };

  // Debounce search term changes by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch customers from server with pagination and search
  const fetchCustomers = useCallback(async (page: number, limit: number, search: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }
      const res = await fetch(`/api/customers?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCustomersList(data.data);
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
      showFeedback("error", "গ্রাহক তথ্য লোড করতে সমস্যা হয়েছে");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-fetch when page, limit, or search change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchCustomers(currentPage, itemsPerPage, debouncedSearch);
  }, [currentPage, itemsPerPage, debouncedSearch, fetchCustomers]);

  // Refresh customers from API
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchCustomers(currentPage, itemsPerPage, debouncedSearch);
      showFeedback("success", "গ্রাহক তালিকা সফলভাবে রিফ্রেশ করা হয়েছে");
    } catch {
      showFeedback("error", "রিফ্রেশ করতে ব্যর্থ হয়েছে");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export customers sheet & PDF (fetches full matching set from server)
  const handleExport = async (
    format: "pdf" | "xlsx" | "csv",
    mode: "download" | "print" = "download"
  ) => {
    setIsGeneratingPdf(true);
    try {
      let listToExport: Customer[] = [];
      const isFiltered = exportScope === "filtered" && debouncedSearch.trim();
      const queryUrl = isFiltered
        ? `/api/customers?all=true&search=${encodeURIComponent(debouncedSearch.trim())}`
        : `/api/customers?all=true`;

      const res = await fetch(queryUrl, { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        listToExport = data.data;
      } else {
        listToExport = customersList;
      }

      if (listToExport.length === 0) {
        showFeedback("error", "ডাউনলোড করার মতো কোনো গ্রাহক পাওয়া যায়নি");
        return;
      }
      const today = new Date().toISOString().split("T")[0];
      const prefix = isFiltered ? "ফিল্টারকৃত_গ্রাহক_তালিকা" : "সকল_গ্রাহক_তালিকা";

      if (format === "pdf") {
        await exportCustomerListPDF({
          customers: listToExport,
          filterScope: exportScope,
          customFileName: `${prefix}_${today}.pdf`,
          mode,
        });
        setIsExportOpen(false);
        showFeedback(
          "success",
          mode === "print"
            ? "গ্রাহক তালিকা প্রিন্ট প্রিভিউ প্রস্তুত হয়েছে!"
            : `${listToExport.length} জন গ্রাহকের PDF তালিকা সফলভাবে ডাউনলোড হয়েছে!`
        );
        return;
      }

      if (format === "xlsx") {
        exportCustomersToExcel(listToExport, `${prefix}_${today}.xlsx`);
      } else {
        exportCustomersToCSV(listToExport, `${prefix}_${today}.csv`);
      }
      setIsExportOpen(false);
      showFeedback("success", `${listToExport.length} জন গ্রাহকের শিট সফলভাবে ডাউনলোড হয়েছে!`);
    } catch (err) {
      console.error("Export error:", err);
      showFeedback("error", "রিপোর্ট তৈরি করতে সমস্যা হয়েছে");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Open Add Dialog
  const openAddDialog = () => {
    setFormData({
      name: "",
      phone: "",
      address: "",
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (customer: Customer) => {
    setActiveCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  // Open Delete Dialog
  const openDeleteDialog = (customer: Customer) => {
    setActiveCustomer(customer);
    setIsDeleteOpen(true);
  };

  // Open Preview Dialog
  const openPreviewDialog = (customer: Customer) => {
    setActiveCustomer(customer);
    setIsPreviewOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) {
      errors.name = "গ্রাহকের নাম আবশ্যক";
    }

    if (formData.phone?.trim()) {
      const clean = formData.phone.trim().replace(/[-\s]/g, "");
      if (clean.length < 6) {
        errors.phone = "সঠিক ফোন নম্বর প্রদান করুন";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    startTransition(async () => {
      const res = await createCustomerAction(formData);

      if (res.success && res.data) {
        setIsAddOpen(false);
        showFeedback("success", `গ্রাহক "${res.data.name}" সফলভাবে তৈরি করা হয়েছে!`);
        await fetchCustomers(1, itemsPerPage, debouncedSearch);
      } else {
        showFeedback("error", res.error || "গ্রাহক তৈরি করতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !validateForm()) return;

    startTransition(async () => {
      const res = await updateCustomerAction(activeCustomer.id, formData);

      if (res.success && res.data) {
        setCustomersList((prev) => prev.map((c) => (c.id === activeCustomer.id ? res.data! : c)));
        setIsEditOpen(false);
        showFeedback("success", `"${res.data.name}" এর তথ্য সফলভাবে আপডেট করা হয়েছে!`);
        await fetchCustomers(currentPage, itemsPerPage, debouncedSearch);
      } else {
        showFeedback("error", res.error || "গ্রাহকের তথ্য আপডেট করতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Delete
  const handleDeleteSubmit = () => {
    if (!activeCustomer) return;

    startTransition(async () => {
      const res = await deleteCustomerAction(activeCustomer.id);

      if (res.success) {
        setIsDeleteOpen(false);
        showFeedback("success", `গ্রাহক "${activeCustomer.name}" সফলভাবে মুছে ফেলা হয়েছে!`);
        setActiveCustomer(null);
        const targetPage =
          customersList.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
        await fetchCustomers(targetPage, itemsPerPage, debouncedSearch);
      } else {
        showFeedback("error", res.error || "গ্রাহক মুছে ফেলতে ব্যর্থ হয়েছে");
      }
    });
  };

  return (
    <div id="customers" className="scroll-mt-20 space-y-6">
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

      {/* Main Customers Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                <RiStoreLine className="size-5 text-green-600 dark:text-green-400" />
                গ্রাহক / কাস্টমার ব্যবস্থাপনা
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-green-50 text-xs font-semibold text-green-700 ring-1 ring-green-600/20 dark:bg-green-950/60 dark:text-green-300"
              >
                মোট {stats.total} জন গ্রাহক
              </Badge>
              {stats.totalDue > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-rose-50 text-xs font-semibold text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-950/60 dark:text-rose-300"
                >
                  সর্বমোট বকেয়া: ৳ {stats.totalDue.toLocaleString("en-IN")} (
                  {stats.dueCustomersCount} জন)
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              খুচরা, পাইকারি ও ভিআইপি গ্রাহক প্রোফাইল তৈরি, পরিচালনা ও আপডেট করুন
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5"
              title="তালিকা রিফ্রেশ করুন"
            >
              <RiRefreshLine className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">রিফ্রেশ</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportOpen(true)}
              className="gap-1.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              title="গ্রাহক তালিকা এক্সেল বা সিএসভি শিট ফরম্যাটে ডাউনলোড করুন"
            >
              <RiFileExcel2Line className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>শিট ডাউনলোড</span>
            </Button>

            <Button
              onClick={openAddDialog}
              className="gap-1.5 bg-green-600 text-white shadow-sm hover:bg-green-700"
            >
              <RiUserAddLine className="size-4.5" />
              <span>নতুন গ্রাহক যোগ করুন</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Search and Filters Toolbar */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Search Box */}
              <div className="relative max-w-md flex-1">
                <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="গ্রাহক খুঁজুন (নাম, ফোন নম্বর, ঠিকানা)..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 bg-slate-50/50 pl-9 dark:bg-slate-900/50"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="সার্চ পরিষ্কার করুন"
                  >
                    <RiCloseLine className="size-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          {customersList.length === 0 && !isLoading ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <RiUserLine className="size-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                কোনো গ্রাহক খুঁজে পাওয়া যায়নি
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                {searchTerm
                  ? "আপনার অনুসন্ধানের সাথে মেলে এমন কোনো গ্রাহক নেই। ফিল্টার রিসেট করে আবার চেষ্টা করুন।"
                  : "এখনো কোনো গ্রাহকের তথ্য সংরক্ষিত নেই।"}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className="mt-4"
                >
                  সার্চ রিসেট করুন
                </Button>
              )}
            </div>
          ) : (
            <div className="relative overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-md ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                    <RiLoader4Line className="size-4 animate-spin text-green-600" />
                    <span>লোড হচ্ছে...</span>
                  </div>
                </div>
              )}
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wider text-slate-700 uppercase dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                  <tr className="whitespace-nowrap">
                    <th scope="col" className="w-12 px-3 py-3.5 text-center whitespace-nowrap">
                      SL
                    </th>
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                      গ্রাহকের নাম ও আইডি
                    </th>
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                      যোগাযোগ (ফোন)
                    </th>
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                      ঠিকানা
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right whitespace-nowrap">
                      মোট বকেয়া (Due)
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right whitespace-nowrap">
                      অ্যাকশন
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
                  {customersList.map((cust, idx) => {
                    const dueVal = Number(cust.total_due ?? cust.due) || 0;
                    const slNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr
                        key={cust.id}
                        className="group transition hover:bg-slate-50/75 dark:hover:bg-slate-900/60"
                      >
                        {/* SL No */}
                        <td className="w-12 px-3 py-3 text-center font-mono text-xs text-slate-400 dark:text-slate-500">
                          {slNumber}
                        </td>

                        {/* Name & Avatar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar size="sm" className="ring-1 ring-slate-200 dark:ring-slate-800">
                              <AvatarFallback className="bg-green-100 font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
                                {cust.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Link
                                  href={`/dashboard/customers/${cust.id}`}
                                  className="font-bold text-slate-900 hover:text-green-600 hover:underline dark:text-white dark:hover:text-green-400"
                                  title="গ্রাহকের লেনদেন ও বিস্তারিত দেখুন"
                                >
                                  {cust.name}
                                </Link>
                              </div>
                              <div className="font-mono text-xs text-slate-400 dark:text-slate-500">
                                ID: {cust.id.slice(-6)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact: Phone & Email */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5 text-xs">
                            {cust.phone ? (
                              <a
                                href={`tel:${cust.phone}`}
                                className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-green-700 dark:text-slate-300 dark:hover:text-green-400"
                              >
                                <RiPhoneLine className="size-3.5 text-slate-400" />
                                <span>{cust.phone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400">ফোন নেই</span>
                            )}
                          </div>
                        </td>

                        {/* Address */}
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                          {cust.address ? (
                            <div className="flex max-w-xs items-start gap-1">
                              <RiMapPinLine className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                              <span className="line-clamp-2">{cust.address}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">ঠিকানা নেই</span>
                          )}
                        </td>

                        {/* Due Amount */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {dueVal > 0 ? (
                            <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-600/20 ring-inset dark:bg-rose-950/60 dark:text-rose-300">
                              ৳ {dueVal.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              পরিশোধিত (৳ 0)
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Ledger & Transactions */}
                            <Link
                              href={`/dashboard/customers/${cust.id}`}
                              className="inline-flex size-8 items-center justify-center rounded-lg text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-950/40"
                              title="বিক্রয় ও বকেয়া খতিয়ান দেখুন"
                            >
                              <RiFileTextLine className="size-4" />
                              <span className="sr-only">খতিয়ান</span>
                            </Link>

                            {/* Preview */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openPreviewDialog(cust)}
                              title="বিস্তারিত দেখুন"
                              className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                              <RiEyeLine className="size-4" />
                              <span className="sr-only">প্রিভিউ</span>
                            </Button>

                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditDialog(cust)}
                              title="সম্পাদনা করুন"
                              className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/40"
                            >
                              <RiEditLine className="size-4" />
                              <span className="sr-only">সম্পাদনা</span>
                            </Button>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openDeleteDialog(cust)}
                              title="মুছে ফেলুন"
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            >
                              <RiDeleteBinLine className="size-4" />
                              <span className="sr-only">মুছুন</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination controls (20 items per page default) */}
              <div className="bg-slate-50/50 px-4 dark:bg-slate-900/50">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                  onItemsPerPageChange={(limit) => {
                    setItemsPerPage(limit);
                    setCurrentPage(1);
                  }}
                  itemName="গ্রাহক"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* ADD CUSTOMER DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>নতুন গ্রাহক যোগ করুন</DialogTitle>
            <DialogDescription>
              গ্রাহকের নাম, যোগাযোগের তথ্য ও গ্রাহকের ক্যাটাগরি প্রদান করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            {/* Name */}
            <div>
              <Label htmlFor="cust-add-name" className="text-sm font-medium">
                গ্রাহক / প্রতিষ্ঠানের নাম <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="cust-add-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="যেমন: রহিম ডেইরি ফার্ম / হাজী করিম"
                className="mt-1"
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <p className="mt-1 text-xs text-rose-500">{formErrors.name}</p>}
            </div>

            {/* Phone & Email Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="cust-add-phone" className="text-sm font-medium">
                  ফোন নম্বর
                </Label>
                <div className="relative mt-1">
                  <RiPhoneLine className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="cust-add-phone"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="017XXXXXXXX"
                    className="pl-8.5"
                    aria-invalid={!!formErrors.phone}
                  />
                </div>
                {formErrors.phone && (
                  <p className="mt-1 text-xs text-rose-500">{formErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="cust-add-address" className="text-sm font-medium">
                ঠিকানা / লোকেশন
              </Label>
              <Textarea
                id="cust-add-address"
                rows={2}
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="যেমন: পাবনা সদর, পাবনা"
                className="mt-1 min-h-[60px]"
              />
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <DialogClose render={<Button variant="outline" type="button" />}>
                বাতিল করুন
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
              >
                {isPending && <RiLoader4Line className="size-4 animate-spin" />}
                গ্রাহক সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* EDIT CUSTOMER DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>গ্রাহকের তথ্য সম্পাদনা করুন</DialogTitle>
            <DialogDescription>
              গ্রাহকের নাম, যোগাযোগের তথ্য বা ক্যাটাগরি পরিবর্তন করে সংরক্ষণ করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            {/* Name */}
            <div>
              <Label htmlFor="cust-edit-name" className="text-sm font-medium">
                গ্রাহক / প্রতিষ্ঠানের নাম <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="cust-edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <p className="mt-1 text-xs text-rose-500">{formErrors.name}</p>}
            </div>

            {/* Phone & Email Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="cust-edit-phone" className="text-sm font-medium">
                  ফোন নম্বর
                </Label>
                <div className="relative mt-1">
                  <RiPhoneLine className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="cust-edit-phone"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-8.5"
                    aria-invalid={!!formErrors.phone}
                  />
                </div>
                {formErrors.phone && (
                  <p className="mt-1 text-xs text-rose-500">{formErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="cust-edit-address" className="text-sm font-medium">
                ঠিকানা / লোকেশন
              </Label>
              <Textarea
                id="cust-edit-address"
                rows={2}
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1 min-h-[60px]"
              />
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <DialogClose render={<Button variant="outline" type="button" />}>
                বাতিল করুন
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
              >
                {isPending && <RiLoader4Line className="size-4 animate-spin" />}
                আপডেট সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <RiDeleteBinLine className="size-6" />
            </div>
            <DialogTitle className="text-center">গ্রাহক মুছে ফেলতে চান?</DialogTitle>
            <DialogDescription className="text-center">
              আপনি কি নিশ্চিত যে{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                &ldquo;{activeCustomer?.name}&rdquo;
              </span>{" "}
              এর তথ্য মুছে ফেলতে চান? এই অ্যাকশনটি স্থায়ী এবং তা ডাটাবেজ থেকে গ্রাহক প্রোফাইলটি
              মুছে দেবে।
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2 sm:justify-center">
            <DialogClose render={<Button variant="outline" type="button" />}>বাতিল</DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending && <RiLoader4Line className="size-4 animate-spin" />}
              হ্যাঁ, মুছে ফেলুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* VIEW CUSTOMER PROFILE DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-md">
          {activeCustomer && (
            <div className="bg-card text-card-foreground">
              {/* Profile Header */}
              <div className="relative bg-gradient-to-br from-green-600 to-emerald-800 p-6 text-white">
                <div className="flex items-center gap-4">
                  <Avatar size="lg" className="ring-2 ring-white/30">
                    <AvatarFallback className="bg-white/20 text-xl font-bold text-white">
                      {activeCustomer.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">{activeCustomer.name}</h3>
                    </div>
                    <span className="font-mono text-xs text-green-100">
                      ID: {activeCustomer.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="space-y-4 p-6">
                {/* Phone */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <RiPhoneLine className="size-3.5" />
                    ফোন নম্বর:
                  </span>
                  {activeCustomer.phone ? (
                    <a
                      href={`tel:${activeCustomer.phone}`}
                      className="text-xs font-semibold text-green-600 hover:underline dark:text-green-400"
                    >
                      {activeCustomer.phone}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>

                {/* Address */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <RiMapPinLine className="size-3.5" />
                    ঠিকানা:
                  </span>
                  <span className="max-w-[220px] text-right text-xs font-medium text-slate-800 dark:text-slate-200">
                    {activeCustomer.address || "—"}
                  </span>
                </div>

                {/* Total Due */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    বর্তমান মোট বকেয়া:
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      Number(activeCustomer.total_due ?? activeCustomer.due ?? 0) > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    ৳{" "}
                    {Number(activeCustomer.total_due ?? activeCustomer.due ?? 0).toLocaleString(
                      "en-IN"
                    )}
                  </span>
                </div>

                {/* Created At */}
                {activeCustomer.created_at && (
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>যোগদানের তারিখ:</span>
                    <span>{new Date(activeCustomer.created_at).toLocaleDateString("bn-BD")}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <Link
                  href={`/dashboard/customers/${activeCustomer.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:underline dark:text-green-400"
                >
                  <RiFileTextLine className="size-4" />
                  বিক্রয় ও বকেয়া খতিয়ান দেখুন
                </Link>
                <DialogClose render={<Button variant="outline" size="sm" />}>বন্ধ করুন</DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Sheet Dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                <RiFileTextLine className="size-5" />
              </div>
              গ্রাহক তালিকা ও রিপোর্ট ডাউনলোড
            </DialogTitle>
            <DialogDescription>
              এসআর ট্রেডলিংক এর অফিসিয়াল হেডার ও স্বাক্ষর সহ PDF রিপোর্ট অথবা এক্সেল/সিএসভি
              স্প্রেডশিট ডাউনলোড করুন
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ডাউনলোডের আওতা (Scope)
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setExportScope("all")}
                  className={`flex flex-col rounded-lg border p-3 text-left transition-all ${
                    exportScope === "all"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    সকল গ্রাহক
                  </span>
                  <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    মোট {stats.total} জন
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope("filtered")}
                  className={`flex flex-col rounded-lg border p-3 text-left transition-all ${
                    exportScope === "filtered"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    ফিল্টারকৃত গ্রাহক
                  </span>
                  <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    বর্তমান ফিল্টারে {totalItems} জন
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-1 rounded-lg bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              <p className="font-semibold">পিডিএফ (.pdf) রিপোর্টের বৈশিষ্ট্য:</p>
              <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                এসআর ট্রেডলিংক এর অফিসিয়াল ব্র্যান্ডিং হেডার, ঠিকানা ও যোগাযোগের তথ্য, গ্রাহক
                পরিসংখ্যান এবং যাচাইকরণের জন্য অনুমোদিত স্বাক্ষর ও সিল অন্তর্ভুক্ত থাকে।
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <DialogClose render={<Button variant="outline" size="sm" />}>বাতিল</DialogClose>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("pdf", "print")}
              disabled={isGeneratingPdf}
              className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              <RiPrinterLine className="size-4 text-slate-600" />
              <span>প্রিন্ট / প্রিভিউ</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              <RiDownloadLine className="size-4" />
              <span>CSV (.csv)</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("xlsx")}
              className="gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300"
            >
              <RiFileExcel2Line className="size-4" />
              <span>Excel (.xlsx)</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleExport("pdf", "download")}
              disabled={isGeneratingPdf}
              className="gap-1.5 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
            >
              {isGeneratingPdf ? (
                <RiLoader4Line className="size-4 animate-spin" />
              ) : (
                <RiFilePdf2Line className="size-4" />
              )}
              <span>PDF (.pdf) ডাউনলোড</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
