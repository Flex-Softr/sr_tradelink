import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: "🥛",
    title: "দুধ উৎপাদন বৃদ্ধি করে",
    description: "বৈজ্ঞানিকভাবে তৈরি খাদ্য যা প্রাকৃতিকভাবে দুধের উৎপাদন বৃদ্ধিতে সাহায্য করে।",
  },
  {
    icon: "🌾",
    title: "প্রিমিয়াম মানের উপকরণ",
    description: "আমরা শুধুমাত্র সেরা কাঁচামাল ব্যবহার করি—তাজা, নিরাপদ এবং পরীক্ষিত।",
  },
  {
    icon: "🚛",
    title: "দ্রুত এবং নির্ভরযোগ্য ডেলিভারি",
    description: "পাইকারি বা খুচরা—আপনার অর্ডারগুলি দ্রুত এবং নিরাপদে আপনার কাছে পৌঁছে যাবে।",
  },
  {
    icon: "🔍",
    title: "১০০% স্বচ্ছ গুণমান",
    description: "প্রতিটি ব্যাচ পরীক্ষা-নিরীক্ষা করা হয় - মানের সাথে কোনও আপস করা হয় না।",
  },
  {
    icon: "💰",
    title: "বাজারে সেরা দাম",
    description: "পাইকারি ও খুচরা মূল্য যা কৃষকদের সর্বোচ্চ মূল্য দেয়।",
  },
  {
    icon: "🤝",
    title: "১৫০+ কৃষকের বিশ্বস্ত",
    description: "ধারাবাহিক কর্মক্ষমতা সহ কৃষকদের সেবা করার বছরের অভিজ্ঞতা।",
  },
];

export default function Choose() {
  return (
    <section id="choose" className="relative bg-white py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,128,0,0.05),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-semibold">
            কেনো বাছাই করবেন
          </Badge>
          <h2 className="text-foreground mt-6 text-4xl font-bold lg:text-5xl">
            নির্ভরযোগ্য গবাদি পশুর খাদ্য যা আপনি নির্ভর করতে পারেন
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            এসআর ট্রেডলিংক উচ্চমানের খাদ্য নিশ্চিত করে যা গবাদি পশুর বৃদ্ধি বৃদ্ধি করে, দুধ উৎপাদন
            উন্নত করে এবং আপনার গবাদি পশুকে সুস্থ রাখে—স্বাভাবিকভাবেই।
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <CardContent className="p-8">
                <div className="bg-primary/10 mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-3xl">
                  {feature.icon}
                </div>
                <CardTitle className="mb-3 text-2xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
