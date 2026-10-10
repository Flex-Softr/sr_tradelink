"use client";

import { useMemo, useState } from "react";

import Image from "next/image";

import { RiImageLine } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Product } from "@/lib/products";
import { sanitizeImageUrl } from "@/lib/utils";

const ITEMS_PER_PAGE = 6;

function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (product: Product) => void;
}) {
  const priceDisplay =
    product.price !== null && product.price !== undefined
      ? `৳ ${product.price}`
      : "মূল্য উপলব্ধ নয়";

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
      <div className="relative h-64 overflow-hidden bg-slate-100 dark:bg-slate-800">
        {sanitizeImageUrl(product.image) ? (
          <Image
            src={sanitizeImageUrl(product.image)!}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="m-auto object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-slate-400">
            <RiImageLine className="size-12" />
          </div>
        )}
      </div>

      <CardContent className="p-7">
        <div className="mb-1 flex items-start justify-between gap-2">
          <CardTitle className="text-2xl">{product.name}</CardTitle>
        </div>
        {product.subtitle && <CardDescription className="mb-4">{product.subtitle}</CardDescription>}
        <p className="text-primary mt-2 mb-4 text-lg font-bold">{priceDisplay}</p>

        <Button
          variant="outline"
          onClick={() => onSelect(product)}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground w-full transition"
        >
          বিস্তারিত দেখুন
        </Button>
      </CardContent>
    </Card>
  );
}

interface ProductsGridProps {
  initialProducts?: Product[];
}

export default function ProductsGrid({ initialProducts }: ProductsGridProps) {
  const allProducts = initialProducts || [];
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return allProducts;
    const term = searchTerm.toLowerCase().trim();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term))
    );
  }, [searchTerm, allProducts]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const displayedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <section id="products" className="bg-muted/30 relative py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,128,0,0.06),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-semibold">
            আমাদের পণ্য
          </Badge>
          <h2 className="text-foreground mt-6 text-4xl font-bold lg:text-5xl">
            প্রিমিয়াম গবাদি পশুর খাদ্য ক্যাটালগ
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            এস আর থেকে আমাদের উচ্চমানের গবাদি পশুর খাদ্য পণ্যের বিস্তৃত পরিসর ঘুরে দেখুন।
          </p>
        </div>

        {/* Search */}
        <div className="mb-14 flex justify-center">
          <Input
            type="text"
            placeholder="পণ্যের নাম বা বিবরণ লিখুন (Bangla / Banglish)"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="max-w-xl"
          />
        </div>

        {/* Products */}
        {displayedProducts.length === 0 ? (
          <p className="text-muted-foreground text-center text-lg">কোনো পণ্য পাওয়া যায়নি</p>
        ) : (
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              পূর্ববর্তী
            </Button>

            <Button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              আরও পণ্য দেখুন
            </Button>
          </div>
        )}
      </div>

      {/* Product Details Dialog */}
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-hidden overflow-y-auto p-0 sm:max-w-md">
          {selectedProduct && (
            <div>
              <div className="relative h-52 w-full overflow-hidden bg-slate-100 sm:h-72 dark:bg-slate-800">
                {sanitizeImageUrl(selectedProduct.image) ? (
                  <Image
                    src={sanitizeImageUrl(selectedProduct.image)!}
                    alt={selectedProduct.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 448px"
                    className="object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-slate-400">
                    <RiImageLine className="size-14" />
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6">
                <DialogHeader>
                  <div className="flex items-start justify-between gap-2">
                    <DialogTitle className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
                      {selectedProduct.name}
                    </DialogTitle>
                  </div>
                </DialogHeader>

                {selectedProduct.subtitle && (
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                    {selectedProduct.subtitle}
                  </p>
                )}

                {selectedProduct.description && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 sm:mt-4 sm:text-sm dark:bg-slate-900 dark:text-slate-300">
                    {selectedProduct.description}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:pt-4 dark:border-slate-800">
                  <div>
                    <span className="block text-[11px] tracking-wider text-slate-500 uppercase sm:text-xs">
                      মূল্য
                    </span>
                    <span className="text-primary text-lg font-bold sm:text-xl">
                      {selectedProduct.price !== null && selectedProduct.price !== undefined
                        ? `৳ ${selectedProduct.price}`
                        : "যোগাযোগ করুন"}
                    </span>
                  </div>
                  <DialogClose
                    render={<Button variant="outline" size="sm" className="w-full sm:w-auto" />}
                  >
                    বন্ধ করুন
                  </DialogClose>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
