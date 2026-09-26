"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X, ArrowRight } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 dark:bg-[#121214]/85 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo with wording */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/images/logo-with-wording.svg"
              alt="THARUUX-MD"
              width={180}
              height={40}
              className="h-8 sm:h-9 w-auto object-contain object-left transition-transform duration-200 group-hover:scale-[1.02]"
              priority
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/#features"
              className="text-[13px] font-medium tracking-wide text-zinc-600 hover:text-[#AE00FF] dark:text-zinc-300 dark:hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="/about"
              className="text-[13px] font-medium tracking-wide text-zinc-600 hover:text-[#AE00FF] dark:text-zinc-300 dark:hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="text-[13px] font-medium tracking-wide text-zinc-600 hover:text-[#AE00FF] dark:text-zinc-300 dark:hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="text-[13px] font-medium tracking-wide text-zinc-600 hover:text-[#AE00FF] dark:text-zinc-300 dark:hover:text-white transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-[13px] font-medium text-zinc-700 hover:text-[#AE00FF] dark:text-zinc-200 dark:hover:text-white transition-colors"
            >
              Client Portal
            </Link>
            <Link
              href="/contact?intent=request"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white text-[13px] font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <span>Request Bot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 dark:bg-[#121214]/95 backdrop-blur-2xl border-b border-zinc-200 dark:border-zinc-800 px-6 py-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <Link
            href="/#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:text-[#AE00FF] py-1"
          >
            Features
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:text-[#AE00FF] py-1"
          >
            About
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:text-[#AE00FF] py-1"
          >
            Pricing (LKR)
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:text-[#AE00FF] py-1"
          >
            Contact
          </Link>
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 font-medium text-zinc-800 dark:text-zinc-100 text-xs"
            >
              Client Portal Login
            </Link>
            <Link
              href="/contact?intent=request"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl bg-[#AE00FF] text-white font-semibold text-xs"
            >
              Request Your Bot
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
