"use client";

import { useMemo, useState, useTransition } from "react";

import Image from "next/image";
import Link from "next/link";

import {
  RiAddLine,
  RiArrowRightUpLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEditLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiFilterLine,
  RiImageLine,
  RiLoader4Line,
  RiRefreshLine,
  RiSearchLine,
} from "@remixicon/react";

import { createProductAction, deleteProductAction, updateProductAction } from "@/actions/products";
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
import type { Product, ProductInput, ProductUnit } from "@/lib/products";
import { sanitizeImageUrl } from "@/lib/utils";

const PRESET_BADGES = ["Farmer's Choice", "Hot", "Balanced", "Recommended", "Premium"];
const PRESET_UNITS: ProductUnit[] = ["KG", "G"];

function getBadgeVariantClass(badge?: string | null) {
  switch (badge) {
    case "Farmer's Choice":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-500/30";
    case "Hot":
      return "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-500/30";
    case "Balanced":
      return "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-500/30";
    case "Recommended":
      return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/30";
    case "Premium":
      return "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-950/60 dark:text-purple-300 dark:ring-purple-500/30";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-600/20 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700";
  }
}

interface ProductManagementProps {
  initialProducts: Product[];
}

export default function ProductManagement({ initialProducts }: ProductManagementProps) {
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBadgeFilter, setSelectedBadgeFilter] = useState("all");
  const [selectedUnitFilter, setSelectedUnitFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Target product for view / edit / delete
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    subtitle: string;
    stock: number | string;
    price: number | string;
    description: string;
    image: string;
    badge: string;
    unit: ProductUnit;
  }>({
    name: "",
    subtitle: "",
    stock: 0,
    price: 0,
    description: "",
    image: "",
    badge: "Farmer's Choice",
    unit: "KG",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [customBadge, setCustomBadge] = useState("");
  const [showCustomBadge, setShowCustomBadge] = useState(false);

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

  // Filter products by search, badge, and unit
  const filteredProducts = useMemo(() => {
    return productsList.filter((product) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        (product.subtitle && product.subtitle.toLowerCase().includes(term)) ||
        (product.description && product.description.toLowerCase().includes(term)) ||
        (product.price !== null &&
          product.price !== undefined &&
          String(product.price).includes(term));

      const matchesBadge = selectedBadgeFilter === "all" || product.badge === selectedBadgeFilter;

      const matchesUnit = selectedUnitFilter === "all" || product.unit === selectedUnitFilter;

      return matchesSearch && matchesBadge && matchesUnit;
    });
  }, [productsList, searchTerm, selectedBadgeFilter, selectedUnitFilter]);

  // Pagination (20 items per page by default)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Refresh products from API
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProductsList(data.data);
        showFeedback("success", "পণ্যের তালিকা সফলভাবে রিফ্রেশ করা হয়েছে");
      }
    } catch {
      showFeedback("error", "রিফ্রেশ করতে ব্যর্থ হয়েছে");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open Add Dialog
  const openAddDialog = () => {
    setFormData({
      name: "",
      subtitle: "",
      stock: 50,
      price: 0,
      description: "",
      image: "",
      badge: "Farmer's Choice",
      unit: "KG",
    });
    setCustomBadge("");
    setShowCustomBadge(false);
    setFormErrors({});
    setIsAddOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (product: Product) => {
    setActiveProduct(product);
    const badgeVal = product.badge || "";
    const isCustom = badgeVal !== "" && !PRESET_BADGES.includes(badgeVal);
    setFormData({
      name: product.name,
      subtitle: product.subtitle || "",
      stock: product.stock ?? 0,
      price: product.price ?? 0,
      description: product.description || "",
      image: product.image || "",
      badge: isCustom ? "custom" : badgeVal || "Farmer's Choice",
      unit: product.unit || "KG",
    });
    setShowCustomBadge(isCustom);
    setCustomBadge(isCustom ? badgeVal : "");
    setFormErrors({});
    setIsEditOpen(true);
  };

  // Open Delete Dialog
  const openDeleteDialog = (product: Product) => {
    setActiveProduct(product);
    setIsDeleteOpen(true);
  };

  // Open Preview Dialog
  const openPreviewDialog = (product: Product) => {
    setActiveProduct(product);
    setIsPreviewOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "পণ্যের নাম প্রদান করুন";
    if (formData.stock !== "" && Number(formData.stock) < 0) {
      errors.stock = "স্টকের পরিমাণ ঋণাত্মক হতে পারে না";
    }
    if (formData.price !== "" && Number(formData.price) < 0) {
      errors.price = "মূল্য ঋণাত্মক হতে পারে না";
    }
    if (
      formData.image.trim() &&
      !formData.image.startsWith("http://") &&
      !formData.image.startsWith("https://")
    ) {
      errors.image = "সঠিক URL প্রদান করুন (http:// বা https:// দিয়ে শুরু)";
    }
    if (showCustomBadge && !customBadge.trim()) {
      errors.badge = "কাস্টম ব্যাজের নাম লিখুন";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const finalBadge = showCustomBadge ? customBadge.trim() : formData.badge;
    const input: ProductInput = {
      name: formData.name.trim(),
      subtitle: formData.subtitle.trim() || null,
      stock: Number(formData.stock) || 0,
      price: Number(formData.price) || 0,
      description: formData.description.trim() || null,
      image: formData.image.trim() || null,
      badge: finalBadge,
      unit: formData.unit,
    };

    startTransition(async () => {
      const res = await createProductAction(input);

      if (res.success && res.data) {
        setProductsList((prev) => [res.data!, ...prev]);
        setIsAddOpen(false);
        showFeedback("success", `"${res.data.name}" সফলভাবে যুক্ত করা হয়েছে!`);
      } else {
        showFeedback("error", res.error || "পণ্য যুক্ত করতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct || !validateForm()) return;

    const finalBadge = showCustomBadge ? customBadge.trim() : formData.badge;
    const input: Partial<ProductInput> = {
      name: formData.name.trim(),
      subtitle: formData.subtitle.trim() || null,
      stock: Number(formData.stock) || 0,
      price: Number(formData.price) || 0,
      description: formData.description.trim() || null,
      image: formData.image.trim() || null,
      badge: finalBadge,
      unit: formData.unit,
    };

    startTransition(async () => {
      const res = await updateProductAction(activeProduct.id, input);

      if (res.success && res.data) {
        setProductsList((prev) => prev.map((p) => (p.id === activeProduct.id ? res.data! : p)));
        setIsEditOpen(false);
        showFeedback("success", `"${res.data.name}" সফলভাবে আপডেট করা হয়েছে!`);
      } else {
        showFeedback("error", res.error || "পণ্য আপডেট করতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Delete
  const handleDeleteSubmit = () => {
    if (!activeProduct) return;

    startTransition(async () => {
      const res = await deleteProductAction(activeProduct.id);

      if (res.success) {
        setProductsList((prev) => prev.filter((p) => p.id !== activeProduct.id));
        setIsDeleteOpen(false);
        showFeedback("success", `"${activeProduct.name}" সফলভাবে মুছে ফেলা হয়েছে!`);
        setActiveProduct(null);
      } else {
        showFeedback("error", res.error || "পণ্য মুছে ফেলতে ব্যর্থ হয়েছে");
      }
    });
  };

  return (
    <div id="products" className="scroll-mt-20 space-y-6">
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

      {/* Main Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                পণ্যের তালিকা ও ব্যবস্থাপনা
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-green-50 text-xs font-semibold text-green-700 ring-1 ring-green-600/20 dark:bg-green-950/60 dark:text-green-300"
              >
                মোট {productsList.length} টি পণ্য
              </Badge>
            </div>
            <CardDescription className="mt-1">
              মজুদ (Stock), মূল্য (Price), একক (Unit) ও বিবরণসহ ডায়নামিক পণ্যসমূহ নিয়ন্ত্রণ করুন
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

            <Link
              href="/#products"
              target="_blank"
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-green-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-green-400"
            >
              <span>লাইভ সাইট</span>
              <RiArrowRightUpLine className="size-4" />
            </Link>

            <Button
              onClick={openAddDialog}
              className="gap-1.5 bg-green-600 text-white shadow-sm hover:bg-green-700"
            >
              <RiAddLine className="size-4.5" />
              <span>নতুন পণ্য যোগ করুন</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Search and Filters */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Search Box */}
              <div className="relative max-w-md flex-1">
                <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="পণ্য খুঁজুন (নাম, বিবরণ, স্টক, মূল্য)..."
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

              {/* Unit Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">একক (Unit):</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUnitFilter("all");
                      setCurrentPage(1);
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      selectedUnitFilter === "all"
                        ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    সকল
                  </button>
                  {PRESET_UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        setSelectedUnitFilter(u);
                        setCurrentPage(1);
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        selectedUnitFilter === u
                          ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Badge Filters */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="mr-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                <RiFilterLine className="size-3.5" />
                ব্যাজ ফিল্টার:
              </span>
              <button
                onClick={() => {
                  setSelectedBadgeFilter("all");
                  setCurrentPage(1);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  selectedBadgeFilter === "all"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                সকল ({productsList.length})
              </button>
              {PRESET_BADGES.map((badge) => {
                const count = productsList.filter((p) => p.badge === badge).length;
                return (
                  <button
                    key={badge}
                    onClick={() => {
                      setSelectedBadgeFilter(badge);
                      setCurrentPage(1);
                    }}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      selectedBadgeFilter === badge
                        ? "bg-green-600 text-white ring-1 ring-green-600"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {badge} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          {filteredProducts.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <RiSearchLine className="size-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                কোনো পণ্য খুঁজে পাওয়া যায়নি
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                {searchTerm || selectedBadgeFilter !== "all" || selectedUnitFilter !== "all"
                  ? "আপনার অনুসন্ধানের সাথে মেলে এমন কোনো পণ্য নেই। ফিল্টার মুছে আবার চেষ্টা করুন।"
                  : "এখনো কোনো পণ্য ডাটাবেজে যুক্ত করা হয়নি।"}
              </p>
              {(searchTerm || selectedBadgeFilter !== "all" || selectedUnitFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedBadgeFilter("all");
                    setSelectedUnitFilter("all");
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
                      পণ্য ও ছবি
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      মজুদ (Stock)
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      মূল্য / একক
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      ব্যাজ
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      অ্যাকশন
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
                  {paginatedProducts.map((item) => (
                    <tr
                      key={item.id}
                      className="group transition hover:bg-slate-50/75 dark:hover:bg-slate-900/60"
                    >
                      {/* Name & Image */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-xs dark:border-slate-800 dark:bg-slate-800">
                            {sanitizeImageUrl(item.image) ? (
                              <Image
                                src={sanitizeImageUrl(item.image)!}
                                alt={item.name}
                                fill
                                sizes="48px"
                                className="object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-slate-400">
                                <RiImageLine className="size-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </div>
                            {item.subtitle && (
                              <div className="line-clamp-1 text-xs text-slate-500">
                                {item.subtitle}
                              </div>
                            )}
                            <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                              ID: {item.id.slice(-6)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3">
                        {(item.stock ?? 0) > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex size-2 rounded-full bg-emerald-500" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.stock} {item.unit || "KG"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex size-2 rounded-full bg-rose-500" />
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                              স্টক নেই (০)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Price & Unit */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          ৳ {item.price !== null && item.price !== undefined ? item.price : 0}
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            / {item.unit || "KG"}
                          </span>
                        </div>
                      </td>

                      {/* Badge */}
                      <td className="px-4 py-3">
                        {item.badge ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getBadgeVariantClass(
                              item.badge
                            )}`}
                          >
                            {item.badge}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Preview */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openPreviewDialog(item)}
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
                            onClick={() => openEditDialog(item)}
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
                            onClick={() => openDeleteDialog(item)}
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
                  totalItems={filteredProducts.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  itemName="পণ্য"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* ADD PRODUCT DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>নতুন পণ্য যোগ করুন</DialogTitle>
            <DialogDescription>
              পণ্য, মজুদ (Stock), মূল্য ও এককের বিস্তারিত তথ্য প্রদান করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            {/* Name */}
            <div>
              <Label htmlFor="add-name" className="text-sm font-medium">
                পণ্যের নাম <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="যেমন: সরিষা খৈল / Sorisa Khoil"
                className="mt-1"
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <p className="mt-1 text-xs text-rose-500">{formErrors.name}</p>}
            </div>

            {/* Subtitle */}
            <div>
              <Label htmlFor="add-subtitle" className="text-sm font-medium">
                সংক্ষিপ্ত বিবরণ (Subtitle)
              </Label>
              <Input
                id="add-subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="যেমন: প্রিমিয়াম কোয়ালিটি এবং পুষ্টি উপাদান সমৃদ্ধ"
                className="mt-1"
              />
            </div>

            {/* Price & Unit & Stock Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Price */}
              <div>
                <Label htmlFor="add-price" className="text-sm font-medium">
                  মূল্য (৳ BDT)
                </Label>
                <Input
                  id="add-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="mt-1"
                  aria-invalid={!!formErrors.price}
                />
                {formErrors.price && (
                  <p className="mt-1 text-xs text-rose-500">{formErrors.price}</p>
                )}
              </div>

              {/* Unit */}
              <div>
                <Label className="text-sm font-medium">একক (Unit)</Label>
                <div className="mt-1 flex rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
                  {PRESET_UNITS.map((u) => (
                    <button
                      type="button"
                      key={u}
                      onClick={() => setFormData({ ...formData, unit: u })}
                      className={`flex-1 rounded py-1 text-xs font-semibold transition ${
                        formData.unit === u
                          ? "bg-green-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock */}
              <div>
                <Label htmlFor="add-stock" className="text-sm font-medium">
                  মজুদ (Stock)
                </Label>
                <Input
                  id="add-stock"
                  type="number"
                  step="any"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0.00"
                  className="mt-1"
                  aria-invalid={!!formErrors.stock}
                />
                {formErrors.stock && (
                  <p className="mt-1 text-xs text-rose-500">{formErrors.stock}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="add-description" className="text-sm font-medium">
                বিস্তারিত বিবরণ (Description)
              </Label>
              <Textarea
                id="add-description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="পণ্যের গুণাগুণ, ব্যবহারবিধি, পুষ্টিগুণ ইত্যাদি..."
                className="mt-1 min-h-[72px]"
              />
            </div>

            {/* Badge Selection */}
            <div>
              <Label className="text-sm font-medium">ব্যাজ (Badge)</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PRESET_BADGES.map((b) => (
                  <button
                    type="button"
                    key={b}
                    onClick={() => {
                      setShowCustomBadge(false);
                      setFormData({ ...formData, badge: b });
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      !showCustomBadge && formData.badge === b
                        ? "bg-green-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {b}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowCustomBadge(true)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    showCustomBadge
                      ? "bg-green-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  কাস্টম ব্যাজ...
                </button>
              </div>

              {showCustomBadge && (
                <div className="mt-2">
                  <Input
                    value={customBadge}
                    onChange={(e) => setCustomBadge(e.target.value)}
                    placeholder="কাস্টম ব্যাজের নাম লিখুন..."
                    className="h-8 text-xs"
                  />
                  {formErrors.badge && (
                    <p className="mt-1 text-xs text-rose-500">{formErrors.badge}</p>
                  )}
                </div>
              )}
            </div>

            {/* Image URL with live preview */}
            <div>
              <Label htmlFor="add-image" className="text-sm font-medium">
                ছবির লিঙ্ক (Image URL)
              </Label>
              <Input
                id="add-image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://i.ibb.co.com/example/image.jpg"
                className="mt-1"
                aria-invalid={!!formErrors.image}
              />
              {formErrors.image && <p className="mt-1 text-xs text-rose-500">{formErrors.image}</p>}

              {/* Live Preview */}
              {sanitizeImageUrl(formData.image) && (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700">
                    <Image
                      src={sanitizeImageUrl(formData.image)!}
                      alt="ছবি প্রিভিউ"
                      fill
                      sizes="64px"
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      ছবির প্রিভিউ
                    </span>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">
                      লিঙ্কটি লোড হচ্ছে
                    </p>
                  </div>
                </div>
              )}
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
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* EDIT PRODUCT DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>পণ্য সম্পাদনা করুন</DialogTitle>
            <DialogDescription>
              পণ্যের তথ্য, মজুদ (Stock), মূল্য বা একক পরিবর্তন করে সংরক্ষণ করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            {/* Name */}
            <div>
              <Label htmlFor="edit-name" className="text-sm font-medium">
                পণ্যের নাম <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <p className="mt-1 text-xs text-rose-500">{formErrors.name}</p>}
            </div>

            {/* Subtitle */}
            <div>
              <Label htmlFor="edit-subtitle" className="text-sm font-medium">
                সংক্ষিপ্ত বিবরণ (Subtitle)
              </Label>
              <Input
                id="edit-subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Price & Unit & Stock Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Price */}
              <div>
                <Label htmlFor="edit-price" className="text-sm font-medium">
                  মূল্য (৳ BDT)
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="mt-1"
                  aria-invalid={!!formErrors.price}
                />
                {formErrors.price && (
                  <p className="mt-1 text-xs text-rose-500">{formErrors.price}</p>
                )}
              </div>

              {/* Unit */}
              <div>
                <Label className="text-sm font-medium">একক (Unit)</Label>
                <div className="mt-1 flex rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
                  {PRESET_UNITS.map((u) => (
                    <button
                      type="button"
                      key={u}
                      onClick={() => setFormData({ ...formData, unit: u })}
                      className={`flex-1 rounded py-1 text-xs font-semibold transition ${
                        formData.unit === u
                          ? "bg-green-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock */}
              <div>
                <Label htmlFor="edit-stock" className="text-sm font-medium">
                  মজুদ (Stock)
                </Label>
                <Input
                  id="edit-stock"
                  type="number"
                  step="any"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="mt-1"
                  aria-invalid={!!formErrors.stock}
                />
                {formErrors.stock && (
                  <p className="mt-1 text-xs text-rose-500">{formErrors.stock}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="edit-description" className="text-sm font-medium">
                বিস্তারিত বিবরণ (Description)
              </Label>
              <Textarea
                id="edit-description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 min-h-[72px]"
              />
            </div>

            {/* Badge */}
            <div>
              <Label className="text-sm font-medium">ব্যাজ (Badge)</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PRESET_BADGES.map((b) => (
                  <button
                    type="button"
                    key={b}
                    onClick={() => {
                      setShowCustomBadge(false);
                      setFormData({ ...formData, badge: b });
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      !showCustomBadge && formData.badge === b
                        ? "bg-green-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {b}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowCustomBadge(true)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    showCustomBadge
                      ? "bg-green-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  কাস্টম ব্যাজ...
                </button>
              </div>

              {showCustomBadge && (
                <div className="mt-2">
                  <Input
                    value={customBadge}
                    onChange={(e) => setCustomBadge(e.target.value)}
                    placeholder="কাস্টম ব্যাজের নাম লিখুন..."
                    className="h-8 text-xs"
                  />
                  {formErrors.badge && (
                    <p className="mt-1 text-xs text-rose-500">{formErrors.badge}</p>
                  )}
                </div>
              )}
            </div>

            {/* Image URL with live preview */}
            <div>
              <Label htmlFor="edit-image" className="text-sm font-medium">
                ছবির লিঙ্ক (Image URL)
              </Label>
              <Input
                id="edit-image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="mt-1"
                aria-invalid={!!formErrors.image}
              />
              {formErrors.image && <p className="mt-1 text-xs text-rose-500">{formErrors.image}</p>}

              {/* Live Preview */}
              {sanitizeImageUrl(formData.image) && (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700">
                    <Image
                      src={sanitizeImageUrl(formData.image)!}
                      alt="ছবি প্রিভিউ"
                      fill
                      sizes="64px"
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      ছবির প্রিভিউ
                    </span>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">
                      লিঙ্কটি লোড হচ্ছে
                    </p>
                  </div>
                </div>
              )}
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
            <DialogTitle className="text-center">পণ্য মুছে ফেলতে চান?</DialogTitle>
            <DialogDescription className="text-center">
              আপনি কি নিশ্চিত যে{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                &ldquo;{activeProduct?.name}&rdquo;
              </span>{" "}
              মুছে ফেলতে চান? এই অ্যাকশনটি স্থায়ী এবং তা ডাটাবেজ থেকে পণ্যটি সরিয়ে দেবে।
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
      {/* PREVIEW PRODUCT CARD DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-md">
          {activeProduct && (
            <div className="bg-card text-card-foreground">
              <div className="relative h-64 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                {sanitizeImageUrl(activeProduct.image) ? (
                  <Image
                    src={sanitizeImageUrl(activeProduct.image)!}
                    alt={activeProduct.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 448px"
                    className="object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-slate-400">
                    <RiImageLine className="size-10" />
                  </div>
                )}
                {activeProduct.badge && (
                  <Badge className="absolute top-4 left-4 shadow-lg">{activeProduct.badge}</Badge>
                )}
              </div>

              <div className="p-6">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {activeProduct.name}
                  </h3>
                  <div className="shrink-0">
                    {(activeProduct.stock ?? 0) > 0 ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      >
                        স্টক: {activeProduct.stock} {activeProduct.unit || "KG"}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">স্টক নেই</Badge>
                    )}
                  </div>
                </div>

                {activeProduct.subtitle && (
                  <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                    {activeProduct.subtitle}
                  </p>
                )}

                {activeProduct.description && (
                  <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    {activeProduct.description}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div>
                    <span className="block text-xs tracking-wider text-slate-400 uppercase">
                      মূল্য
                    </span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ৳{" "}
                      {activeProduct.price !== null && activeProduct.price !== undefined
                        ? activeProduct.price
                        : 0}
                      <span className="ml-1 text-xs font-normal text-slate-500">
                        / {activeProduct.unit || "KG"}
                      </span>
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    লাইভ প্রিভিউ
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end bg-slate-50 p-4 dark:bg-slate-900">
                <DialogClose render={<Button variant="outline" size="sm" />}>বন্ধ করুন</DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
