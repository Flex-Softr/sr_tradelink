import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden bg-gray-50 py-20">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-30 blur-3xl" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
        {/* Image */}
        <div className="group relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-purple-500 to-blue-500 opacity-40 blur-2xl transition-all duration-700 group-hover:blur-3xl" />
          <div className="relative h-80 overflow-hidden rounded-3xl shadow-2xl transition-all duration-700 group-hover:scale-105 md:h-96">
            <Image
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f"
              alt="About SR Tradelinek"
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <h2 className="text-4xl leading-tight font-extrabold text-gray-900 md:text-5xl">
            আমাদের{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              দোকান সম্পর্কে
            </span>
          </h2>

          <p className="text-lg leading-relaxed text-gray-600">
            আমরা আধুনিক নকশা এবং উদ্ভাবনী কারুশিল্প সহ প্রিমিয়াম মানের পণ্য সরবরাহ করতে
            প্রতিশ্রুতিবদ্ধ। আমাদের লক্ষ্য হল উৎকর্ষতা প্রদান করা এবং আমাদের গ্রাহকদের সাথে
            দীর্ঘস্থায়ী আস্থা তৈরি করা।
          </p>

          <p className="leading-relaxed text-gray-600">
            বছরের পর বছর অভিজ্ঞতার মাধ্যমে, আমরা বিশ্বমানের জিনিসপত্র তৈরির শিল্পে দক্ষতা অর্জন
            করেছি যা সত্যিই আলাদা। প্রতিটি পণ্য সাবধানে নির্ভুলতা এবং আবেগের সাথে ডিজাইন করা হয়েছে।
          </p>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <Card className="shadow-lg transition duration-300 hover:shadow-xl">
              <CardContent className="p-5">
                <h3 className="text-primary text-3xl font-bold">২+</h3>
                <p className="text-muted-foreground">বছরের অভিজ্ঞতা</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg transition duration-300 hover:shadow-xl">
              <CardContent className="p-5">
                <h3 className="text-primary text-3xl font-bold">১৫০+</h3>
                <p className="text-muted-foreground">খুশি ক্লায়েন্ট</p>
              </CardContent>
            </Card>
          </div>

          <Button size="lg" className="mt-4 bg-gradient-to-r from-emerald-600 to-green-600">
            <a href="#contact">আরও জানুন</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
