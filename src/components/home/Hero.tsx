import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section id="home" className="relative flex min-h-[90vh] items-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50" />

      {/* Container */}
      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left Text */}
          <div className="space-y-6 text-center sm:space-y-8 lg:text-left">
            <Badge variant="secondary" className="px-4 py-2 text-xs font-semibold sm:text-sm">
              প্রথম দিন থেকেই প্রিমিয়াম কোয়ালিটি
            </Badge>

            <h1 className="text-foreground text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl">
              আপনার পশুপালনের পুষ্টি,
              <span className="text-primary"> স্বাভাবিকভাবেই</span>
            </h1>

            <p className="text-muted-foreground mx-auto max-w-lg text-base leading-relaxed sm:text-lg lg:mx-0">
              এসআর ট্রেডলিংক প্রিমিয়াম গবাদি পশুর খাদ্য সমাধান প্রদান করে যা স্বাস্থ্য, উৎপাদনশীলতা
              এবং বৃদ্ধি বৃদ্ধি করে। অঞ্চলজুড়ে কৃষকদের কাছে এটির গুণমান নিজেই কথা বলে।
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Button size="lg" className="shadow-md">
                <a href="#products">পণ্যগুলি অন্বেষণ করুন</a>
              </Button>
              <Button variant="outline" size="lg" className="border-primary text-primary shadow-md">
                <a href="#contact">যোগাযোগ করুন</a>
              </Button>
            </div>

            {/* Stats */}
            <div className="border-border mx-auto grid grid-cols-3 gap-4 border-t pt-6 sm:gap-6 sm:pt-8 md:mx-0 md:max-w-md">
              <div className="text-center lg:text-left">
                <p className="text-primary text-2xl font-bold sm:text-3xl">১৫০+</p>
                <p className="text-muted-foreground text-xs sm:text-sm">খুশি কৃষকরা</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-primary text-2xl font-bold sm:text-3xl">৮০+</p>
                <p className="text-muted-foreground text-xs sm:text-sm">পণ্যসমূহ</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-primary text-2xl font-bold sm:text-3xl">২+</p>
                <p className="text-muted-foreground text-xs sm:text-sm">বছরের অভিজ্ঞতা</p>
              </div>
            </div>
          </div>

          {/* Right Side Image */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="h-60 w-60 rotate-3 rounded-3xl bg-gradient-to-br from-green-600 to-emerald-700 shadow-2xl transition-transform duration-500 hover:rotate-0 sm:h-72 sm:w-72 md:h-80 md:w-80 lg:h-96 lg:w-96" />

            {/* Logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-40 w-40 -rotate-3 overflow-hidden rounded-2xl shadow-xl transition-transform duration-500 hover:rotate-0 sm:h-56 sm:w-56 md:h-64 md:w-64">
                <Image
                  src="/images/n-r.jpg"
                  alt="SR Logo"
                  fill
                  sizes="(max-width: 640px) 160px, (max-width: 768px) 224px, 256px"
                  className="object-cover"
                  style={{ objectPosition: "center 30%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
