"use client";

import { useMemo, useState, useTransition } from "react";

import Link from "next/link";

import {
  RiBuilding2Line,
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
  RiHandCoinLine,
  RiLoader4Line,
  RiMapPinLine,
  RiPhoneLine,
  RiPrinterLine,
  RiRefreshLine,
  RiSearchLine,
  RiShoppingBag3Line,
  RiUserAddLine,
  RiWallet3Line,
} from "@remixicon/react";

import { createPartyAction, deletePartyAction, updatePartyAction } from "@/actions/parties";
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
import type { Party, PartyInput } from "@/lib/parties";
import { exportPartyListPDF, formatMoney } from "@/lib/pdf-export";
import { exportPartiesToCSV, exportPartiesToExcel } from "@/lib/sheet-export";

interface PartyManagementProps {
  initialParties: Party[];
}

export default function PartyManagement({ initialParties }: PartyManagementProps) {
  const [partiesList, setPartiesList] = useState<Party[]>(initialParties);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"all" | "filtered">("all");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Active party for view / edit / delete
  const [activeParty, setActiveParty] = useState<Party | null>(null);

  // Form states
  const [formData, setFormData] = useState<PartyInput>({
    name: "",
    phone: "",
    address: "",
    notes: "",
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

  // Filter parties by search
  const filteredParties = useMemo(() => {
    return partiesList.filter((party) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        party.name.toLowerCase().includes(term) ||
        (party.phone && party.phone.toLowerCase().includes(term)) ||
        (party.address && party.address.toLowerCase().includes(term)) ||
        (party.notes && party.notes.toLowerCase().includes(term));

      return matchesSearch;
    });
  }, [partiesList, searchTerm]);

  // Pagination (20 items per page by default)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const totalPages = Math.max(1, Math.ceil(filteredParties.length / itemsPerPage));
  const paginatedParties = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredParties.slice(start, start + itemsPerPage);
  }, [filteredParties, currentPage, itemsPerPage]);

  // Summary KPI calculation
  const stats = useMemo(() => {
    let totalKroy = 0;
    let totalJoma = 0;
    let totalPawna = 0;

    for (const p of partiesList) {
      totalKroy += p.totalKroy ?? 0;
      totalJoma += p.totalJoma ?? 0;
      totalPawna += p.totalPawna ?? 0;
    }

    return {
      totalParties: partiesList.length,
      totalKroy: parseFloat(totalKroy.toFixed(2)),
      totalJoma: parseFloat(totalJoma.toFixed(2)),
      totalPawna: parseFloat(totalPawna.toFixed(2)),
    };
  }, [partiesList]);

  // Refresh parties from API
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/parties", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPartiesList(data.data);
        showFeedback("success", "পার্টি তালিকা সফলভাবে রিফ্রেশ করা হয়েছে");
      }
    } catch {
      showFeedback("error", "রিফ্রেশ করতে ব্যর্থ হয়েছে");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export parties sheet & PDF
  const handleExport = async (
    format: "pdf" | "xlsx" | "csv",
    mode: "download" | "print" = "download"
  ) => {
    const listToExport = exportScope === "filtered" ? filteredParties : partiesList;
    if (listToExport.length === 0) {
      showFeedback("error", "ডাউনলোড করার মতো কোনো পার্টি পাওয়া যায়নি");
      return;
    }

    if (format === "xlsx") {
      exportPartiesToExcel(listToExport);
      showFeedback("success", "এক্সেল ফাইল ডাউনলোড শুরু হয়েছে");
      setIsExportOpen(false);
    } else if (format === "csv") {
      exportPartiesToCSV(listToExport);
      showFeedback("success", "CSV ফাইল ডাউনলোড শুরু হয়েছে");
      setIsExportOpen(false);
    } else if (format === "pdf") {
      setIsGeneratingPdf(true);
      try {
        await exportPartyListPDF({ parties: listToExport, mode });
        if (mode === "download") {
          showFeedback("success", "পিডিএফ সফলভাবে তৈরি ও ডাউনলোড হয়েছে");
        }
        setIsExportOpen(false);
      } catch (err) {
        console.error("PDF generation failed:", err);
        showFeedback("error", "পিডিএফ তৈরি করতে সমস্যা হয়েছে");
      } finally {
        setIsGeneratingPdf(false);
      }
    }
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = "পার্টির নাম অবশ্যই দিতে হবে";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open Add Dialog
  const openAddDialog = () => {
    setFormData({
      name: "",
      phone: "",
      address: "",
      notes: "",
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (party: Party) => {
    setActiveParty(party);
    setFormData({
      name: party.name || "",
      phone: party.phone || "",
      address: party.address || "",
      notes: party.notes || "",
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  // Open Delete Confirmation
  const openDeleteDialog = (party: Party) => {
    setActiveParty(party);
    setIsDeleteOpen(true);
  };

  // Open Preview Modal
  const openPreviewDialog = (party: Party) => {
    setActiveParty(party);
    setIsPreviewOpen(true);
  };

  // Submit Add Party
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    startTransition(async () => {
      const result = await createPartyAction({
        name: formData.name.trim(),
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        notes: formData.notes?.trim() || null,
      });

      if (result.success && result.data) {
        setPartiesList((prev) => [result.data!, ...prev]);
        setIsAddOpen(false);
        showFeedback("success", `"${result.data.name}" সফলভাবে যুক্ত করা হয়েছে`);
      } else {
        showFeedback("error", result.error || "পার্টি যোগ করতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Edit Party
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParty || !validateForm()) return;

    startTransition(async () => {
      const result = await updatePartyAction(activeParty.id, {
        name: formData.name.trim(),
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        notes: formData.notes?.trim() || null,
      });

      if (result.success && result.data) {
        setPartiesList((prev) =>
          prev.map((p) => (p.id === activeParty.id ? { ...p, ...result.data } : p))
        );
        setIsEditOpen(false);
        showFeedback("success", `"${result.data.name}" সফলভাবে আপডেট করা হয়েছে`);
      } else {
        showFeedback("error", result.error || "পার্টির তথ্য আপডেট করতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Delete Party
  const handleDeleteSubmit = () => {
    if (!activeParty) return;

    startTransition(async () => {
      const result = await deletePartyAction(activeParty.id);
      if (result.success) {
        setPartiesList((prev) => prev.filter((p) => p.id !== activeParty.id));
        setIsDeleteOpen(false);
        showFeedback("success", `"${activeParty.name}" পার্টি এবং তার সকল লেনদেন মুছে ফেলা হয়েছে`);
      } else {
        showFeedback("error", result.error || "পার্টি মুছতে ব্যর্থ হয়েছে");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`animate-in fade-in slide-in-from-top-4 fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-xl transition-all duration-300 ${
            notification.type === "success"
              ? "border border-green-500/20 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200"
              : "border border-red-500/20 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <RiCheckLine className="size-5 shrink-0 text-green-600 dark:text-green-400" />
          ) : (
            <RiErrorWarningLine className="size-5 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="ml-2 rounded-md p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>
      )}

      {/* KPI Metric Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {/* Total Parties */}
        <Card className="border-border/60 transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              <RiBuilding2Line className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">মোট পার্টি</p>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                {stats.totalParties}
              </h3>
              <p className="text-[11px] font-medium text-purple-700 dark:text-purple-400">
                পাইকারি ও সরবরাহকারী
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Purchases */}
        <Card className="border-border/60 transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              <RiShoppingBag3Line className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">মোট ক্রয় দর</p>
              <h3 className="text-lg font-bold tracking-tight text-blue-700 sm:text-xl dark:text-blue-400">
                ৳ {formatMoney(stats.totalKroy)}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                সকল চালান ভ্যালু
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Paid */}
        <Card className="border-border/60 transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <RiWallet3Line className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট পরিশোধ / জমা
              </p>
              <h3 className="text-lg font-bold tracking-tight text-emerald-700 sm:text-xl dark:text-emerald-400">
                ৳ {formatMoney(stats.totalJoma)}
              </h3>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                নগদ ও ব্যাংক পরিশোধ
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Outstanding Pawna */}
        <Card className="border-border/60 transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
              <RiHandCoinLine className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                বর্তমান পাওনা / ব্যালেন্স
              </p>
              <h3 className="text-lg font-bold tracking-tight text-rose-700 sm:text-xl dark:text-rose-400">
                ৳ {formatMoney(stats.totalPawna)}
              </h3>
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                পার্টির অবশিষ্ট পাওনা
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Container Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="flex flex-col gap-4 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                পার্টি খাতা ও লেনদেন পরিচালনা
              </CardTitle>
              <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                মোট: {filteredParties.length}
              </Badge>
            </div>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              পাইকারি পার্টি, মহাজন ও সরবরাহকারীদের তালিকা, ক্রয়-জমা খতিয়ান এবং স্টেটমেন্ট
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <RiRefreshLine className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>রিফ্রেশ</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportOpen(true)}
              className="h-9 gap-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/50"
            >
              <RiDownloadLine className="size-3.5" />
              <span>এক্সপোর্ট / প্রিন্ট</span>
            </Button>

            <Button
              size="sm"
              onClick={openAddDialog}
              className="h-9 gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-semibold text-white shadow-xs hover:from-purple-700 hover:to-indigo-700"
            >
              <RiUserAddLine className="size-3.5" />
              <span>নতুন পার্টি যোগ করুন</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          {/* Search Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <RiSearchLine className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="পার্টির নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন..."
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
                  onClick={() => setSearchTerm("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  <RiCloseLine className="size-4" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              দেখানো হচ্ছে: <strong>{paginatedParties.length}</strong> /{" "}
              <strong>{filteredParties.length}</strong> টি পার্টি
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 lg:block dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                <tr className="whitespace-nowrap">
                  <th className="w-12 px-4 py-3 text-center whitespace-nowrap">ক্র.</th>
                  <th className="px-4 py-3 whitespace-nowrap">পার্টির নাম</th>
                  <th className="px-4 py-3 whitespace-nowrap">মোবাইল নম্বর</th>
                  <th className="px-4 py-3 whitespace-nowrap">ঠিকানা / লোকেশন</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">মোট ক্রয় (৳)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">মোট জমা (৳)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">বর্তমান পাওনা (৳)</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">লেনদেন</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedParties.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RiBuilding2Line className="size-8 text-slate-400" />
                        <p className="font-medium">কোনো পার্টির তথ্য পাওয়া যায়নি</p>
                        <p className="text-xs text-slate-400">
                          {searchTerm
                            ? "অনুসন্ধানের সাথে মিল রেখে কোনো ফলাফল নেই।"
                            : "নতুন পার্টি যুক্ত করতে উপরের বাটনে ক্লিক করুন।"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedParties.map((party, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const initial = party.name.charAt(0).toUpperCase();

                    return (
                      <tr
                        key={party.id}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                      >
                        <td className="px-4 py-3.5 text-center text-xs text-slate-400">
                          {rowNumber}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar size="sm">
                              <AvatarFallback className="bg-purple-100 font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                {initial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <Link
                                href={`/dashboard/parties/${party.id}`}
                                className="font-semibold text-slate-900 hover:text-purple-600 hover:underline dark:text-white dark:hover:text-purple-400"
                              >
                                {party.name}
                              </Link>
                              {party.notes && (
                                <p className="max-w-[200px] truncate text-xs text-slate-500 dark:text-slate-400">
                                  {party.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {party.phone ? (
                            <div className="flex items-center gap-1.5">
                              <RiPhoneLine className="size-3.5 text-slate-400" />
                              <span>{party.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="max-w-[180px] truncate px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                          {party.address ? (
                            <div className="flex items-center gap-1.5 truncate">
                              <RiMapPinLine className="size-3.5 shrink-0 text-slate-400" />
                              <span className="truncate">{party.address}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right font-semibold text-blue-700 dark:text-blue-400">
                          ৳ {formatMoney(party.totalKroy ?? 0)}
                        </td>

                        <td className="px-4 py-3.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                          ৳ {formatMoney(party.totalJoma ?? 0)}
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold">
                          <span
                            className={
                              (party.totalPawna ?? 0) > 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-900 dark:text-white"
                            }
                          >
                            ৳ {formatMoney(party.totalPawna ?? 0)}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <Badge variant="outline" className="px-2 py-0.5 text-xs">
                            {party.transactionCount ?? 0} টি
                          </Badge>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/dashboard/parties/${party.id}`}
                              className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-900"
                              title="খতিয়ান ও লেনদেন দেখুন"
                            >
                              <RiFileTextLine className="size-3.5" />
                              <span>খতিয়ান</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => openPreviewDialog(party)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                              title="প্রিভিউ"
                            >
                              <RiEyeLine className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditDialog(party)}
                              className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                              title="সম্পাদনা করুন"
                            >
                              <RiEditLine className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteDialog(party)}
                              className="rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                              title="মুছে ফেলুন"
                            >
                              <RiDeleteBinLine className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {paginatedParties.length === 0 ? (
              <div className="col-span-full py-10 text-center text-slate-500 dark:text-slate-400">
                <RiBuilding2Line className="mx-auto size-8 text-slate-400" />
                <p className="mt-2 font-medium">কোনো পার্টির তথ্য পাওয়া যায়নি</p>
              </div>
            ) : (
              paginatedParties.map((party) => (
                <div
                  key={party.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm">
                        <AvatarFallback className="bg-purple-100 font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          {party.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/parties/${party.id}`}
                          className="font-bold text-slate-900 hover:text-purple-600 hover:underline dark:text-white"
                        >
                          {party.name}
                        </Link>
                        {party.phone && (
                          <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <RiPhoneLine className="size-3" />
                            <span>{party.phone}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <Badge variant="outline" className="text-[10px]">
                      {party.transactionCount ?? 0} লেনদেন
                    </Badge>
                  </div>

                  {party.address && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <RiMapPinLine className="size-3.5 shrink-0" />
                      <span className="truncate">{party.address}</span>
                    </p>
                  )}

                  {/* Financial Stats Grid */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800/60">
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">মোট ক্রয়</p>
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                        ৳ {formatMoney(party.totalKroy ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">মোট জমা</p>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        ৳ {formatMoney(party.totalJoma ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">পাওনা</p>
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        ৳ {formatMoney(party.totalPawna ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
                    <Link
                      href={`/dashboard/parties/${party.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:underline dark:text-purple-400"
                    >
                      <RiFileTextLine className="size-3.5" />
                      <span>বিস্তারিত খতিয়ান</span>
                    </Link>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditDialog(party)}
                        className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                      >
                        <RiEditLine className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteDialog(party)}
                        className="rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                      >
                        <RiDeleteBinLine className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="pt-2">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredParties.length}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* ADD PARTY MODAL                                                           */}
      {/* ========================================================================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                <RiUserAddLine className="size-5" />
              </div>
              <DialogTitle className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                নতুন পার্টি যুক্ত করুন
              </DialogTitle>
              <DialogDescription className="text-xs">
                পাইকারি পার্টি, মহাজন বা সরবরাহকারীর তথ্য দিয়ে খাতা খুলুন
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div>
                <Label htmlFor="add-name" className="text-xs font-semibold">
                  পার্টির নাম <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add-name"
                  placeholder="উদা: মেসার্স সততা ট্রেডার্স"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                  autoFocus
                />
                {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
              </div>

              <div>
                <Label htmlFor="add-phone" className="text-xs font-semibold">
                  মোবাইল নম্বর
                </Label>
                <Input
                  id="add-phone"
                  placeholder="01XXXXXXXXX"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label htmlFor="add-address" className="text-xs font-semibold">
                  ঠিকানা / এলাকা / বাজার
                </Label>
                <Input
                  id="add-address"
                  placeholder="উদা: বীরগঞ্জ বাজার, দিনাজপুর"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="add-notes" className="text-xs font-semibold">
                  বিশেষ নোট / মন্তব্য
                </Label>
                <Textarea
                  id="add-notes"
                  placeholder="পার্টি সম্পর্কিত অতিরিক্ত কোনো তথ্য..."
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
                বাতিল
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
              >
                {isPending ? (
                  <>
                    <RiLoader4Line className="mr-1 size-3.5 animate-spin" />
                    সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  "সংরক্ষণ করুন"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* EDIT PARTY MODAL                                                          */}
      {/* ========================================================================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <RiEditLine className="size-5" />
              </div>
              <DialogTitle className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                পার্টির তথ্য সম্পাদন করুন
              </DialogTitle>
              <DialogDescription className="text-xs">
                নাম, মোবাইল নম্বর বা ঠিকানা পরিবর্তন করুন
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div>
                <Label htmlFor="edit-name" className="text-xs font-semibold">
                  পার্টির নাম <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
                {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
              </div>

              <div>
                <Label htmlFor="edit-phone" className="text-xs font-semibold">
                  মোবাইল নম্বর
                </Label>
                <Input
                  id="edit-phone"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label htmlFor="edit-address" className="text-xs font-semibold">
                  ঠিকানা / এলাকা / বাজার
                </Label>
                <Input
                  id="edit-address"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-notes" className="text-xs font-semibold">
                  বিশেষ নোট / মন্তব্য
                </Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
                বাতিল
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isPending ? (
                  <>
                    <RiLoader4Line className="mr-1 size-3.5 animate-spin" />
                    আপডেট হচ্ছে...
                  </>
                ) : (
                  "আপডেট সংরক্ষণ করুন"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
              <RiDeleteBinLine className="size-5" />
            </div>
            <DialogTitle className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
              পার্টি মুছে ফেলবেন?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-300">
              আপনি কি নিশ্চিত যে আপনি{" "}
              <strong className="text-slate-900 dark:text-white">
                &ldquo;{activeParty?.name}&rdquo;
              </strong>{" "}
              পার্টি এবং তার সমস্ত লেনদেন চিরতরে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
              না, বাতিল
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <RiLoader4Line className="mr-1 size-3.5 animate-spin" />
                  মুছে ফেলা হচ্ছে...
                </>
              ) : (
                "হ্যাঁ, মুছে দিন"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* PREVIEW PARTY MODAL                                                       */}
      {/* ========================================================================= */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          {activeParty && (
            <div>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarFallback className="bg-purple-100 text-base font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      {activeParty.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 text-left">
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      {activeParty.name}
                    </DialogTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      নিবন্ধন:{" "}
                      {activeParty.created_at
                        ? new Date(activeParty.created_at).toISOString().split("T")[0]
                        : "-"}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="my-4 space-y-3 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800/60">
                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">মোবাইল নম্বর:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {activeParty.phone || "প্রযোজ্য নয়"}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">ঠিকানা:</span>
                  <span className="text-right font-medium text-slate-900 dark:text-white">
                    {activeParty.address || "প্রযোজ্য নয়"}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">মোট ক্রয় দর:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-400">
                    ৳ {formatMoney(activeParty.totalKroy ?? 0)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">মোট জমা / পরিশোধ:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    ৳ {formatMoney(activeParty.totalJoma ?? 0)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">বর্তমান অবশিষ্ট পাওনা:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    ৳ {formatMoney(activeParty.totalPawna ?? 0)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">মোট লেনদেন:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeParty.transactionCount ?? 0} টি
                  </span>
                </div>

                {activeParty.notes && (
                  <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
                    <span className="mb-1 block text-slate-500 dark:text-slate-400">
                      নোট / মন্তব্য:
                    </span>
                    <p className="text-slate-700 italic dark:text-slate-300">{activeParty.notes}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
                  বন্ধ করুন
                </DialogClose>
                <Link
                  href={`/dashboard/parties/${activeParty.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:from-purple-700 hover:to-indigo-700"
                >
                  <RiFileTextLine className="size-3.5" />
                  <span>সম্পূর্ণ খতিয়ান খুলুন</span>
                </Link>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* EXPORT & PRINT DIALOG                                                     */}
      {/* ========================================================================= */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              <RiDownloadLine className="size-5" />
            </div>
            <DialogTitle className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
              পার্টি তালিকা এক্সপোর্ট ও প্রিন্ট
            </DialogTitle>
            <DialogDescription className="text-xs">
              পিডিএফ, এক্সেল বা সিএসভি ফরম্যাটে ডাউনলোড করুন অথবা সরাসরি প্রিন্ট করুন
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs font-semibold">এক্সপোর্টের আওতা (Scope)</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope("all")}
                  className={`rounded-lg border p-2.5 text-left text-xs font-medium transition ${
                    exportScope === "all"
                      ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20 dark:bg-purple-950/60 dark:text-purple-200"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                  }`}
                >
                  <p className="font-semibold">সকল পার্টি</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    মোট {partiesList.length} টি
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope("filtered")}
                  className={`rounded-lg border p-2.5 text-left text-xs font-medium transition ${
                    exportScope === "filtered"
                      ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20 dark:bg-purple-950/60 dark:text-purple-200"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                  }`}
                >
                  <p className="font-semibold">ফিল্টার করা পার্টি</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    বর্তমান {filteredParties.length} টি
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold">ফরম্যাট নির্বাচন করুন</Label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("pdf", "download")}
                  disabled={isGeneratingPdf}
                  className="h-10 justify-start gap-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                >
                  <RiFilePdf2Line className="size-4 shrink-0" />
                  <span>{isGeneratingPdf ? "তৈরি হচ্ছে..." : "PDF ডাউনলোড"}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("pdf", "print")}
                  disabled={isGeneratingPdf}
                  className="h-10 justify-start gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <RiPrinterLine className="size-4 shrink-0" />
                  <span>সরাসরি প্রিন্ট (Print)</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("xlsx")}
                  className="h-10 justify-start gap-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                >
                  <RiFileExcel2Line className="size-4 shrink-0" />
                  <span>Excel (.xlsx) শীট</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("csv")}
                  className="h-10 justify-start gap-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                >
                  <RiFileTextLine className="size-4 shrink-0" />
                  <span>CSV ফাইল ডাউনলোড</span>
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
              বন্ধ করুন
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
