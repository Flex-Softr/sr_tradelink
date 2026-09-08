export type ProductUnit = "KG" | "G";

/**
 * Product definition matching Prisma Product model
 */
export interface Product {
  id: string;
  name: string;
  subtitle?: string | null;
  stock?: number | null;
  price?: number | null;
  description?: string | null;
  image?: string | null;
  badge?: string | null;
  unit?: ProductUnit | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface LegacyProduct {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  image: string;
  badge: string;
}

const rawLegacyProducts: LegacyProduct[] = [
  {
    id: "6a8547a7e362a9ce30f6a881",
    name: "Sorisa Khoil",
    subtitle: "Premium performance blend",
    price: "55kg",
    image: "https://i.ibb.co.com/GfbmGLGj/sorisa-khoil.jpg",
    badge: "Farmer's Choice",
  },
  {
    id: "6a8547a7e362a9ce30f6a882",
    name: "Medicine",
    subtitle: "Improves cattle immunity",
    price: "900 per pack",
    image: "https://i.ibb.co.com/4gFYRKWV/medicine.jpg",
    badge: "Hot",
  },
  {
    id: "6a8547a7e362a9ce30f6a887",
    name: "Fish Feed",
    subtitle: "Essential minerals for fish health",
    price: "60kg",
    image: "https://i.ibb.co.com/6c9tc1sw/fish-feed.jpg",
    badge: "Farmer's Choice",
  },
  {
    id: "6a8547a7e362a9ce30f6a88e",
    name: "Musur Vanga",
    subtitle: "Better digestion & energy",
    price: "55kg",
    image: "https://i.ibb.co.com/N2KPWqfV/mushur-gorur.jpg",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a894",
    name: "Zinc",
    subtitle: "Better digestion & energy",
    price: "120kg",
    image: "https://i.ibb.co.com/msDSyT4/zinc.webp",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a88c",
    name: "Maskalai",
    subtitle: "Better digestion & energy",
    price: "150kg",
    image: "https://i.ibb.co.com/pj65Bfh4/Maskalai.jpg",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a88d",
    name: "Pakhir Mix",
    subtitle: "Better digestion & energy",
    price: "50kg",
    image: "https://i.ibb.co.com/6Lykrpc/pakhi-mix.jpg",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a884",
    name: "DRB - Bran",
    subtitle: "Essential minerals for cattle health",
    price: "35kg",
    image: "https://i.ibb.co.com/p77HQgt/Bran.jpg",
    badge: "Farmer's Choice",
  },
  {
    id: "6a8547a7e362a9ce30f6a885",
    name: "Broyler Feed",
    subtitle: "Improves cattle immunity",
    price: "70kg",
    image: "https://i.ibb.co.com/WpGZQHmY/broyler-feed.jpg",
    badge: "Recommended",
  },
  {
    id: "6a8547a7e362a9ce30f6a88f",
    name: "Vuttar Atta",
    subtitle: "Better digestion & energy",
    price: "35kg",
    image: "https://i.ibb.co.com/VXzF8FY/vuttar-atta.webp",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a890",
    name: "Dabli But",
    subtitle: "Better digestion & energy",
    price: "50kg",
    image: "https://i.ibb.co.com/LzFfzNKq/Dabli-but.jpg",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a88a",
    name: "khudi",
    subtitle: "Better digestion & energy",
    price: "35kg",
    image: "https://i.ibb.co.com/s93S1QbZ/khud.jpg",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a880",
    name: "Soyameel vhusi-soyahance",
    subtitle: "Premium performance blend",
    price: "50kg",
    image: "https://i.ibb.co.com/HfFTmWc6/soyameel-vushi.jpg",
    badge: "Premium",
  },
  {
    id: "6a8547a7e362a9ce30f6a883",
    name: "Protin Mix",
    subtitle: "Better digestion & energy",
    price: "90kg",
    image: "https://i.ibb.co.com/RqV8Z8V/Protin.jpg",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a87c",
    name: "Vhusi",
    subtitle: "High-nutrition Mota Vhusi",
    price: "50kg",
    image: "https://i.ibb.co.com/3536M3HJ/vhisi.jpg",
    badge: "Hot",
  },
  {
    id: "6a8547a7e362a9ce30f6a87d",
    name: "Chola Vhusi",
    subtitle: "High-nutrition Chola Vhusi",
    price: "60kg",
    image: "https://i.ibb.co.com/4RpYBxvj/chola-vushi.jpg",
    badge: "Hot",
  },
  {
    id: "6a8547a7e362a9ce30f6a895",
    name: "Mix vhusi",
    subtitle: "Better digestion & energy",
    price: "50kg",
    image: "https://i.ibb.co.com/Nnbkkb0z/product-1.webp",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a886",
    name: "Zero Feed",
    subtitle: "Better digestion & energy",
    price: "50kg",
    image: "https://i.ibb.co.com/3mq5YDg3/house-feed.jpg",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a893",
    name: "Karpet",
    subtitle: "Better digestion & energy",
    price: "850 per pack",
    image: "https://i.ibb.co.com/1GG4Z8wC/karpet.jpg",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a87f",
    name: "Soyameel",
    subtitle: "High-nutrition Soyameel",
    price: "70kg",
    image: "https://i.ibb.co.com/v4WTJf0M/Soyameel.jpg",
    badge: "Hot",
  },
  {
    id: "6a8547a7e362a9ce30f6a891",
    name: "Deshi Chola But",
    subtitle: "Better digestion & energy",
    price: "90kg",
    image: "https://i.ibb.co.com/DPJG82Jr/Chula-But.jpg",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a87e",
    name: "Akari Dhan",
    subtitle: "Boosts healthy calf growth",
    price: "20kg",
    image: "https://i.ibb.co.com/bMXTyD0B/dhaner-akari.jpg",
    badge: "Hot",
  },
  {
    id: "6a8547a7e362a9ce30f6a888",
    name: "Meet Cow Feed",
    subtitle: "Improves cattle immunity",
    price: "60kg",
    image: "https://i.ibb.co.com/KzjyWP4P/meet-feed.jpg",
    badge: "Recommended",
  },
  {
    id: "6a8547a7e362a9ce30f6a889",
    name: "Milk Cow Feed",
    subtitle: "Better digestion & energy",
    price: "60kg",
    image: "https://i.ibb.co.com/wrjknL9q/milk-feed.jpg",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a88b",
    name: "Musur Dal",
    subtitle: "Better digestion & energy",
    price: "90kg",
    image: "https://i.ibb.co.com/spsYzxbX/musur-dal.jpg",
    badge: "Balanced",
  },
  {
    id: "6a8547a7e362a9ce30f6a892",
    name: "Rice",
    subtitle: "Better digestion & energy",
    price: "70kg",
    image: "https://i.ibb.co.com/WNM0HHJT/chal.jpg",
    badge: "Balanced",
  },
  {
    id: "6a85e0065dbe2cce76ff4d0e",
    name: "Mix Vushi",
    subtitle: "Better energy protin mix vushi",
    price: "50kg",
    image: "https://i.ibb.co.com/bMRGcyTY/mix-vusi.jpg",
    badge: "Hot",
  },
];

export { rawLegacyProducts };

/**
 * @deprecated Legacy static product list with updated schema compatibility.
 */
export const products: Product[] = rawLegacyProducts.map((p) => ({
  id: p.id,
  name: p.name,
  subtitle: p.subtitle,
  stock: 50,
  price: parseFloat(p.price.replace(/[^0-9.]/g, "")) || 0,
  description: `${p.name} - ${p.subtitle}। উচ্চমানের প্রিমিয়াম গবাদি পশু খাদ্য।`,
  image: p.image,
  badge: p.badge,
  unit: "KG",
}));
