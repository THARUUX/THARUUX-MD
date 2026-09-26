import Link from "next/link";
import Image from "next/image";
import { Shield, Cpu, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#f5f5f7] dark:bg-[#121214] border-t border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Footnote Legal Disclaimers (Apple Style) */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8 mb-12 space-y-3 text-[11px] leading-relaxed text-zinc-500">
          <p>
            * THARUUX-MD WhatsApp Automation platform is an independent software solution developed by ZYNEX Developments and THARUUX. WhatsApp is a registered trademark of Meta Platforms, Inc. This product is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc.
          </p>
          <p>
            ** Bot uptime, multi-device socket stability, and media speed depend on your network quality and WhatsApp server availability. Fair usage policies apply to all subscription tiers.
          </p>
        </div>

        {/* Directory Link Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
          {/* Column 1: Platform */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100 font-microma">Product &amp; Bot</h4>
            <ul className="space-y-2.5 text-[12px]">
              <li>
                <Link href="/#features" className="hover:text-[#AE00FF] dark:hover:text-white transition-colors">
                  Core Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#AE00FF] dark:hover:text-white transition-colors">
                  Plans &amp; Pricing (LKR)
                </Link>
              </li>
              <li>
                <Link href="/contact?intent=request" className="hover:text-[#AE00FF] dark:hover:text-white transition-colors">
                  Request a Bot
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#AE00FF] dark:hover:text-white transition-colors">
                  Client Portal
                </Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Baileys Multi-Device v6
                </span>
              </li>
            </ul>
          </div>

          {/* Column 2: Solutions */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100 font-microma">Automation</h4>
            <ul className="space-y-2.5 text-[12px]">
              <li>
                <Link href="/#features" className="hover:text-[#AE00FF] dark:hover:text-white transition-colors">
                  Auto Status Viewer
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[#AE00FF] dark:hover:text-white transition-colors">
                  Smart AI Responses
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[#AE00FF] dark:hover:text-white transition-colors">
                  Group Administration
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[#AE00FF] dark:hover:text-white transition-colors">
                  Media &amp; Sticker Studio
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[#AE00FF] dark:hover:text-white transition-colors">
                  Call Rejection Guard
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100 font-microma">Organization</h4>
            <ul className="space-y-2.5 text-[12px]">
              <li>
                <Link href="/about" className="hover:text-[#AE00FF] dark:hover:text-white transition-colors">
                  About THARUUX-MD
                </Link>
              </li>
              <li>
                <a
                  href="https://tharuux.lk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#AE00FF] dark:hover:text-white transition-colors"
                >
                  <span>tharuux.lk</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://zynexdev.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#AE00FF] dark:hover:text-white transition-colors"
                >
                  <span>zynexdev.com</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#AE00FF] dark:hover:text-white transition-colors">
                  Contact Founder
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support & Security */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100 font-microma">Trust &amp; Security</h4>
            <ul className="space-y-2.5 text-[12px]">
              <li className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Shield className="w-3.5 h-3.5 text-[#AE00FF]" />
                <span>Encrypted Sessions</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Cpu className="w-3.5 h-3.5 text-[#AE00FF]" />
                <span>Supabase PostgreSQL</span>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#AE00FF] dark:hover:text-white transition-colors">
                  WhatsApp Support Helpline
                </Link>
              </li>
              <li>
                <span className="text-zinc-500">24/7 Monitoring</span>
              </li>
            </ul>
          </div>

          {/* Column 5: Brand Card (No shadow on icon) */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 p-4 rounded-2xl bg-zinc-200/50 dark:bg-zinc-800/40 border border-zinc-300/40 dark:border-zinc-700/50 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative w-6 h-6">
                  <Image
                    src="/images/icon.png"
                    alt="THARUUX"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="relative h-4 w-28">
                  <Image
                    src="/images/logo-wording.png"
                    alt="THARUUX-MD"
                    fill
                    className="object-contain object-left"
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 leading-snug">
                Sri Lanka's leading high-reliability WhatsApp automation engine.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <span className="text-[11px] font-semibold text-[#AE00FF] dark:text-[#C547FF]">
                Developed in Sri Lanka 🇱🇰
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-zinc-500 text-[12px]">
            <span>
              Copyright &copy; {new Date().getFullYear()} THARUUX-MD. All rights reserved.
            </span>
            <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">&bull;</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Powered by <strong className="text-[#AE00FF] dark:text-[#C547FF] font-semibold">THARUUX</strong> &amp;{" "}
              <strong className="text-[#AE00FF] dark:text-[#C547FF] font-semibold">ZYNEX Developments</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
            <a
              href="https://tharuux.lk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#AE00FF] transition-colors"
            >
              tharuux.lk
            </a>
            <span>|</span>
            <a
              href="https://zynexdev.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#AE00FF] transition-colors"
            >
              zynexdev.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
