import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-gray-900 pt-20 pb-10 text-gray-300">
      {/* Floating Gradient Orbs */}
      <div className="absolute top-0 left-0 h-72 w-72 rounded-full bg-green-500/20 blur-3xl" />
      <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-lime-400/20 blur-3xl" />

      {/* Glassmorphism Top Border */}
      <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-green-400 via-lime-300 to-green-500 opacity-60" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Top Footer Content */}
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full">
                <Image
                  src="/images/sr-logo.jpeg"
                  alt="SR Tradelinek Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <h2 className="text-2xl font-bold text-white">এসআর ট্রেডলিংক</h2>
            </div>
            <p className="leading-relaxed text-gray-400">
              প্রিমিয়াম গবাদি পশুর খাদ্য, সাইলেজ, শস্য এবং খামারের পুষ্টি সরবরাহে আপনার বিশ্বস্ত
              অংশীদার।
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-xl font-semibold text-white">দ্রুত লিংক</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="cursor-pointer transition hover:text-white">আমাদের সম্পর্কে</li>
              <li className="cursor-pointer transition hover:text-white">পণ্য</li>
              <li className="cursor-pointer transition hover:text-white">গ্যালারি</li>
              <li className="cursor-pointer transition hover:text-white">যোগাযোগ</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="mb-4 text-xl font-semibold text-white">যোগাযোগের তথ্য</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>📍 ঝাড়বাড়ী, বীরগঞ্জ, দিনাজপুর</li>
              <li>📞 +880 1826147180</li>
              <li>✉️ noornabikhan100@gmail.com</li>
              <li>🕒 সকাল ৯:০০ - রাত ৯:০০</li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="mb-4 text-xl font-semibold text-white">নিউজ লেটার</h3>
            <p className="mb-4 text-sm text-gray-400">
              নতুন পণ্যের আগমনের আপডেট পেতে সাবস্ক্রাইব করুন।
            </p>

            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="আপনার ইমেল লিখুন"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md outline-none placeholder:text-gray-300"
              />
              <button className="rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700">
                যোগদান করুন
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-14 mb-8 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Bottom Footer */}
        <div className="flex flex-col items-center justify-between text-sm text-gray-400 md:flex-row">
          <p>
            &copy; {new Date().getFullYear()}{" "}
            <span className="font-semibold text-white">এসআর ট্রেডলিংক</span>. সর্বস্বত্ব সংরক্ষিত।
          </p>

          <div className="mt-4 flex gap-5 md:mt-0">
            <span className="cursor-pointer transition hover:text-white">গোপনীয়তা নীতি</span>
            <span className="cursor-pointer transition hover:text-white">শর্তাবলী</span>
            <span className="cursor-pointer transition hover:text-white">সমর্থন</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
