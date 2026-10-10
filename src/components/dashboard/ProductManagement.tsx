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
  RiFileTextLine,
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
import type { Product, ProductInput } from "@/lib/products";
import { sanitizeImageUrl } from "@/lib/utils";

interface ProductManagementProps {
  initialProducts: Product[];
}

export default function ProductManagement({ initialProducts }: ProductManagementProps) {
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
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
    price: number | string;
    description: string;
    image: string;
  }>({
    name: "",
    subtitle: "",
    price: 0,
    description: "",
    image: "",
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

      return matchesSearch;
    });
  }, [productsList, searchTerm]);

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
      price: 0,
      description: "",
      image: "",
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (product: Product) => {
    setActiveProduct(product);
    setFormData({
      name: product.name,
      subtitle: product.subtitle || "",
      price: product.price ?? 0,
      description: product.description || "",
      image: product.image || "",
    });
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
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const input: ProductInput = {
      name: formData.name.trim(),
      subtitle: formData.subtitle.trim() || null,
      price: Number(formData.price) || 0,
      description: formData.description.trim() || null,
      image: formData.image.trim() || null,
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

    const input: Partial<ProductInput> = {
      name: formData.name.trim(),
      subtitle: formData.subtitle.trim() || null,
      price: Number(formData.price) || 0,
      description: formData.description.trim() || null,
      image: formData.image.trim() || null,
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
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 p-4 pb-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 sm:pb-5 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <CardTitle className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                পণ্যের তালিকা ও ব্যবস্থাপনা
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-green-50 text-xs font-semibold text-green-700 ring-1 ring-green-600/20 dark:bg-green-950/60 dark:text-green-300"
              >
                মোট {productsList.length} টি পণ্য
              </Badge>
            </div>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              মজুদ (Stock), মূল্য (Price), একক (Unit) ও বিবরণসহ ডায়নামিক পণ্যসমূহ নিয়ন্ত্রণ করুন
            </CardDescription>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 gap-1.5"
              title="তালিকা রিফ্রেশ করুন"
            >
              <RiRefreshLine className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">রিফ্রেশ</span>
            </Button>

            <Link
              href="/#products"
              target="_blank"
              className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-green-700 sm:text-sm dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-green-400"
            >
              <span>লাইভ সাইট</span>
              <RiArrowRightUpLine className="size-4" />
            </Link>

            <Button
              onClick={openAddDialog}
              className="h-9 flex-1 justify-center gap-1.5 bg-green-600 text-xs text-white shadow-sm hover:bg-green-700 sm:h-9.5 sm:flex-initial sm:text-sm"
            >
              <RiAddLine className="size-4 sm:size-4.5" />
              <span>নতুন পণ্য যোগ করুন</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-4 sm:p-6 sm:pt-6">
          {/* Search and Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:mb-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Search Box */}
              <div className="relative w-full md:max-w-md">
                <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="পণ্য খুঁজুন (নাম, বিবরণ, মূল্য)..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 bg-slate-50/50 pr-9 pl-9 text-xs sm:text-sm dark:bg-slate-900/50"
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

              <div className="text-xs text-slate-500 dark:text-slate-400">
                প্রদর্শিত: <strong>{paginatedProducts.length}</strong> /{" "}
                <strong>{filteredProducts.length}</strong> টি পণ্য
              </div>
            </div>
          </div>

          {/* Table & Mobile Cards */}
          {filteredProducts.length === 0 ? (
            <div className="px-4 py-12 text-center sm:py-14">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <RiSearchLine className="size-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                কোনো পণ্য খুঁজে পাওয়া যায়নি
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                {searchTerm
                  ? "আপনার অনুসন্ধানের সাথে মেলে এমন কোনো পণ্য নেই। ফিল্টার মুছে আবার চেষ্টা করুন।"
                  : "এখনো কোনো পণ্য ডাটাবেজে যুক্ত করা হয়নি।"}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                  }}
                  className="mt-4"
                >
                  ফিল্টার রিসেট করুন
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
                        পণ্য ও ছবি
                      </th>
                      <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                        মূল্য
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-right whitespace-nowrap">
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

                        {/* Price & Unit */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            ৳ {item.price !== null && item.price !== undefined ? item.price : 0}
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Details */}
                            <Link
                              href={`/dashboard/products/${item.id}`}
                              className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                              title="বিবরণ ও স্টক খতিয়ান"
                            >
                              <RiEyeLine className="size-4" />
                              <span className="sr-only">বিবরণ</span>
                            </Link>

                            {/* Preview */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openPreviewDialog(item)}
                              title="দ্রুত প্রিভিউ"
                              className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                              <RiFileTextLine className="size-4" />
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
              </div>

              {/* Mobile Card List View */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
                {paginatedProducts.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-2xs dark:border-slate-800 dark:bg-slate-800">
                          {sanitizeImageUrl(item.image) ? (
                            <Image
                              src={sanitizeImageUrl(item.image)!}
                              alt={item.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center text-slate-400">
                              <RiImageLine className="size-6" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/dashboard/products/${item.id}`}
                              className="line-clamp-1 text-sm font-bold text-slate-900 hover:text-green-600 hover:underline dark:text-white dark:hover:text-green-400"
                            >
                              {item.name}
                            </Link>
                            <span className="shrink-0 rounded-md bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700 ring-1 ring-green-600/20 dark:bg-green-950/60 dark:text-green-300">
                              ৳ {item.price !== null && item.price !== undefined ? item.price : 0}
                            </span>
                          </div>
                          {item.subtitle && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                              {item.subtitle}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400">
                              ID: {item.id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
                      <Link
                        href={`/dashboard/products/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline dark:text-green-400"
                      >
                        <RiEyeLine className="size-3.5" />
                        <span>বিবরণ ও খতিয়ান</span>
                      </Link>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openPreviewDialog(item)}
                          title="দ্রুত প্রিভিউ"
                          className="size-7 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <RiFileTextLine className="size-3.5" />
                          <span className="sr-only">প্রিভিউ</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEditDialog(item)}
                          title="সম্পাদনা"
                          className="size-7 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                        >
                          <RiEditLine className="size-3.5" />
                          <span className="sr-only">সম্পাদনা</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openDeleteDialog(item)}
                          title="মুছুন"
                          className="size-7 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        >
                          <RiDeleteBinLine className="size-3.5" />
                          <span className="sr-only">মুছুন</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination controls (20 items per page default) */}
              <div className="rounded-lg bg-slate-50/50 px-3 sm:px-4 dark:bg-slate-900/50">
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
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">নতুন পণ্য যোগ করুন</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              পণ্য, মজুদ (Stock), মূল্য ও এককের বিস্তারিত তথ্য প্রদান করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-3.5 pt-2 sm:space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="add-name" className="text-xs font-medium sm:text-sm">
                পণ্যের নাম <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="যেমন: সরিষা খৈল / Sorisa Khoil"
                className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <p className="mt-1 text-xs text-rose-500">{formErrors.name}</p>}
            </div>

            {/* Subtitle */}
            <div>
              <Label htmlFor="add-subtitle" className="text-xs font-medium sm:text-sm">
                সংক্ষিপ্ত বিবরণ (Subtitle)
              </Label>
              <Input
                id="add-subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="যেমন: প্রিমিয়াম কোয়ালিটি এবং পুষ্টি উপাদান সমৃদ্ধ"
                className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
              />
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="add-price" className="text-xs font-medium sm:text-sm">
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
                className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                aria-invalid={!!formErrors.price}
              />
              {formErrors.price && <p className="mt-1 text-xs text-rose-500">{formErrors.price}</p>}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="add-description" className="text-xs font-medium sm:text-sm">
                বিস্তারিত বিবরণ (Description)
              </Label>
              <Textarea
                id="add-description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="পণ্যের গুণাগুণ, ব্যবহারবিধি, পুষ্টিগুণ ইত্যাদি..."
                className="mt-1 min-h-[72px] text-xs sm:text-sm"
              />
            </div>

            {/* Image URL with live preview */}
            <div>
              <Label htmlFor="add-image" className="text-xs font-medium sm:text-sm">
                ছবির লিঙ্ক (Image URL)
              </Label>
              <Input
                id="add-image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://i.ibb.co.com/example/image.jpg"
                className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                aria-invalid={!!formErrors.image}
              />
              {formErrors.image && <p className="mt-1 text-xs text-rose-500">{formErrors.image}</p>}

              {/* Live Preview */}
              {sanitizeImageUrl(formData.image) && (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white sm:size-16 dark:border-slate-700">
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

            <DialogFooter className="flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end sm:pt-4 dark:border-slate-800">
              <DialogClose
                render={<Button variant="outline" type="button" className="w-full sm:w-auto" />}
              >
                বাতিল করুন
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full justify-center gap-1.5 bg-green-600 text-white hover:bg-green-700 sm:w-auto"
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
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">পণ্য সম্পাদনা করুন</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              পণ্যের তথ্য, মজুদ (Stock), মূল্য বা একক পরিবর্তন করে সংরক্ষণ করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3.5 pt-2 sm:space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="edit-name" className="text-xs font-medium sm:text-sm">
                পণ্যের নাম <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <p className="mt-1 text-xs text-rose-500">{formErrors.name}</p>}
            </div>

            {/* Subtitle */}
            <div>
              <Label htmlFor="edit-subtitle" className="text-xs font-medium sm:text-sm">
                সংক্ষিপ্ত বিবরণ (Subtitle)
              </Label>
              <Input
                id="edit-subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
              />
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="edit-price" className="text-xs font-medium sm:text-sm">
                মূল্য (৳ BDT)
              </Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                aria-invalid={!!formErrors.price}
              />
              {formErrors.price && <p className="mt-1 text-xs text-rose-500">{formErrors.price}</p>}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="edit-description" className="text-xs font-medium sm:text-sm">
                বিস্তারিত বিবরণ (Description)
              </Label>
              <Textarea
                id="edit-description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 min-h-[72px] text-xs sm:text-sm"
              />
            </div>

            {/* Image URL with live preview */}
            <div>
              <Label htmlFor="edit-image" className="text-xs font-medium sm:text-sm">
                ছবির লিঙ্ক (Image URL)
              </Label>
              <Input
                id="edit-image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="mt-1 h-9 text-xs sm:h-10 sm:text-sm"
                aria-invalid={!!formErrors.image}
              />
              {formErrors.image && <p className="mt-1 text-xs text-rose-500">{formErrors.image}</p>}

              {/* Live Preview */}
              {sanitizeImageUrl(formData.image) && (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white sm:size-16 dark:border-slate-700">
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

            <DialogFooter className="flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end sm:pt-4 dark:border-slate-800">
              <DialogClose
                render={<Button variant="outline" type="button" className="w-full sm:w-auto" />}
              >
                বাতিল করুন
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full justify-center gap-1.5 bg-green-600 text-white hover:bg-green-700 sm:w-auto"
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
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-md sm:p-6">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <RiDeleteBinLine className="size-6" />
            </div>
            <DialogTitle className="text-center text-base sm:text-lg">
              পণ্য মুছে ফেলতে চান?
            </DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm">
              আপনি কি নিশ্চিত যে{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                &ldquo;{activeProduct?.name}&rdquo;
              </span>{" "}
              মুছে ফেলতে চান? এই অ্যাকশনটি স্থায়ী এবং তা ডাটাবেজ থেকে পণ্যটি সরিয়ে দেবে।
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-center">
            <DialogClose
              render={<Button variant="outline" type="button" className="w-full sm:w-auto" />}
            >
              বাতিল
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={isPending}
              className="w-full justify-center gap-1.5 sm:w-auto"
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
        <DialogContent className="max-h-[90vh] overflow-hidden overflow-y-auto p-0 sm:max-w-md">
          {activeProduct && (
            <div className="bg-card text-card-foreground">
              <div className="relative h-48 w-full overflow-hidden bg-slate-100 sm:h-64 dark:bg-slate-800">
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
              </div>

              <div className="p-4 sm:p-6">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
                    {activeProduct.name}
                  </h3>
                </div>
                {activeProduct.subtitle && (
                  <p className="mb-3 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                    {activeProduct.subtitle}
                  </p>
                )}

                {activeProduct.description && (
                  <div className="mb-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 sm:text-sm dark:bg-slate-900 dark:text-slate-300">
                    {activeProduct.description}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 sm:pt-4 dark:border-slate-800">
                  <div>
                    <span className="block text-[11px] tracking-wider text-slate-400 uppercase sm:text-xs">
                      মূল্য
                    </span>
                    <span className="text-xl font-bold text-green-600 sm:text-2xl dark:text-green-400">
                      ৳{" "}
                      {activeProduct.price !== null && activeProduct.price !== undefined
                        ? activeProduct.price
                        : 0}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    লাইভ প্রিভিউ
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end bg-slate-50 p-3 sm:p-4 dark:bg-slate-900">
                <DialogClose
                  render={<Button variant="outline" size="sm" className="w-full sm:w-auto" />}
                >
                  বন্ধ করুন
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
