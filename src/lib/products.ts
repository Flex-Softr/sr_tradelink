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
