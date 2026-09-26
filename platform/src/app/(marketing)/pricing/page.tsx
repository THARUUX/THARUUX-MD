import Link from "next/link";
import { Check, HelpCircle, ArrowRight, Sparkles } from "lucide-react";

export const metadata = {
  title: "Pricing Plans in LKR",
  description: "Flexible, transparent pricing for THARUUX-MD WhatsApp Bot. Starting at LKR 500/month.",
};

const plans = [
  {
    name: "Basic",
    price: "500",
    description: "Affordable 24/7 automation for individual users. Runs smoothly with fixed standard THARUUX branding.",
    badge: "Essential",
    features: [
      "1 Dedicated Bot Instance (24/7 Cloud)",
      "All 110+ Advanced Commands",
      "Media Downloader (YouTube, TikTok, FB, IG)",
      "Multi-Device QR & Pairing Code Access",
      "Standard Anti-Call Reject Shield",
      "🔒 Fixed '.' Prefix (Customization Locked)",
      "🔒 Standard THARUUX-MD System Branding",
      "🔒 Configuration Editing Disabled",
      "99.5% Uptime Guarantee",
    ],
    cta: "Request Basic",
    planKey: "basic",
    popular: false,
  },
  {
    name: "Premium",
    price: "1,500",
    description: "The complete suite with full branding freedom. Customize bot names, prefixes, alive media, and audio artwork.",
    badge: "Most Popular",
    features: [
      "1 Dedicated Bot Instance (High-Priority Node)",
      "All 110+ Advanced Commands",
      "✨ Full Bot Branding & Configuration Control",
      "✨ Custom Bot Name & Custom Prefix",
      "✨ Custom Alive Message & Custom Photo Banner",
      "✨ Custom Sticker Pack Name & Author Tag",
      "✨ Custom Audio Artwork & Title/Artist Metadata",
      "✨ Custom Call Rejection Notice Message",
      "Auto Status Viewer & Smart Reactions",
      "Priority WhatsApp Direct Support",
      "99.9% Uptime Guarantee",
    ],
    cta: "Request Premium",
    planKey: "premium",
    popular: true,
  },
];

const faqs = [
  {
    q: "How does payment and onboarding work?",
    a: "After you submit a request with your preferred plan, the admin (THARUUX) will contact you directly via WhatsApp or Email. We support Sri Lankan Local Bank Transfers (Commercial Bank, Sampath, BOC, HNB), FriMi, eZ Cash, and USDT/Crypto. Once payment is confirmed, your account is provisioned instantly.",
  },
  {
    q: "Do I need to keep my computer or phone turned on?",
    a: "No! THARUUX-MD runs 24/7 on dedicated cloud infrastructure. Once you scan the QR code or link with your pairing code, the bot continues running even if your phone is turned off or has no internet connection.",
  },
  {
    q: "Can I customize the bot's messages and sticker author?",
    a: "Yes! In your client portal, you can customize the bot name, prefix, alive broadcast banner, audio title, author, and sticker pack information at any time.",
  },
  {
    q: "Can I upgrade or extend my subscription later?",
    a: "Absolutely. You can request a plan upgrade or extend your activation period at any point through the portal or by contacting the admin directly.",
  },
];

export default function PricingPage() {
  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
        <span className="text-xs uppercase tracking-widest font-semibold text-[#AE00FF] font-microma">
          Transparent Pricing in LKR
        </span>
        <h1 className="mt-3 text-3xl sm:text-5xl font-normal tracking-tight text-[#1d1d1f] dark:text-white leading-tight font-microma">
          Pick the right plan for your bot.
        </h1>
        <p className="mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
          No hidden fees. Cloud hosted 24/7 with zero maintenance headache.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto mb-24">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col justify-between p-8 sm:p-10 rounded-[24px] transition-all duration-300 ${
              plan.popular
                ? "bg-white dark:bg-[#18181b] border-2 border-[#AE00FF] scale-100 lg:scale-[1.03]"
                : "bg-white/80 dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow"
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#AE00FF] text-white text-[10px] font-bold tracking-wider uppercase font-microma">
                {plan.badge}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white font-microma">{plan.name}</h3>
                {plan.popular && <Sparkles className="w-5 h-5 text-[#AE00FF]" />}
              </div>
              <p className="text-xs text-zinc-500 min-h-[40px] leading-relaxed">{plan.description}</p>

              <div className="mt-6 mb-8 flex items-baseline gap-1">
                <span className="text-xs font-semibold text-zinc-400 uppercase">LKR</span>
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white font-microma">
                  {plan.price}
                </span>
                <span className="text-xs text-zinc-500">/ month</span>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4 font-microma">
                  What's included:
                </p>
                <ul className="space-y-3.5 text-xs">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300">
                      <Check className="w-4 h-4 text-[#AE00FF] shrink-0 mt-0.5" />
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10 pt-6">
              <Link
                href={`/contact?intent=request&plan=${plan.planKey}`}
                className={`w-full py-3.5 px-6 rounded-full font-semibold text-xs uppercase tracking-wider font-microma flex items-center justify-center gap-2 transition-all ${
                  plan.popular
                    ? "bg-[#AE00FF] hover:bg-[#9600DC] text-white"
                    : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
                }`}
              >
                <span>{plan.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* FAQs Section */}
      <div className="max-w-4xl mx-auto pt-16 border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-center mb-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-microma">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-xs text-zinc-500">
            Everything you need to know about payments, setup, and support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-2"
            >
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-white flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-[#AE00FF] mt-0.5 shrink-0" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 pl-6 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
