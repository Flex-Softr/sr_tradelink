"use client";

import { useMemo, useState, useTransition } from "react";

import Link from "next/link";

import {
  RiArrowLeftSLine,
  RiCalendarLine,
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
  RiHandCoinLine,
  RiLoader4Line,
  RiMapPinLine,
  RiPhoneLine,
  RiPrinterLine,
  RiRefreshLine,
  RiSearchLine,
  RiShoppingBag3Line,
  RiWallet3Line,
} from "@remixicon/react";

import {
  createPartyTransactionAction,
  deletePartyTransactionAction,
  updatePartyAction,
  updatePartyTransactionAction,
} from "@/actions/parties";
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
  type Party,
  type PartyInput,
  type PartyTransaction,
  type PartyTransactionInput,
  type PartyTransactionSummary,
  calculatePartyStatementLedger,
} from "@/lib/parties";
import { exportPartyStatementPDF, formatMoney } from "@/lib/pdf-export";
import { exportPartyTransactionsToCSV, exportPartyTransactionsToExcel } from "@/lib/sheet-export";

interface PartyDetailsViewProps {
  party: Party;
  initialTransactions: PartyTransaction[];
  initialSummary: PartyTransactionSummary;
}

export default function PartyDetailsView({
  party: initialParty,
  initialTransactions,
  initialSummary,
}: PartyDetailsViewProps) {
  const [party, setParty] = useState<Party>(initialParty);
  const [transactionsList, setTransactionsList] = useState<PartyTransaction[]>(initialTransactions);
  const [summary, setSummary] = useState<PartyTransactionSummary>(initialSummary);
  const [searchTerm, setSearchTerm] = useState("");
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
  const [isEditPartyOpen, setIsEditPartyOpen] = useState(false);

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

  // Active transaction for view / edit / delete
  const [activeTransaction, setActiveTransaction] = useState<PartyTransaction | null>(null);

  // Form states for transaction add/edit
  const [txFormData, setTxFormData] = useState<PartyTransactionInput>({
    party_id: party.id,
    date: new Date().toISOString().split("T")[0],
    kroy: 0,
    joma: 0,
    description: "",
  });

  // Form states for party edit
  const [partyFormData, setPartyFormData] = useState<PartyInput>({
    name: party.name,
    phone: party.phone || "",
    address: party.address || "",
    notes: party.notes || "",
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

  // Calculate full statement ledger with running balances
  const statementLedger = useMemo(() => {
    return calculatePartyStatementLedger(
      transactionsList,
      startDate || undefined,
      endDate || undefined
    );
  }, [transactionsList, startDate, endDate]);

  // Filtered transactions for display
  const filteredEntries = useMemo(() => {
    return statementLedger.entries.filter((entry) => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;

      const dateStr = new Date(entry.date).toISOString().split("T")[0];
      const desc = (entry.description || "").toLowerCase();
      const kroyStr = String(entry.kroy);
      const jomaStr = String(entry.joma);
      const balanceStr = String(entry.runningBalance);

      return (
        dateStr.includes(term) ||
        desc.includes(term) ||
        kroyStr.includes(term) ||
        jomaStr.includes(term) ||
        balanceStr.includes(term)
      );
    });
  }, [statementLedger, searchTerm]);

  // Paginated list
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / itemsPerPage));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(start, start + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  // Refresh party details & transactions from API
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [partyRes, txRes] = await Promise.all([
        fetch(`/api/parties/${party.id}`, { cache: "no-store" }),
        fetch(`/api/parties/${party.id}/transactions?limit=1000`, { cache: "no-store" }),
      ]);

      const partyData = await partyRes.json();
      const txData = await txRes.json();

      if (partyData.success && partyData.data) {
        setParty(partyData.data);
      }
      if (txData.success && Array.isArray(txData.data)) {
        setTransactionsList(txData.data);
      }
      if (txData.summary) {
        setSummary(txData.summary);
      }

      showFeedback("success", "লেনদেন ও খতিয়ান সফলভাবে রিফ্রেশ করা হয়েছে");
    } catch {
      showFeedback("error", "রিফ্রেশ করতে ব্যর্থ হয়েছে");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export handling
  const handleExecuteExport = async (mode: "download" | "print" = "download") => {
    let exportLedger = statementLedger;

    if (exportScope === "all") {
      exportLedger = calculatePartyStatementLedger(transactionsList);
    } else if (exportScope === "custom") {
      exportLedger = calculatePartyStatementLedger(
        transactionsList,
        exportStartDate || undefined,
        exportEndDate || undefined
      );
    }

    if (exportFormat === "xlsx") {
      exportPartyTransactionsToExcel({
        party,
        transactions: exportLedger.entries,
        summary: {
          partyId: party.id,
          totalKroy: exportLedger.totalPeriodKroy,
          totalJoma: exportLedger.totalPeriodJoma,
          totalPawna: exportLedger.closingBalance,
          totalTransactions: exportLedger.transactionCount,
          lastTransactionDate: exportLedger.entries[0]?.date || null,
        },
      });
      showFeedback("success", "এক্সেল ফাইল ডাউনলোড শুরু হয়েছে");
      setIsExportOpen(false);
    } else if (exportFormat === "csv") {
      exportPartyTransactionsToCSV({
        party,
        transactions: exportLedger.entries,
        summary: {
          partyId: party.id,
          totalKroy: exportLedger.totalPeriodKroy,
          totalJoma: exportLedger.totalPeriodJoma,
          totalPawna: exportLedger.closingBalance,
          totalTransactions: exportLedger.transactionCount,
          lastTransactionDate: exportLedger.entries[0]?.date || null,
        },
      });
      showFeedback("success", "CSV ফাইল ডাউনলোড শুরু হয়েছে");
      setIsExportOpen(false);
    } else if (exportFormat === "pdf") {
      setIsGeneratingPdf(true);
      try {
        await exportPartyStatementPDF({
          party,
          ledger: exportLedger,
          mode,
        });
        if (mode === "download") {
          showFeedback("success", "পার্টি স্টেটমেন্ট পিডিএফ তৈরি ও ডাউনলোড হয়েছে");
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

  // Open Add Dialog
  const openAddDialog = () => {
    setTxFormData({
      party_id: party.id,
      date: new Date().toISOString().split("T")[0],
      kroy: 0,
      joma: 0,
      description: "",
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (tx: PartyTransaction) => {
    setActiveTransaction(tx);
    const dateStr = new Date(tx.date).toISOString().split("T")[0];
    setTxFormData({
      party_id: party.id,
      date: dateStr,
      kroy: tx.kroy,
      joma: tx.joma,
      description: tx.description || "",
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  // Open Delete Dialog
  const openDeleteDialog = (tx: PartyTransaction) => {
    setActiveTransaction(tx);
    setIsDeleteOpen(true);
  };

  // Open Preview Dialog
  const openPreviewDialog = (tx: PartyTransaction) => {
    setActiveTransaction(tx);
    setIsPreviewOpen(true);
  };

  // Open Edit Party Dialog
  const openEditPartyDialog = () => {
    setPartyFormData({
      name: party.name,
      phone: party.phone || "",
      address: party.address || "",
      notes: party.notes || "",
    });
    setFormErrors({});
    setIsEditPartyOpen(true);
  };

  // Submit Add Transaction
  const handleAddTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const kroyVal = Number(txFormData.kroy) || 0;
    const jomaVal = Number(txFormData.joma) || 0;

    if (kroyVal === 0 && jomaVal === 0) {
      setFormErrors({ amount: "মোট ক্রয় দর অথবা জমা/পরিশোধ এর মধ্যে অন্তত একটির পরিমাণ দিন" });
      return;
    }

    startTransition(async () => {
      const result = await createPartyTransactionAction({
        party_id: party.id,
        date: txFormData.date,
        kroy: kroyVal,
        joma: jomaVal,
        description: txFormData.description?.trim() || null,
      });

      if (result.success && result.data) {
        setTransactionsList((prev) => [result.data!, ...prev]);
        setIsAddOpen(false);
        showFeedback("success", "লেনদেন সফলভাবে যোগ করা হয়েছে");
      } else {
        showFeedback("error", result.error || "লেনদেন যোগ করতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Edit Transaction
  const handleEditTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTransaction) return;

    const kroyVal = Number(txFormData.kroy) || 0;
    const jomaVal = Number(txFormData.joma) || 0;

    if (kroyVal === 0 && jomaVal === 0) {
      setFormErrors({ amount: "মোট ক্রয় দর অথবা জমা/পরিশোধ এর মধ্যে অন্তত একটির পরিমাণ দিন" });
      return;
    }

    startTransition(async () => {
      const result = await updatePartyTransactionAction(activeTransaction.id, party.id, {
        date: txFormData.date,
        kroy: kroyVal,
        joma: jomaVal,
        description: txFormData.description?.trim() || null,
      });

      if (result.success && result.data) {
        setTransactionsList((prev) =>
          prev.map((t) => (t.id === activeTransaction.id ? result.data! : t))
        );
        setIsEditOpen(false);
        showFeedback("success", "লেনদেন সফলভাবে আপডেট করা হয়েছে");
      } else {
        showFeedback("error", result.error || "লেনদেন আপডেট করতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Delete Transaction
  const handleDeleteTxSubmit = () => {
    if (!activeTransaction) return;

    startTransition(async () => {
      const result = await deletePartyTransactionAction(activeTransaction.id, party.id);
      if (result.success) {
        setTransactionsList((prev) => prev.filter((t) => t.id !== activeTransaction.id));
        setIsDeleteOpen(false);
        showFeedback("success", "লেনদেন সফলভাবে মুছে ফেলা হয়েছে");
      } else {
        showFeedback("error", result.error || "লেনদেন মুছতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Edit Party Profile
  const handleEditPartySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyFormData.name.trim()) {
      setFormErrors({ name: "পার্টির নাম আবশ্যক" });
      return;
    }

    startTransition(async () => {
      const result = await updatePartyAction(party.id, {
        name: partyFormData.name.trim(),
        phone: partyFormData.phone?.trim() || null,
        address: partyFormData.address?.trim() || null,
        notes: partyFormData.notes?.trim() || null,
      });

      if (result.success && result.data) {
        setParty((prev) => ({ ...prev, ...result.data }));
        setIsEditPartyOpen(false);
        showFeedback("success", "পার্টির তথ্য সফলভাবে আপডেট হয়েছে");
      } else {
        showFeedback("error", result.error || "পার্টির তথ্য আপডেট করতে ব্যর্থ হয়েছে");
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

      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
          >
            <RiArrowLeftSLine className="size-4" />
            ড্যাশবোর্ড
          </Link>
          <span>/</span>
          <Link href="/dashboard/parties" className="hover:text-slate-900 dark:hover:text-white">
            পার্টি তালিকা
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-900 dark:text-white">{party.name}</span>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openEditPartyDialog}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <RiEditLine className="size-3.5" />
            <span>প্রোফাইল সম্পাদন</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <RiRefreshLine className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>রিফ্রেশ</span>
          </Button>
        </div>
      </div>

      {/* Party Profile Header Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 p-6 text-white shadow-lg sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <Avatar size="lg" className="border-2 border-white/20 shadow-md">
              <AvatarFallback className="bg-white text-xl font-bold text-purple-900">
                {party.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{party.name}</h1>
                <Badge className="bg-white/20 text-white backdrop-blur-xs hover:bg-white/30">
                  পার্টি খাতা
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-purple-100 opacity-90 sm:text-sm">
                {party.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <RiPhoneLine className="size-3.5" />
                    {party.phone}
                  </span>
                )}
                {party.address && (
                  <span className="flex items-center gap-1">
                    <RiMapPinLine className="size-3.5" />
                    {party.address}
                  </span>
                )}
                <span>
                  নিবন্ধন:{" "}
                  {party.created_at ? new Date(party.created_at).toISOString().split("T")[0] : "-"}
                </span>
              </div>

              {party.notes && (
                <p className="mt-2 max-w-xl text-xs text-purple-200/90 italic">
                  নোট: {party.notes}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              onClick={() => setIsExportOpen(true)}
              className="border border-white/20 bg-white/10 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/20"
            >
              <RiDownloadLine className="mr-1.5 size-4" />
              <span>স্টেটমেন্ট এক্সপোর্ট</span>
            </Button>

            <Button
              onClick={openAddDialog}
              className="bg-white text-xs font-bold text-purple-900 shadow-md hover:bg-purple-50"
            >
              <RiWallet3Line className="mr-1.5 size-4" />
              <span>নতুন লেনদেন যোগ</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {/* Total Kroy */}
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              <RiShoppingBag3Line className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট ক্রয় দর (Total Buy)
              </p>
              <h3 className="text-lg font-bold tracking-tight text-blue-700 sm:text-xl dark:text-blue-400">
                ৳ {formatMoney(statementLedger.totalPeriodKroy)}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                নির্বাচিত সময়কালে
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Joma */}
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <RiWallet3Line className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট জমা / পরিশোধ (Paid)
              </p>
              <h3 className="text-lg font-bold tracking-tight text-emerald-700 sm:text-xl dark:text-emerald-400">
                ৳ {formatMoney(statementLedger.totalPeriodJoma)}
              </h3>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                পরিশোধিত অর্থ
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Balance / Pawna */}
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
              <RiHandCoinLine className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                বর্তমান পাওনা (Balance)
              </p>
              <h3 className="text-lg font-bold tracking-tight text-rose-700 sm:text-xl dark:text-rose-400">
                ৳ {formatMoney(statementLedger.closingBalance)}
              </h3>
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                অবশিষ্ট জের
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              <RiFileTextLine className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                মোট লেনদেন সংখ্যা
              </p>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                {statementLedger.transactionCount} টি
              </h3>
              <p className="text-[11px] font-medium text-purple-700 dark:text-purple-400">
                খতিয়ান এন্ট্রি
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger & Transactions Table Container */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="p-4 pb-3 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                লেনদেন খতিয়ান ও হিসাব বিবরণী
              </CardTitle>
              <CardDescription className="text-xs">
                তারিখ অনুযায়ী ক্রয় ও জমা চালানের কালানুক্রমিক স্টেটমেন্ট
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExportOpen(true)}
                className="h-8 gap-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
              >
                <RiFilePdf2Line className="size-3.5" />
                <span>PDF বিবরণী</span>
              </Button>

              <Button
                size="sm"
                onClick={openAddDialog}
                className="h-8 gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-semibold text-white shadow-xs hover:from-purple-700 hover:to-indigo-700"
              >
                <RiWallet3Line className="size-3.5" />
                <span>নতুন এন্ট্রি</span>
              </Button>
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="mr-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              ফিল্টার:
            </span>
            {[
              { key: "all", label: "সকল সময়" },
              { key: "today", label: "আজ" },
              { key: "this_week", label: "এই সপ্তাহ" },
              { key: "this_month", label: "এই মাস" },
              { key: "last_30_days", label: "বিগত ৩০ দিন" },
              { key: "this_year", label: "এই বছর" },
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyDatePreset(preset.key, "filter")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  datePreset === preset.key
                    ? "bg-purple-600 font-semibold text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Search & Custom Date Range Input Row */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="relative sm:col-span-6">
              <RiSearchLine className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="বিবরণ বা টাকার পরিমাণ দিয়ে খুঁজুন..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 text-xs sm:text-sm"
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

            <div className="flex items-center gap-2 sm:col-span-6">
              <div className="relative flex-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset("custom");
                    setCurrentPage(1);
                  }}
                  className="text-xs"
                />
              </div>
              <span className="text-xs text-slate-400">হতে</span>
              <div className="relative flex-1">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset("custom");
                    setCurrentPage(1);
                  }}
                  className="text-xs"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => applyDatePreset("all", "filter")}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  title="তারিখ রিসেট"
                >
                  <RiCloseLine className="size-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {/* Desktop Table View */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-purple-50/60 font-semibold text-slate-700 dark:border-slate-800 dark:bg-purple-950/30 dark:text-slate-200">
                <tr className="whitespace-nowrap">
                  <th className="w-12 px-4 py-3 text-center whitespace-nowrap">ক্র.</th>
                  <th className="w-28 px-4 py-3 whitespace-nowrap">তারিখ</th>
                  <th className="px-4 py-3 whitespace-nowrap">বিবরণ ও মন্তব্য</th>
                  <th className="w-32 px-4 py-3 text-right whitespace-nowrap">মোট ক্রয় দর (৳)</th>
                  <th className="w-32 px-4 py-3 text-right whitespace-nowrap">পরিশোধ / জমা (৳)</th>
                  <th className="w-36 px-4 py-3 text-right whitespace-nowrap">অবশিষ্ট পাওনা (৳)</th>
                  <th className="w-24 px-4 py-3 text-right whitespace-nowrap">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {/* Opening Balance Row if Start Date was applied */}
                {startDate && (
                  <tr className="bg-slate-50 font-semibold dark:bg-slate-900/70">
                    <td className="px-4 py-3 text-center text-xs text-slate-400">-</td>
                    <td className="px-4 py-3 font-mono text-xs">{startDate}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      পূর্ববর্তী সময়কালের অবশিষ্ট জের (Opening Balance B/F)
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">-</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">-</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                      ৳ {formatMoney(statementLedger.openingBalance)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">-</td>
                  </tr>
                )}

                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RiFileTextLine className="size-8 text-slate-400" />
                        <p className="font-medium">কোনো লেনদেন পাওয়া যায়নি</p>
                        <p className="text-xs text-slate-400">
                          {searchTerm || startDate || endDate
                            ? "নির্বাচিত ফিল্টারের সাথে মিল রেখে কোনো লেনদেন নেই।"
                            : "নতুন লেনদেন যোগ করতে উপরের বাটনে ক্লিক করুন।"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map((entry, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const dateStr = new Date(entry.date).toISOString().split("T")[0];

                    return (
                      <tr
                        key={entry.id}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                      >
                        <td className="px-4 py-3.5 text-center text-xs text-slate-400">
                          {rowNumber}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {dateStr}
                        </td>

                        <td className="px-4 py-3.5 text-xs text-slate-800 dark:text-slate-200">
                          {entry.description || "-"}
                        </td>

                        <td className="px-4 py-3.5 text-right font-semibold text-blue-700 dark:text-blue-400">
                          {entry.kroy > 0 ? `৳ ${formatMoney(entry.kroy)}` : "-"}
                        </td>

                        <td className="px-4 py-3.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                          {entry.joma > 0 ? `৳ ${formatMoney(entry.joma)}` : "-"}
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold">
                          <span
                            className={
                              entry.runningBalance > 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-900 dark:text-white"
                            }
                          >
                            ৳ {formatMoney(entry.runningBalance)}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openPreviewDialog(entry)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                              title="প্রিভিউ"
                            >
                              <RiEyeLine className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditDialog(entry)}
                              className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                              title="সম্পাদনা করুন"
                            >
                              <RiEditLine className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteDialog(entry)}
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

              {/* Table Footer Totals */}
              {paginatedEntries.length > 0 && (
                <tfoot className="border-t-2 border-purple-200 bg-purple-50/40 font-bold dark:border-purple-900 dark:bg-purple-950/20">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-right text-xs text-purple-900 dark:text-purple-300"
                    >
                      সর্বমোট হিসাব (PERIOD TOTALS):
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-blue-700 dark:text-blue-400">
                      ৳ {formatMoney(statementLedger.totalPeriodKroy)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-emerald-700 dark:text-emerald-400">
                      ৳ {formatMoney(statementLedger.totalPeriodJoma)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm ${
                        statementLedger.closingBalance > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      ৳ {formatMoney(statementLedger.closingBalance)}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          <div className="pt-3">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredEntries.length}
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
      {/* ADD TRANSACTION MODAL                                                     */}
      {/* ========================================================================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddTxSubmit}>
            <DialogHeader>
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                <RiWallet3Line className="size-5" />
              </div>
              <DialogTitle className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                নতুন লেনদেন যোগ করুন
              </DialogTitle>
              <DialogDescription className="text-xs">
                {party.name} এর জন্য ক্রয় অথবা জমা চালানের এন্ট্রি দিন
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div>
                <Label htmlFor="tx-date" className="text-xs font-semibold">
                  তারিখ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tx-date"
                  type="date"
                  value={
                    txFormData.date ? new Date(txFormData.date).toISOString().split("T")[0] : ""
                  }
                  onChange={(e) => setTxFormData({ ...txFormData, date: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="tx-kroy"
                    className="text-xs font-semibold text-blue-700 dark:text-blue-400"
                  >
                    মোট ক্রয় দর (৳)
                  </Label>
                  <Input
                    id="tx-kroy"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={txFormData.kroy || ""}
                    onChange={(e) =>
                      setTxFormData({ ...txFormData, kroy: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 font-mono"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">মালের মোট ক্রয় মূল্য</p>
                </div>

                <div>
                  <Label
                    htmlFor="tx-joma"
                    className="text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                  >
                    পরিশোধ / জমা (৳)
                  </Label>
                  <Input
                    id="tx-joma"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={txFormData.joma || ""}
                    onChange={(e) =>
                      setTxFormData({ ...txFormData, joma: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 font-mono"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">পার্টিকে পরিশোধিত নগদ/চেক</p>
                </div>
              </div>

              {formErrors.amount && <p className="text-xs text-red-600">{formErrors.amount}</p>}

              <div>
                <Label htmlFor="tx-desc" className="text-xs font-semibold">
                  বিবরণ ও চালান মন্তব্য
                </Label>
                <Textarea
                  id="tx-desc"
                  placeholder="উদা: ব্রয়লার ফিড ৫০ বস্তা ক্রয়, মেমো নং ১২৩৪"
                  value={txFormData.description || ""}
                  onChange={(e) => setTxFormData({ ...txFormData, description: e.target.value })}
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
      {/* EDIT TRANSACTION MODAL                                                    */}
      {/* ========================================================================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditTxSubmit}>
            <DialogHeader>
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <RiEditLine className="size-5" />
              </div>
              <DialogTitle className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                লেনদেন সম্পাদন করুন
              </DialogTitle>
              <DialogDescription className="text-xs">
                তারিখ, টাকার পরিমাণ বা বিবরণ পরিবর্তন করুন
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div>
                <Label htmlFor="edit-tx-date" className="text-xs font-semibold">
                  তারিখ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-tx-date"
                  type="date"
                  value={
                    txFormData.date ? new Date(txFormData.date).toISOString().split("T")[0] : ""
                  }
                  onChange={(e) => setTxFormData({ ...txFormData, date: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="edit-tx-kroy"
                    className="text-xs font-semibold text-blue-700 dark:text-blue-400"
                  >
                    মোট ক্রয় দর (৳)
                  </Label>
                  <Input
                    id="edit-tx-kroy"
                    type="number"
                    step="0.01"
                    min="0"
                    value={txFormData.kroy || ""}
                    onChange={(e) =>
                      setTxFormData({ ...txFormData, kroy: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 font-mono"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="edit-tx-joma"
                    className="text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                  >
                    পরিশোধ / জমা (৳)
                  </Label>
                  <Input
                    id="edit-tx-joma"
                    type="number"
                    step="0.01"
                    min="0"
                    value={txFormData.joma || ""}
                    onChange={(e) =>
                      setTxFormData({ ...txFormData, joma: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 font-mono"
                  />
                </div>
              </div>

              {formErrors.amount && <p className="text-xs text-red-600">{formErrors.amount}</p>}

              <div>
                <Label htmlFor="edit-tx-desc" className="text-xs font-semibold">
                  বিবরণ ও চালান মন্তব্য
                </Label>
                <Textarea
                  id="edit-tx-desc"
                  value={txFormData.description || ""}
                  onChange={(e) => setTxFormData({ ...txFormData, description: e.target.value })}
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
      {/* DELETE TRANSACTION MODAL                                                  */}
      {/* ========================================================================= */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
              <RiDeleteBinLine className="size-5" />
            </div>
            <DialogTitle className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
              লেনদেন মুছে ফেলবেন?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-300">
              আপনি কি নিশ্চিত যে এই লেনদেনটি চিরতরে মুছে ফেলতে চান?
            </DialogDescription>
          </DialogHeader>

          {activeTransaction && (
            <div className="my-3 space-y-1.5 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">তারিখ:</span>
                <span className="font-mono">
                  {new Date(activeTransaction.date).toISOString().split("T")[0]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ক্রয় দর:</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  ৳ {formatMoney(activeTransaction.kroy)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">পরিশোধ/জমা:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  ৳ {formatMoney(activeTransaction.joma)}
                </span>
              </div>
              {activeTransaction.description && (
                <div className="border-t border-slate-200 pt-1 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  {activeTransaction.description}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
              বাতিল
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteTxSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <RiLoader4Line className="mr-1 size-3.5 animate-spin" />
                  মুছে ফেলা হচ্ছে...
                </>
              ) : (
                "মুছে ফেলুন"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* PREVIEW TRANSACTION MODAL                                                 */}
      {/* ========================================================================= */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          {activeTransaction && (
            <div>
              <DialogHeader>
                <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  <RiEyeLine className="size-5" />
                </div>
                <DialogTitle className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  লেনদেন প্রিভিউ
                </DialogTitle>
                <DialogDescription className="text-xs">পার্টি: {party.name}</DialogDescription>
              </DialogHeader>

              <div className="my-4 space-y-2.5 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800/60">
                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                  <span className="text-slate-500">তারিখ:</span>
                  <span className="font-mono font-semibold">
                    {new Date(activeTransaction.date).toISOString().split("T")[0]}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                  <span className="text-slate-500">মোট ক্রয় দর:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-400">
                    ৳ {formatMoney(activeTransaction.kroy)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                  <span className="text-slate-500">পরিশোধ / জমা:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    ৳ {formatMoney(activeTransaction.joma)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                  <span className="text-slate-500">চালান ব্যবধান:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ৳ {formatMoney(activeTransaction.kroy - activeTransaction.joma)}
                  </span>
                </div>

                {activeTransaction.description && (
                  <div className="pt-1">
                    <span className="mb-1 block text-slate-500">বিবরণ / চালান নোট:</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {activeTransaction.description}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
                  বন্ধ করুন
                </DialogClose>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    openEditDialog(activeTransaction);
                  }}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  সম্পাদনা করুন
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* EDIT PARTY PROFILE MODAL                                                  */}
      {/* ========================================================================= */}
      <Dialog open={isEditPartyOpen} onOpenChange={setIsEditPartyOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditPartySubmit}>
            <DialogHeader>
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                <RiEditLine className="size-5" />
              </div>
              <DialogTitle className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                পার্টির প্রোফাইল সম্পাদন
              </DialogTitle>
              <DialogDescription className="text-xs">
                নাম, ঠিকানা বা মোবাইল নম্বর আপডেট করুন
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div>
                <Label htmlFor="party-name" className="text-xs font-semibold">
                  পার্টির নাম <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="party-name"
                  value={partyFormData.name}
                  onChange={(e) => setPartyFormData({ ...partyFormData, name: e.target.value })}
                  className="mt-1"
                />
                {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
              </div>

              <div>
                <Label htmlFor="party-phone" className="text-xs font-semibold">
                  মোবাইল নম্বর
                </Label>
                <Input
                  id="party-phone"
                  value={partyFormData.phone || ""}
                  onChange={(e) => setPartyFormData({ ...partyFormData, phone: e.target.value })}
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label htmlFor="party-address" className="text-xs font-semibold">
                  ঠিকানা / এলাকা
                </Label>
                <Input
                  id="party-address"
                  value={partyFormData.address || ""}
                  onChange={(e) => setPartyFormData({ ...partyFormData, address: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="party-notes" className="text-xs font-semibold">
                  নোট / মন্তব্য
                </Label>
                <Textarea
                  id="party-notes"
                  value={partyFormData.notes || ""}
                  onChange={(e) => setPartyFormData({ ...partyFormData, notes: e.target.value })}
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
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                {isPending ? (
                  <>
                    <RiLoader4Line className="mr-1 size-3.5 animate-spin" />
                    সংরক্ষণ হচ্ছে...
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
      {/* EXPORT STATEMENT DIALOG                                                   */}
      {/* ========================================================================= */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              <RiDownloadLine className="size-5" />
            </div>
            <DialogTitle className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
              পার্টি স্টেটমেন্ট এক্সপোর্ট ও প্রিন্ট
            </DialogTitle>
            <DialogDescription className="text-xs">
              {party.name} এর আর্থিক স্টেটমেন্ট ডাউনলোড অথবা সরাসরি প্রিন্ট করুন
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs font-semibold">স্টেটমেন্টের সময়কাল (Scope)</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope("all")}
                  className={`rounded-lg border p-2 text-left text-xs transition ${
                    exportScope === "all"
                      ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20 dark:bg-purple-950/60 dark:text-purple-200"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                  }`}
                >
                  <p className="font-semibold">সম্পূর্ণ রেকর্ড</p>
                  <p className="text-[10px] text-slate-500">সকল লেনদেন</p>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope("filtered")}
                  className={`rounded-lg border p-2 text-left text-xs transition ${
                    exportScope === "filtered"
                      ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20 dark:bg-purple-950/60 dark:text-purple-200"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                  }`}
                >
                  <p className="font-semibold">বর্তমান ফিল্টার</p>
                  <p className="text-[10px] text-slate-500">
                    {statementLedger.transactionCount} টি
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope("custom")}
                  className={`rounded-lg border p-2 text-left text-xs transition ${
                    exportScope === "custom"
                      ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20 dark:bg-purple-950/60 dark:text-purple-200"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                  }`}
                >
                  <p className="font-semibold">নির্দিষ্ট তারিখ</p>
                  <p className="text-[10px] text-slate-500">কাস্টম রেঞ্জ</p>
                </button>
              </div>
            </div>

            {exportScope === "custom" && (
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <div>
                  <Label className="text-[11px]">শুরুর তারিখ</Label>
                  <Input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">শেষের তারিখ</Label>
                  <Input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold">ফরম্যাট ও অ্যাকশন নির্বাচন করুন</Label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExportFormat("pdf");
                    handleExecuteExport("download");
                  }}
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
                  onClick={() => {
                    setExportFormat("pdf");
                    handleExecuteExport("print");
                  }}
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
                  onClick={() => {
                    setExportFormat("xlsx");
                    handleExecuteExport("download");
                  }}
                  className="h-10 justify-start gap-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                >
                  <RiFileExcel2Line className="size-4 shrink-0" />
                  <span>Excel (.xlsx) শীট</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExportFormat("csv");
                    handleExecuteExport("download");
                  }}
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
