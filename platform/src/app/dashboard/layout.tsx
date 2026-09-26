"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  Sliders,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState({
    name: "Account",
    email: "",
    plan: "basic",
  });

  useEffect(() => {
    const stored =
      localStorage.getItem("tharuux_session_user") ||
      localStorage.getItem("tharuux_demo_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser({
          name: parsed.name || "Account",
          email: parsed.email || "",
          plan: parsed.plan || "basic",
        });
      } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("tharuux_session_user");
    localStorage.removeItem("tharuux_demo_user");
    router.push("/login");
  };

  const navLinks = [
    {
      name: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      name: "Connect WhatsApp",
      href: "/dashboard/connect",
      icon: QrCode,
      active: pathname === "/dashboard/connect",
    },
    {
      name: "Bot Settings",
      href: "/dashboard/settings",
      icon: Sliders,
      active: pathname === "/dashboard/settings",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-[#121214] border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/dashboard" className="flex items-center">
          <Image src="/images/logo-with-wording.svg" alt="THARUUX-MD" width={150} height={34} className="h-7 w-auto object-contain" />
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-zinc-600 dark:text-zinc-300"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#121214] border-r border-zinc-200 dark:border-zinc-800/80 p-6 flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-8">
          {/* Logo & Brand (No shadow on icon) */}
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center group">
              <Image src="/images/logo-with-wording.svg" alt="THARUUX-MD" width={160} height={36} className="h-8 w-auto object-contain" />
            </Link>
          </div>

          {/* User Account / Plan Badge */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#AE00FF] font-microma">
                {user.plan} Plan
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {user.name}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {user.email}
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    link.active
                      ? "bg-[#AE00FF] text-white font-semibold shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="tracking-wide">{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <span>Public Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
