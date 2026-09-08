import AboutSection from "@/components/home/AboutSection";
import Choose from "@/components/home/Choose";
import Contact from "@/components/home/Contact";
import Hero from "@/components/home/Hero";
import ProductsGrid from "@/components/home/ProductsGrid";
import { getProducts } from "@/lib/products";

export default async function Home() {
  const products = await getProducts();

  return (
    <>
      <Hero />
      <Choose />
      <ProductsGrid initialProducts={products} />
      <AboutSection />
      <Contact />
    </>
  );
}
