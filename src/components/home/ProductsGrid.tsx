"use client";

import { useMemo, useState } from "react";

import Image from "next/image";

import { Product, products } from "@/data/products";

import { Product, products } from "@/data/products";

const ITEMS_PER_PAGE = 6;

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
      <div className="relative h-64 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="m-auto object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <span className="absolute top-4 left-4 rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
          {product.badge}
        </span>
      </div>

      <div className="p-7">
        <h3 className="mb-2 text-2xl font-bold text-gray-900">{product.name}</h3>
        <p className="mb-4 text-sm text-gray-600">{product.subtitle}</p>
        <p className="mt-2 mb-4 text-lg font-bold text-green-700">{product.price}</p>

        <button className="w-full rounded-xl border border-green-600 py-3 font-semibold text-green-700 transition-all duration-300 hover:bg-green-600 hover:text-white">
          বিস্তারিত দেখুন
        </button>
      </div>
    </div>
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
    <section id="products" className="relative bg-gray-50 py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,128,0,0.06),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
            আমাদের পণ্য
          </span>
          <h2 className="mt-6 text-4xl font-bold text-gray-900 lg:text-5xl">
            প্রিমিয়াম গবাদি পশুর খাদ্য ক্যাটালগ
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            এস আর থেকে আমাদের উচ্চমানের গবাদি পশুর খাদ্য পণ্যের বিস্তৃত পরিসর ঘুরে দেখুন।
          </p>
        </div>

        {/* Search */}
        <div className="mb-14 flex justify-center">
          <input
            type="text"
            placeholder="পণ্যের নাম লিখুন (Bangla / Banglish)"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full max-w-xl rounded-2xl border border-gray-300 px-6 py-4 text-gray-700 shadow-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
        </div>

        {/* Products */}
        {displayedProducts.length === 0 ? (
          <p className="text-center text-lg text-gray-500">কোনো পণ্য পাওয়া যায়নি</p>
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
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 shadow-sm hover:bg-gray-100 disabled:opacity-40"
            >
              পূর্ববর্তী
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-xl bg-green-600 px-5 py-3 text-white shadow hover:bg-green-700 disabled:opacity-40"
            >
              আরও পণ্য দেখুন
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
