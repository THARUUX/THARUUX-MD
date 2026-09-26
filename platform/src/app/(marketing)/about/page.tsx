import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Code2, ShieldCheck, Sparkles, Terminal, Cpu } from "lucide-react";

export const metadata = {
  title: "About THARUUX-MD & ZYNEX Developments",
  description: "Learn about the engineering and team behind THARUUX-MD WhatsApp Bot platform.",
};

export default function AboutPage() {
  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-20">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="relative h-10 w-52 sm:h-12 sm:w-64 mx-auto mb-2">
          <Image
            src="/images/logo-wording.png"
            alt="THARUUX-MD"
            fill
            className="object-contain"
            priority
          />
        </div>
        <span className="text-xs uppercase tracking-widest font-semibold text-[#AE00FF] font-microma">
          The Origin &amp; Vision
        </span>
        <h1 className="text-3xl sm:text-5xl font-normal tracking-tight text-[#1d1d1f] dark:text-white leading-tight font-microma uppercase">
          Engineered by THARUUX.
          <br />
          <span className="brand-gradient-text font-bold">Powered by ZYNEX.</span>
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
          THARUUX-MD was forged with a singular mission: to provide the most reliable, feature-rich, and seamless WhatsApp automation experience in Sri Lanka and worldwide.
        </p>
      </div>

      {/* Main Narrative Tile */}
      <div className="p-8 sm:p-14 rounded-[28px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#AE00FF]/10 text-[#AE00FF] text-xs font-semibold font-microma">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Built From The Ground Up</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white leading-snug font-microma">
            From experimental scripts to enterprise-grade cloud automation.
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed">
            What started as a personalized multi-device project evolved into a robust SaaS platform. Users no longer need to worry about server crashes, session corruptions, or complicated bash scripts.
          </p>
          <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed">
            With THARUUX-MD, everything is managed through a sleek visual dashboard where you can pair your device in seconds, customize alive messages, and tailor bot behaviors with zero code.
          </p>

          <div className="pt-4 flex flex-wrap gap-4">
            <a
              href="https://tharuux.lk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold hover:bg-zinc-200 transition-colors"
            >
              <span>Visit tharuux.lk</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href="https://zynexdev.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold hover:bg-zinc-200 transition-colors"
            >
              <span>Visit zynexdev.com</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>

        <div className="relative aspect-square max-w-sm mx-auto w-full rounded-2xl overflow-hidden border border-black/10 dark:border-white/10">
          <Image
            src="/images/logo.png"
            alt="THARUUX-MD Brand Emblem"
            fill
            className="object-cover"
          />
        </div>
      </div>

      {/* Tech Stack Matrix */}
      <div className="space-y-10">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-microma">
            Architecture &amp; Core Technology
          </h2>
          <p className="mt-2 text-xs text-zinc-500">
            Engineered with modern, resilient technologies for high availability.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white font-microma">Next.js 15 &amp; React</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Modern server components, server actions, and edge rendering for lightning-fast portal interactions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white font-microma">Supabase PostgreSQL</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Robust relational database with Row Level Security (RLS) guaranteeing user privacy and data isolation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white font-microma">Baileys Multi-Device</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Latest WhatsApp Web protocol with WebSocket persistence, QR handshakes, and phone number pairing.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white font-microma">Vercel &amp; Edge Cloud</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Global CDN edge caching and SSL encryption ensuring 99.9% uptime and zero latency worldwide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
