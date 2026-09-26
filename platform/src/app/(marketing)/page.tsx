import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  QrCode,
  Smartphone,
  Bot,
  Layers,
  HeartHandshake,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Sliders,
  MessageSquare,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* =========================================================================
          HERO TILE: The Masterpiece (Light Parchment Canvas)
      ========================================================================= */}
      <section className="relative pt-10 pb-20 md:pt-16 md:pb-28 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center">
        {/* Subtle Brand Ambient Glow #AE00FF */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[350px] sm:w-[600px] h-[300px] bg-[#AE00FF]/15 blur-[130px] rounded-full pointer-events-none -z-10" />

        {/* Brand Wordmark Hero Showcase */}
        <div className="relative h-10 w-52 sm:h-14 sm:w-72 mb-6 mx-auto">
          <Image
            src="/images/logo-wording.png"
            alt="THARUUX-MD"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Top Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#AE00FF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#AE00FF]"></span>
          </span>
          <span className="font-microma text-[11px]">Next-Gen WhatsApp Engine</span>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <span className="text-[#AE00FF] font-semibold">Baileys v6</span>
        </div>

        {/* Signature Apple-Tight Headline with Microma */}
        <h1 className="max-w-4xl mx-auto text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#1d1d1f] dark:text-white leading-[1.1] font-microma uppercase">
          Automate WhatsApp.
          <br />
          <span className="brand-gradient-text font-bold">Autonomously 24/7.</span>
        </h1>

        {/* Tagline */}
        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
          The ultimate multi-device WhatsApp bot management platform. Control interactive group tools, auto-reactions, custom sticker packaging, and media downloads from one unified portal.
        </p>

        {/* Dual Button Grammar (Pill Primary in #AE00FF & Pearl Secondary) */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <Link
            href="/contact?intent=request"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white font-medium text-[14px] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span>Request Your Bot</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium text-[14px] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm"
          >
            <span>Pricing in LKR</span>
          </Link>
        </div>

        {/* Product Showcase Visual (Apple Elevation Shadow on product render) */}
        <div className="mt-12 sm:mt-16 w-full max-w-5xl mx-auto relative group">
          <div className="relative rounded-2xl overflow-hidden apple-shadow-lg border border-black/10 dark:border-white/10 bg-zinc-950">
            <Image
              src="/images/banner.png"
              alt="THARUUX-MD Bot Banner"
              width={1200}
              height={630}
              priority
              className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.01]"
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          KEY STATS STRIP
      ========================================================================= */}
      <section className="bg-white dark:bg-[#121214] border-y border-zinc-200 dark:border-zinc-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-2xl sm:text-3xl font-bold font-microma text-zinc-900 dark:text-white">99.9%</p>
            <p className="mt-1 text-xs text-zinc-500 font-medium">Socket Connection Uptime</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold font-microma text-[#AE00FF]">110+</p>
            <p className="mt-1 text-xs text-zinc-500 font-medium">Active Production Commands</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold font-microma text-zinc-900 dark:text-white">&lt; 250ms</p>
            <p className="mt-1 text-xs text-zinc-500 font-medium">Response Latency</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold font-microma text-[#AE00FF]">24 / 7</p>
            <p className="mt-1 text-xs text-zinc-500 font-medium">Autonomous Cloud Node</p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TILE 1: Dark Mode Canvas — Multi-Device Pairing
      ========================================================================= */}
      <section id="features" className="bg-[#272729] text-white py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest font-semibold text-[#D946EF] font-microma">
              Instant Connectivity
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-normal tracking-tight text-white leading-tight font-microma">
              Connect effortlessly.
              <br />
              <span className="text-zinc-400">QR Code or 8-Digit Pairing Code.</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
              No need to leave your phone connected to Wi-Fi. With Baileys Multi-Device protocol, your WhatsApp bot remains active independently 24 hours a day, 7 days a week.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-[18px] bg-[#1e1e20] border border-white/10 hover:border-[#AE00FF]/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#AE00FF]/15 text-[#AE00FF] flex items-center justify-center mb-6">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-microma">QR Scanning</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Scan directly from WhatsApp Linked Devices on your mobile. Your cryptographic session tokens are safely loaded in milliseconds.
              </p>
            </div>

            <div className="p-8 rounded-[18px] bg-[#1e1e20] border border-white/10 hover:border-[#AE00FF]/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#AE00FF]/15 text-[#AE00FF] flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-microma">Phone Pairing Code</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Enter your phone number and receive an instant 8-character pairing code notification directly inside your WhatsApp app.
              </p>
            </div>

            <div className="p-8 rounded-[18px] bg-[#1e1e20] border border-white/10 hover:border-[#AE00FF]/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#AE00FF]/15 text-[#AE00FF] flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-microma">Encrypted Cloud Storage</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Your auth credentials and session keys are secured in encrypted JSONB records in Supabase PostgreSQL, isolated with RLS.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TILE 2: Light Canvas — Complete Feature Suite
      ========================================================================= */}
      <section className="bg-[#f5f5f7] dark:bg-[#000000] py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest font-semibold text-[#AE00FF] font-microma">
              Intelligent Automation
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-normal tracking-tight text-[#1d1d1f] dark:text-white leading-tight font-microma">
              A comprehensive toolkit for power users.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Every setting can be customized from the client portal — no coding or terminal commands required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-8 rounded-[18px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow">
              <div className="w-10 h-10 rounded-lg bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center mb-5">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white font-microma">Auto Status Viewer</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 leading-relaxed">
                Automatically views incoming contact statuses and optionally leaves custom reaction emojis.
              </p>
            </div>

            <div className="p-8 rounded-[18px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow">
              <div className="w-10 h-10 rounded-lg bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center mb-5">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white font-microma">Custom Alive &amp; Audio</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 leading-relaxed">
                Configure your bot's personalized alive broadcast with custom image, audio title, author tag, and greeting text.
              </p>
            </div>

            <div className="p-8 rounded-[18px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow">
              <div className="w-10 h-10 rounded-lg bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center mb-5">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white font-microma">Sticker Branding</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 leading-relaxed">
                Every converted sticker carries your unique pack name and author tag (e.g. 🎯THARUUX-MD;THARUUX🍀).
              </p>
            </div>

            <div className="p-8 rounded-[18px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow">
              <div className="w-10 h-10 rounded-lg bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center mb-5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white font-microma">Anti-Call Shield</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 leading-relaxed">
                Block spam voice and video calls with automated polite rejections, preserving bot availability.
              </p>
            </div>

            <div className="p-8 rounded-[18px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow">
              <div className="w-10 h-10 rounded-lg bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center mb-5">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white font-microma">Public / Private Mode</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 leading-relaxed">
                Switch modes in a single click. Keep commands exclusive to you and your sudo administrators, or open to all groups.
              </p>
            </div>

            <div className="p-8 rounded-[18px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow">
              <div className="w-10 h-10 rounded-lg bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center mb-5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white font-microma">Interactive Group Tools</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 leading-relaxed">
                Tag all participants, kick spammers, manage mute schedules, and create automated welcome greetings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TILE 3: How Onboarding Works (Request -> Admin Contact -> Access)
      ========================================================================= */}
      <section className="bg-white dark:bg-[#121214] py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest font-semibold text-[#AE00FF] font-microma">
              Simple 3-Step Process
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-normal tracking-tight text-[#1d1d1f] dark:text-white leading-tight font-microma">
              How to get your THARUUX-MD Bot.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-12 h-12 rounded-full bg-[#AE00FF] text-white font-bold text-base flex items-center justify-center mb-6">
                1
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-microma">Submit Request</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 leading-relaxed">
                Fill in your contact details and desired subscription plan on the Request Bot form.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="w-12 h-12 rounded-full bg-[#C026D3] text-white font-bold text-base flex items-center justify-center mb-6">
                2
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-microma">Admin Verification</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 leading-relaxed">
                The admin reaches out via WhatsApp or Email, confirms payment, and provisions your dedicated portal credentials.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="w-12 h-12 rounded-full bg-[#EC4899] text-white font-bold text-base flex items-center justify-center mb-6">
                3
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-microma">Log In &amp; Connect</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 leading-relaxed">
                Sign into your client portal, scan the QR code or enter pairing code, and enjoy 24/7 automation!
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/contact?intent=request"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white font-semibold text-sm hover:scale-[1.02] transition-all"
            >
              <span>Get Started Now</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          BOTTOM CALL TO ACTION TILE
      ========================================================================= */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#272729] to-[#18181b] text-white text-center overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-2xl sm:text-4xl font-normal tracking-tight text-white leading-tight font-microma">
            Ready to elevate your WhatsApp communication?
          </h2>
          <p className="mt-5 text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto">
            Join users across Sri Lanka and worldwide who rely on THARUUX-MD for reliable, intelligent, and scalable WhatsApp automation.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact?intent=request"
              className="px-8 py-3.5 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white font-semibold text-sm transition-all"
            >
              Request Access
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3.5 rounded-full bg-transparent border border-white/20 text-white font-medium text-sm hover:bg-white/10 transition-all"
            >
              Explore Plans in LKR
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
