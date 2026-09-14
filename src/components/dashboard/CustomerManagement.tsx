"use client";

import { useMemo, useState, useTransition } from "react";

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
  RiFilterLine,
  RiLoader4Line,
  RiMailLine,
  RiMapPinLine,
  RiPhoneLine,
  RiPrinterLine,
  RiRefreshLine,
  RiSearchLine,
  RiStoreLine,
  RiUserAddLine,
  RiUserLine,
  RiVipCrownLine,
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
import type { Customer, CustomerInput, CustomerType } from "@/lib/customers";
import { exportCustomerListPDF } from "@/lib/pdf-export";
import { exportCustomersToCSV, exportCustomersToExcel } from "@/lib/sheet-export";

const CUSTOMER_TYPES: { value: CustomerType; label: string; desc: string }[] = [
  { value: "RETAIL", label: "খুচরা (Retail)", desc: "সাধারণ খুচরা ক্রেতা" },
  { value: "WHOLESALE", label: "পাইকারি (Wholesale)", desc: "পাইকারি বা খামারি ক্রেতা" },
  { value: "BOTH", label: "উভয় (Both)", desc: "খুচরা ও পাইকারি উভয় সুবিধা" },
];

function getCustomerTypeBadgeClass(type: CustomerType) {
  switch (type) {
    case "WHOLESALE":
      return "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-950/60 dark:text-purple-300 dark:ring-purple-500/30";
    case "BOTH":
      return "bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-500/30";
    case "RETAIL":
    default:
      return "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-500/30";
  }
}

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

interface CustomerManagementProps {
  initialCustomers: Customer[];
}

export default function CustomerManagement({ initialCustomers }: CustomerManagementProps) {
  const [customersList, setCustomersList] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [vipFilterOnly, setVipFilterOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    email: "",
    phone: "",
    address: "",
    is_vip: false,
    type: "RETAIL",
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

  // Filter customers by search, type, and VIP status
  const filteredCustomers = useMemo(() => {
    return customersList.filter((customer) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        customer.name.toLowerCase().includes(term) ||
        (customer.phone && customer.phone.toLowerCase().includes(term)) ||
        (customer.email && customer.email.toLowerCase().includes(term)) ||
        (customer.address && customer.address.toLowerCase().includes(term));

      const matchesType = selectedTypeFilter === "all" || customer.type === selectedTypeFilter;

      const matchesVip = !vipFilterOnly || customer.is_vip;

      return matchesSearch && matchesType && matchesVip;
    });
  }, [customersList, searchTerm, selectedTypeFilter, vipFilterOnly]);

  // Pagination (20 items per page by default)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  // Summary counts
  const stats = useMemo(() => {
    const wholesale = customersList.filter((c) => c.type === "WHOLESALE").length;
    const retail = customersList.filter((c) => c.type === "RETAIL").length;
    const both = customersList.filter((c) => c.type === "BOTH").length;
    const vip = customersList.filter((c) => c.is_vip).length;
    return { total: customersList.length, wholesale, retail, both, vip };
  }, [customersList]);

  // Refresh customers from API
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/customers", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCustomersList(data.data);
        showFeedback("success", "গ্রাহক তালিকা সফলভাবে রিফ্রেশ করা হয়েছে");
      }
    } catch {
      showFeedback("error", "রিফ্রেশ করতে ব্যর্থ হয়েছে");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export customers sheet & PDF
  const handleExport = async (
    format: "pdf" | "xlsx" | "csv",
    mode: "download" | "print" = "download"
  ) => {
    const listToExport = exportScope === "filtered" ? filteredCustomers : customersList;
    if (listToExport.length === 0) {
      showFeedback("error", "ডাউনলোড করার মতো কোনো গ্রাহক পাওয়া যায়নি");
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const prefix = exportScope === "filtered" ? "ফিল্টারকৃত_গ্রাহক_তালিকা" : "সকল_গ্রাহক_তালিকা";

    if (format === "pdf") {
      try {
        setIsGeneratingPdf(true);
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
      } catch (err) {
        console.error("PDF Export error:", err);
        showFeedback("error", "পিডিএফ রিপোর্ট তৈরি করতে সমস্যা হয়েছে");
      } finally {
        setIsGeneratingPdf(false);
      }
      return;
    }

    if (format === "xlsx") {
      exportCustomersToExcel(listToExport, `${prefix}_${today}.xlsx`);
    } else {
      exportCustomersToCSV(listToExport, `${prefix}_${today}.csv`);
    }
    setIsExportOpen(false);
    showFeedback("success", `${listToExport.length} জন গ্রাহকের শিট সফলভাবে ডাউনলোড হয়েছে!`);
  };

  // Open Add Dialog
  const openAddDialog = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      is_vip: false,
      type: "RETAIL",
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (customer: Customer) => {
    setActiveCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      is_vip: customer.is_vip,
      type: customer.type,
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

    if (formData.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = "সঠিক ইমেইল ফরম্যাট দিন (যেমন: name@example.com)";
      }
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
        setCustomersList((prev) => [res.data!, ...prev]);
        setIsAddOpen(false);
        showFeedback("success", `গ্রাহক "${res.data.name}" সফলভাবে তৈরি করা হয়েছে!`);
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
        setCustomersList((prev) => prev.filter((c) => c.id !== activeCustomer.id));
        setIsDeleteOpen(false);
        showFeedback("success", `গ্রাহক "${activeCustomer.name}" সফলভাবে মুছে ফেলা হয়েছে!`);
        setActiveCustomer(null);
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
          {/* Quick Stats Banner */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200/70 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                খুচরা (Retail)
              </div>
              <div className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                {stats.retail} জন
              </div>
            </div>

            <div className="rounded-lg border border-slate-200/70 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                পাইকারি (Wholesale)
              </div>
              <div className="mt-1 text-xl font-bold text-purple-600 dark:text-purple-400">
                {stats.wholesale} জন
              </div>
            </div>

            <div className="rounded-lg border border-slate-200/70 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                উভয় (Both)
              </div>
              <div className="mt-1 text-xl font-bold text-teal-600 dark:text-teal-400">
                {stats.both} জন
              </div>
            </div>

            <div className="rounded-lg border border-amber-200/60 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-300">
                <span>ভিআইপি গ্রাহক</span>
                <RiVipCrownLine className="size-3.5" />
              </div>
              <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                {stats.vip} জন
              </div>
            </div>
          </div>

          {/* Search and Filters Toolbar */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Search Box */}
              <div className="relative max-w-md flex-1">
                <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="গ্রাহক খুঁজুন (নাম, ফোন নম্বর, ইমেইল, ঠিকানা)..."
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

              {/* VIP Toggle & Reset */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVipFilterOnly(!vipFilterOnly);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    vipFilterOnly
                      ? "bg-amber-500 text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  <RiVipCrownLine className="size-3.5" />
                  <span>{vipFilterOnly ? "শুধু VIP প্রদর্শিত" : "সব VIP দেখুন"}</span>
                </button>
              </div>
            </div>

            {/* Type Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="mr-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                <RiFilterLine className="size-3.5" />
                ধরন ফিল্টার:
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedTypeFilter("all");
                  setCurrentPage(1);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  selectedTypeFilter === "all"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                সকল ({customersList.length})
              </button>
              {CUSTOMER_TYPES.map((t) => {
                const count = customersList.filter((c) => c.type === t.value).length;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setSelectedTypeFilter(t.value);
                      setCurrentPage(1);
                    }}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      selectedTypeFilter === t.value
                        ? "bg-green-600 text-white ring-1 ring-green-600"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {t.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          {filteredCustomers.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <RiUserLine className="size-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                কোনো গ্রাহক খুঁজে পাওয়া যায়নি
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                {searchTerm || selectedTypeFilter !== "all" || vipFilterOnly
                  ? "আপনার অনুসন্ধানের সাথে মেলে এমন কোনো গ্রাহক নেই। ফিল্টার রিসেট করে আবার চেষ্টা করুন।"
                  : "এখনো কোনো গ্রাহকের তথ্য সংরক্ষিত নেই।"}
              </p>
              {(searchTerm || selectedTypeFilter !== "all" || vipFilterOnly) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedTypeFilter("all");
                    setVipFilterOnly(false);
                  }}
                  className="mt-4"
                >
                  ফিল্টার রিসেট করুন
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wider text-slate-700 uppercase dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">
                      গ্রাহকের নাম ও স্ট্যাটাস
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      গ্রাহকের ধরন
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      যোগাযোগ (ফোন / ইমেইল)
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      ঠিকানা
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      অ্যাকশন
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
                  {paginatedCustomers.map((cust) => (
                    <tr
                      key={cust.id}
                      className="group transition hover:bg-slate-50/75 dark:hover:bg-slate-900/60"
                    >
                      {/* Name & Avatar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar size="sm" className="ring-1 ring-slate-200 dark:ring-slate-800">
                            <AvatarFallback
                              className={`font-semibold ${
                                cust.is_vip
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                              }`}
                            >
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
                              {cust.is_vip && (
                                <span
                                  title="ভিআইপি গ্রাহক"
                                  className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-600/30 ring-inset dark:bg-amber-950/60 dark:text-amber-300"
                                >
                                  <RiVipCrownLine className="size-3 text-amber-600 dark:text-amber-400" />
                                  VIP
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-xs text-slate-400 dark:text-slate-500">
                              ID: {cust.id.slice(-6)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Customer Type */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getCustomerTypeBadgeClass(
                            cust.type
                          )}`}
                        >
                          {getCustomerTypeLabel(cust.type)}
                        </span>
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

                          {cust.email ? (
                            <a
                              href={`mailto:${cust.email}`}
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-green-700 dark:text-slate-400 dark:hover:text-green-400"
                            >
                              <RiMailLine className="size-3.5 text-slate-400" />
                              <span>{cust.email}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">ইমেইল নেই</span>
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
                  ))}
                </tbody>
              </table>

              {/* Pagination controls (20 items per page default) */}
              <div className="bg-slate-50/50 px-4 dark:bg-slate-900/50">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredCustomers.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
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

            {/* Customer Type Pills */}
            <div>
              <Label className="text-sm font-medium">গ্রাহকের ধরন (Customer Type)</Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {CUSTOMER_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setFormData({ ...formData, type: t.value })}
                    className={`flex flex-col items-center rounded-lg border p-2.5 text-center transition ${
                      formData.type === t.value
                        ? "border-green-600 bg-green-50/70 text-green-800 shadow-xs ring-1 ring-green-600 dark:bg-green-950/60 dark:text-green-300"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    <span className="text-xs font-semibold">{t.label}</span>
                  </button>
                ))}
              </div>
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

              <div>
                <Label htmlFor="cust-add-email" className="text-sm font-medium">
                  ইমেইল ঠিকানা
                </Label>
                <div className="relative mt-1">
                  <RiMailLine className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="cust-add-email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="customer@example.com"
                    className="pl-8.5"
                    aria-invalid={!!formErrors.email}
                  />
                </div>
                {formErrors.email && (
                  <p className="mt-1 text-xs text-rose-500">{formErrors.email}</p>
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

            {/* VIP Checkbox */}
            <div className="flex items-center gap-3 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <input
                id="cust-add-vip"
                type="checkbox"
                checked={Boolean(formData.is_vip)}
                onChange={(e) => setFormData({ ...formData, is_vip: e.target.checked })}
                className="size-4 cursor-pointer rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <label
                htmlFor="cust-add-vip"
                className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <RiVipCrownLine className="size-4 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  ভিআইপি গ্রাহক হিসেবে চিহ্নিত করুন
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  (বিশেষ সুবিধা ও অগ্রাধিকার)
                </span>
              </label>
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

            {/* Customer Type */}
            <div>
              <Label className="text-sm font-medium">গ্রাহকের ধরন (Customer Type)</Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {CUSTOMER_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setFormData({ ...formData, type: t.value })}
                    className={`flex flex-col items-center rounded-lg border p-2.5 text-center transition ${
                      formData.type === t.value
                        ? "border-green-600 bg-green-50/70 text-green-800 shadow-xs ring-1 ring-green-600 dark:bg-green-950/60 dark:text-green-300"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    <span className="text-xs font-semibold">{t.label}</span>
                  </button>
                ))}
              </div>
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

              <div>
                <Label htmlFor="cust-edit-email" className="text-sm font-medium">
                  ইমেইল ঠিকানা
                </Label>
                <div className="relative mt-1">
                  <RiMailLine className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="cust-edit-email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-8.5"
                    aria-invalid={!!formErrors.email}
                  />
                </div>
                {formErrors.email && (
                  <p className="mt-1 text-xs text-rose-500">{formErrors.email}</p>
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

            {/* VIP Checkbox */}
            <div className="flex items-center gap-3 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <input
                id="cust-edit-vip"
                type="checkbox"
                checked={Boolean(formData.is_vip)}
                onChange={(e) => setFormData({ ...formData, is_vip: e.target.checked })}
                className="size-4 cursor-pointer rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <label
                htmlFor="cust-edit-vip"
                className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <RiVipCrownLine className="size-4 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  ভিআইপি গ্রাহক হিসেবে চিহ্নিত করুন
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  (বিশেষ সুবিধা ও অগ্রাধিকার)
                </span>
              </label>
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
                      {activeCustomer.is_vip && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950 shadow-xs">
                          <RiVipCrownLine className="size-3" />
                          VIP
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-green-100">
                      ID: {activeCustomer.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="space-y-4 p-6">
                {/* Type */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    গ্রাহকের ক্যাটাগরি:
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getCustomerTypeBadgeClass(
                      activeCustomer.type
                    )}`}
                  >
                    {getCustomerTypeLabel(activeCustomer.type)}
                  </span>
                </div>

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

                {/* Email */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <RiMailLine className="size-3.5" />
                    ইমেইল:
                  </span>
                  {activeCustomer.email ? (
                    <a
                      href={`mailto:${activeCustomer.email}`}
                      className="max-w-[200px] truncate text-xs font-semibold text-green-600 hover:underline dark:text-green-400"
                    >
                      {activeCustomer.email}
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
                    মোট {customersList.length} জন
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
                    বর্তমান ফিল্টারে {filteredCustomers.length} জন
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
