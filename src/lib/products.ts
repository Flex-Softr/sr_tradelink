import { type Product, type ProductUnit, products as fallbackProducts } from "@/data/products";
import { prisma } from "@/lib/prisma";

export type { Product, ProductUnit };

export interface ProductInput {
  name: string;
  subtitle?: string | null;
  stock?: number | string | null;
  price?: number | string | null;
  description?: string | null;
  image?: string | null;
  badge?: string | null;
  unit?: ProductUnit | null;
}

export interface GetProductsOptions {
  search?: string;
  badge?: string;
  unit?: ProductUnit | string;
  limit?: number;
  skip?: number;
}

function parseStockValue(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return 0.0;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return isNaN(parsed) || parsed < 0 ? 0.0 : parsed;
}

function parsePriceValue(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return 0.0;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return isNaN(parsed) ? 0.0 : parsed;
}

function normalizeUnit(value: unknown): ProductUnit {
  if (value === "G") return "G";
  return "KG";
}

/**
 * Fetch products from database with search and filtering
 */
export async function getProducts(options: GetProductsOptions = {}): Promise<Product[]> {
  try {
    const whereClause: {
      AND?: Array<{
        OR?: Array<{
          name?: { contains: string; mode: "insensitive" };
          subtitle?: { contains: string; mode: "insensitive" };
          description?: { contains: string; mode: "insensitive" };
        }>;
        badge?: { equals: string; mode?: "insensitive" };
        unit?: { equals: ProductUnit };
      }>;
    } = {};

    const conditions = [];

    if (options.search?.trim()) {
      const term = options.search.trim();
      conditions.push({
        OR: [
          { name: { contains: term, mode: "insensitive" as const } },
          { subtitle: { contains: term, mode: "insensitive" as const } },
          { description: { contains: term, mode: "insensitive" as const } },
        ],
      });
    }

    if (options.badge?.trim() && options.badge !== "all" && options.badge !== "সকল") {
      conditions.push({
        badge: { equals: options.badge.trim() },
      });
    }

    if (options.unit && (options.unit === "KG" || options.unit === "G")) {
      conditions.push({
        unit: { equals: options.unit as ProductUnit },
      });
    }

    if (conditions.length > 0) {
      whereClause.AND = conditions;
    }

    const dbProducts = await prisma.product.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      take: options.limit,
      skip: options.skip,
    });

    if (dbProducts.length === 0 && !options.search && !options.badge && !options.unit) {
      return fallbackProducts;
    }

    return dbProducts.map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.subtitle,
      stock: p.stock,
      price: p.price,
      description: p.description,
      image: p.image,
      badge: p.badge,
      unit: p.unit,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
  } catch (error) {
    console.error("Error fetching products from database:", error);
    let result = [...fallbackProducts];
    if (options.search?.trim()) {
      const term = options.search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.subtitle && p.subtitle.toLowerCase().includes(term)) ||
          (p.description && p.description.toLowerCase().includes(term))
      );
    }
    if (options.badge?.trim() && options.badge !== "all" && options.badge !== "সকল") {
      result = result.filter((p) => p.badge === options.badge);
    }
    if (options.unit && (options.unit === "KG" || options.unit === "G")) {
      result = result.filter((p) => p.unit === options.unit);
    }
    return result;
  }
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      const fallback = fallbackProducts.find((p) => p.id === id);
      return fallback || null;
    }

    return {
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      stock: product.stock,
      price: product.price,
      description: product.description,
      image: product.image,
      badge: product.badge,
      unit: product.unit,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    const fallback = fallbackProducts.find((p) => p.id === id);
    return fallback || null;
  }
}

/**
 * Create a new product in the database
 */
export async function createProduct(input: ProductInput): Promise<Product> {
  const { name, subtitle, stock, price, description, image, badge, unit } = input;

  if (!name?.trim()) {
    throw new Error("পণ্যের নাম আবশ্যক");
  }

  const parsedStock = parseStockValue(stock);
  const parsedPrice = parsePriceValue(price);
  const normalizedUnit = normalizeUnit(unit);

  const newProduct = await prisma.product.create({
    data: {
      name: name.trim(),
      subtitle: subtitle?.trim() || null,
      stock: parsedStock,
      price: parsedPrice,
      description: description?.trim() || null,
      image: image?.trim() || null,
      badge: badge?.trim() ?? "",
      unit: normalizedUnit,
    },
  });

  return {
    id: newProduct.id,
    name: newProduct.name,
    subtitle: newProduct.subtitle,
    stock: newProduct.stock,
    price: newProduct.price,
    description: newProduct.description,
    image: newProduct.image,
    badge: newProduct.badge,
    unit: newProduct.unit,
    created_at: newProduct.created_at,
    updated_at: newProduct.updated_at,
  };
}

/**
 * Update an existing product
 */
export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  if (!id) {
    throw new Error("পণ্যের আইডি আবশ্যক");
  }

  const data: {
    name?: string;
    subtitle?: string | null;
    stock?: number | null;
    price?: number | null;
    description?: string | null;
    image?: string | null;
    badge?: string;
    unit?: ProductUnit;
  } = {};

  if (input.name !== undefined) data.name = input.name.trim();
  if (input.subtitle !== undefined) {
    data.subtitle = input.subtitle ? input.subtitle.trim() : null;
  }
  if (input.stock !== undefined) {
    data.stock = parseStockValue(input.stock);
  }
  if (input.price !== undefined) {
    data.price = parsePriceValue(input.price);
  }
  if (input.description !== undefined) {
    data.description = input.description ? input.description.trim() : null;
  }
  if (input.image !== undefined) {
    data.image = input.image ? input.image.trim() : null;
  }
  if (input.badge !== undefined) {
    data.badge = input.badge ? input.badge.trim() : "";
  }
  if (input.unit !== undefined) {
    data.unit = normalizeUnit(input.unit);
  }

  const updated = await prisma.product.update({
    where: { id },
    data,
  });

  return {
    id: updated.id,
    name: updated.name,
    subtitle: updated.subtitle,
    stock: updated.stock,
    price: updated.price,
    description: updated.description,
    image: updated.image,
    badge: updated.badge,
    unit: updated.unit,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}

export interface ProductTransaction {
  id: string;
  product_id: string;
  date: Date | string;
  kroyweight: number;
  kroyprice: number;
  dailysaleweight: number;
  dailysaleprice: number;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface ProductWithTransactions extends Product {
  transactions?: ProductTransaction[];
}

export interface ProductTransactionInput {
  product_id: string;
  date?: Date | string;
  kroyweight: number;
  kroyprice: number;
  dailysaleweight: number;
  dailysaleprice: number;
}

export interface MonthlyProductReport {
  saleWeight: number;
  salePrice: number;
  buyRate: number;
  profit: number;
}

/**
 * Calculate Monthly Product Data (Profit / Loss & Rates) matching legacy logic with exact division safety fixes
 */
export function calculateMonthlyProductData(
  transactions: ProductTransaction[] = [],
  selectedMonth: string
): MonthlyProductReport {
  // Filter for selected month (YYYY-MM)
  const monthTransactions = transactions.filter((t) => {
    const dStr = typeof t.date === "string" ? t.date : t.date ? new Date(t.date).toISOString() : "";
    return dStr.startsWith(selectedMonth);
  });

  let buyWeight = 0;
  let buyPrice = 0;
  let saleWeight = 0;
  let salePrice = 0;

  monthTransactions.forEach((t) => {
    buyWeight += Number(t.kroyweight || 0);
    buyPrice += Number(t.kroyprice || 0);
    saleWeight += Number(t.dailysaleweight || 0);
    salePrice += Number(t.dailysaleprice || 0);
  });

  let averageBuyRate = 0;

  if (buyWeight > 0) {
    averageBuyRate = buyPrice / buyWeight;
  } else {
    // If no purchase in selected month, look for the latest purchase before or overall
    const lastPurchase = [...transactions]
      .filter((t) => Number(t.kroyweight || 0) > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (lastPurchase && Number(lastPurchase.kroyweight || 0) > 0) {
      averageBuyRate = Number(lastPurchase.kroyprice || 0) / Number(lastPurchase.kroyweight);
    }
  }

  const averageSellRate = saleWeight > 0 ? salePrice / saleWeight : 0;

  const profit =
    saleWeight > 0 && averageBuyRate > 0 ? saleWeight * (averageSellRate - averageBuyRate) : 0;

  return {
    saleWeight: Number(saleWeight.toFixed(2)),
    salePrice: Number(salePrice.toFixed(2)),
    buyRate: Number(averageBuyRate.toFixed(2)),
    profit: Number(profit.toFixed(2)),
  };
}

/**
 * Fetch a single product with transactions by ID
 */
export async function getProductWithTransactions(
  id: string
): Promise<ProductWithTransactions | null> {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!product) {
      const fallback = fallbackProducts.find((p) => p.id === id);
      return fallback ? { ...fallback, transactions: [] } : null;
    }

    return {
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      stock: product.stock,
      price: product.price,
      description: product.description,
      image: product.image,
      badge: product.badge,
      unit: product.unit,
      created_at: product.created_at,
      updated_at: product.updated_at,
      transactions: product.transactions.map((t) => ({
        id: t.id,
        product_id: t.product_id,
        date: t.date,
        kroyweight: t.kroyweight,
        kroyprice: t.kroyprice,
        dailysaleweight: t.dailysaleweight,
        dailysaleprice: t.dailysaleprice,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
    };
  } catch (error) {
    console.error("Error fetching product with transactions:", error);
    const fallback = fallbackProducts.find((p) => p.id === id);
    return fallback ? { ...fallback, transactions: [] } : null;
  }
}

/**
 * Fetch all products with their transactions
 */
export async function getProductsWithTransactions(): Promise<ProductWithTransactions[]> {
  try {
    const products = await prisma.product.findMany({
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.subtitle,
      stock: p.stock,
      price: p.price,
      description: p.description,
      image: p.image,
      badge: p.badge,
      unit: p.unit,
      created_at: p.created_at,
      updated_at: p.updated_at,
      transactions: p.transactions.map((t) => ({
        id: t.id,
        product_id: t.product_id,
        date: t.date,
        kroyweight: t.kroyweight,
        kroyprice: t.kroyprice,
        dailysaleweight: t.dailysaleweight,
        dailysaleprice: t.dailysaleprice,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
    }));
  } catch (error) {
    console.error("Error fetching products with transactions:", error);
    return fallbackProducts.map((p) => ({ ...p, transactions: [] }));
  }
}

/**
 * Create a Product Transaction (Purchase / Daily Sale record)
 */
export async function createProductTransaction(
  input: ProductTransactionInput
): Promise<ProductTransaction> {
  const { product_id, date, kroyweight, kroyprice, dailysaleweight, dailysaleprice } = input;

  if (!product_id) {
    throw new Error("পণ্যের আইডি আবশ্যক");
  }

  const tx = await prisma.productTransaction.create({
    data: {
      product_id,
      date: date ? new Date(date) : new Date(),
      kroyweight: Number(kroyweight || 0),
      kroyprice: Number(kroyprice || 0),
      dailysaleweight: Number(dailysaleweight || 0),
      dailysaleprice: Number(dailysaleprice || 0),
    },
  });

  return {
    id: tx.id,
    product_id: tx.product_id,
    date: tx.date,
    kroyweight: tx.kroyweight,
    kroyprice: tx.kroyprice,
    dailysaleweight: tx.dailysaleweight,
    dailysaleprice: tx.dailysaleprice,
    created_at: tx.created_at,
    updated_at: tx.updated_at,
  };
}

/**
 * Update a Product Transaction
 */
export async function updateProductTransaction(
  id: string,
  input: Partial<ProductTransactionInput>
): Promise<ProductTransaction> {
  if (!id) {
    throw new Error("লেনদেন আইডি আবশ্যক");
  }

  const data: {
    date?: Date;
    kroyweight?: number;
    kroyprice?: number;
    dailysaleweight?: number;
    dailysaleprice?: number;
  } = {};

  if (input.date !== undefined) data.date = new Date(input.date);
  if (input.kroyweight !== undefined) data.kroyweight = Number(input.kroyweight);
  if (input.kroyprice !== undefined) data.kroyprice = Number(input.kroyprice);
  if (input.dailysaleweight !== undefined) data.dailysaleweight = Number(input.dailysaleweight);
  if (input.dailysaleprice !== undefined) data.dailysaleprice = Number(input.dailysaleprice);

  const tx = await prisma.productTransaction.update({
    where: { id },
    data,
  });

  return {
    id: tx.id,
    product_id: tx.product_id,
    date: tx.date,
    kroyweight: tx.kroyweight,
    kroyprice: tx.kroyprice,
    dailysaleweight: tx.dailysaleweight,
    dailysaleprice: tx.dailysaleprice,
    created_at: tx.created_at,
    updated_at: tx.updated_at,
  };
}

/**
 * Delete a Product Transaction
 */
export async function deleteProductTransaction(id: string): Promise<boolean> {
  if (!id) {
    throw new Error("লেনদেন আইডি আবশ্যক");
  }

  await prisma.productTransaction.delete({
    where: { id },
  });

  return true;
}

/**
 * Delete a product by ID
 */
export async function deleteProduct(id: string): Promise<boolean> {
  if (!id) {
    throw new Error("পণ্যের আইডি আবশ্যক");
  }

  await prisma.product.delete({
    where: { id },
  });

  return true;
}
