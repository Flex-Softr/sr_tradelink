"use client";

import { useMemo, useState } from "react";

import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Product, products } from "@/data/products";

const ITEMS_PER_PAGE = 6;

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
      <div className="relative h-64 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="m-auto object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <Badge className="absolute top-4 left-4 shadow-lg">{product.badge}</Badge>
      </div>

      <CardContent className="p-7">
        <CardTitle className="mb-2 text-2xl">{product.name}</CardTitle>
        <CardDescription className="mb-4">{product.subtitle}</CardDescription>
        <p className="text-primary mt-2 mb-4 text-lg font-bold">{product.price}</p>

        <Button
          variant="outline"
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground w-full"
        >
          বিস্তারিত দেখুন
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ProductsGrid() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || p.subtitle.toLowerCase().includes(term)
    );
  }, [searchTerm]);

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
            placeholder="পণ্যের নাম লিখুন (Bangla / Banglish)"
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
              <ProductCard key={product.id} product={product} />
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
    </section>
  );
}
