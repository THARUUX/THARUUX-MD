import { Suspense } from "react";
import ContactForm from "@/components/marketing/ContactForm";
import { Mail, Phone, Globe, Shield, MessageCircle, Clock } from "lucide-react";

export const metadata = {
  title: "Request Bot & Contact Admin",
  description: "Request your THARUUX-MD WhatsApp Bot or contact the development team directly.",
};

export default function ContactPage() {
  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase tracking-widest font-semibold text-purple-600 dark:text-purple-400">
          Direct Onboarding & Support
        </span>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-apple-tight text-[#1d1d1f] dark:text-white leading-tight">
          Request your bot today.
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
          Accounts are provisioned and activated by our team following security review and configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Side: Contact Information & Trust signals */}
        <div className="lg:col-span-5 space-y-8">
          <div className="p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Admin Direct Channels</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Prefer direct instant messaging? Reach out to THARUUX on these official channels:
            </p>

            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">WhatsApp Direct</p>
                  <p className="font-semibold">+94 78 973 1507</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                <div className="w-9 h-9 rounded-lg bg-fuchsia-500/10 text-fuchsia-600 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Email Support</p>
                  <p className="font-semibold">contact@tharuux.lk</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                <div className="w-9 h-9 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Official Websites</p>
                  <p className="font-semibold">tharuux.lk &bull; zynexdev.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-[24px] bg-gradient-to-br from-purple-900/40 via-purple-950/20 to-zinc-900 border border-purple-500/20 text-white space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
              <Clock className="w-5 h-5" />
              <span className="text-xs uppercase tracking-wider font-bold">Fast Activation</span>
            </div>
            <h3 className="text-lg font-bold">Provisioned within 30 Minutes</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Once payment and setup preferences are verified with the admin, your account is immediately activated with your allocated validity period.
            </p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="lg:col-span-7">
          <Suspense fallback={<div className="p-12 text-center text-zinc-400">Loading form...</div>}>
            <ContactForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
