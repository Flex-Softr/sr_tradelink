"use client";

import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (limit: number) => void;
  itemName?: string; // e.g. "পণ্য", "গ্রাহক", "ব্যবহারকারী"
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemName = "আইটেম",
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipses for long lists
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      {/* Items Range & Per Page Selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>
          মোট{" "}
          <strong className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</strong>{" "}
          টি {itemName}র মধ্যে{" "}
          <strong className="font-semibold text-slate-700 dark:text-slate-200">
            {startItem}–{endItem}
          </strong>{" "}
          প্রদর্শিত হচ্ছে
        </span>

        {onItemsPerPageChange && (
          <div className="ml-auto flex items-center gap-1.5 sm:ml-2">
            <label htmlFor="per-page-select" className="text-[11px] text-slate-500">
              প্রতি পৃষ্ঠায়:
            </label>
            <select
              id="per-page-select"
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-xs focus:border-green-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value={10}>১০</option>
              <option value={20}>২০ (ডিফল্ট)</option>
              <option value={50}>৫০</option>
              <option value={100}>১০০</option>
            </select>
          </div>
        )}
      </div>

      {/* Pagination Page Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          {/* Previous Page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="h-8 px-2 text-xs"
            aria-label="পূর্ববর্তী পৃষ্ঠা"
          >
            <RiArrowLeftSLine className="size-4" />
            <span className="ml-1 hidden sm:inline">পূর্ববর্তী</span>
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-400 select-none">
                    …
                  </span>
                );
              }
              const pageNum = Number(p);
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`size-8 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-green-600 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="h-8 px-2 text-xs"
            aria-label="পরবর্তী পৃষ্ঠা"
          >
            <span className="mr-1 hidden sm:inline">পরবর্তী</span>
            <RiArrowRightSLine className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
