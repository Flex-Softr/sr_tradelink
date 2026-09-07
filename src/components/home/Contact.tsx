import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export default function Contact() {
  return (
    <section id="contact" className="bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-14 text-center">
          <Badge variant="secondary" className="mb-4 px-5 py-3 text-sm font-semibold">
            যোগাযোগ করুন
          </Badge>
          <h2 className="text-foreground mt-6 text-4xl font-bold">
            এসআর ট্রেডলিংকের সাথে যোগাযোগ করুন
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-lg">
            অর্ডারের ক্ষেত্রে আপনাকে সাহায্য করার জন্য আমরা সর্বদা এখানে আছি।
          </p>
        </div>

        {/* Content */}
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Contact Info */}
          <Card className="p-8 shadow-xl">
            <CardTitle className="mb-6 text-2xl">যোগাযোগের তথ্য</CardTitle>
            <CardContent className="p-0">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">📞</span>
                  <p className="text-primary text-lg">+88 01826147180</p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-3xl">✉️</span>
                  <p className="text-primary text-lg">noornabikhan100@gmail.com</p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-3xl">📍</span>
                  <p className="text-primary text-lg">ঝাড়বাড়ী, বীরগঞ্জ, দিনাজপুর</p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-3xl">🕒</span>
                  <p className="text-primary text-lg">সকাল ৯:০০ - রাত ৯:০০</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Map */}
          <div className="relative flex justify-center">
            <div className="absolute inset-0 rounded-[40px] border border-white/20 bg-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.15)] backdrop-blur-xl" />

            <div className="relative w-full max-w-6xl p-6">
              <h3 className="text-foreground mb-8 text-center text-3xl font-bold drop-shadow-sm">
                গুগল ম্যাপে আমাদের খুঁজুন
              </h3>

              <div className="relative h-[420px] overflow-hidden rounded-3xl border border-white/30 shadow-[0_10px_50px_rgba(0,0,0,25)]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d268.2009828345601!2d88.69285101239805!3d25.996551167496726!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39e4a37f4fd0d773%3A0x273a9c1da148e3cf!2z4Kau4KeH4Ka44Ka-4Kaw4KeN4Ka4IOCmsOCmvuCmuOCnh-CmsiDgpo_gpqjgp43gpqEg4KaX4Kar4KeB4KawIOCmn-CnjeCmsOCnh-CmoeCmvuCmsOCnjeCmuA!5e1!3m2!1sen!2sbd!4v1765088096212!5m2!1sen!2sbd"
                  width="100%"
                  height="100%"
                  className="rounded-3xl"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
