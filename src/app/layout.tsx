import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono, Inter } from "next/font/google";

import BackToTop from "@/components/home/BackToTop";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

import "./globals.css";

const interHeading = Inter({ subsets: ["latin"], variable: "--font-heading" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "এসআর ট্রেডলিংক | SR Tradelink",
  description:
    "প্রিমিয়াম গবাদি পশুর খাদ্য, সাইলেজ, শস্য এবং খামারের পুষ্টি সরবরাহে আপনার বিশ্বস্ত অংশীদার",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bn"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        dmSans.variable,
        interHeading.variable
      )}
    >
      <body className="flex min-h-full flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <BackToTop />
      </body>
    </html>
  );
}
