"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldAlert,
  Users,
  Inbox,
  Settings,
  Bell,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tharuux_session_user");
      if (!stored) {
        router.replace("/login?redirect=" + encodeURIComponent(pathname));
        return;
      }
      const u = JSON.parse(stored);
      if (u?.role !== "admin") {
        router.replace("/login?error=admin_required");
        return;
      }
      setAuthorized(true);
    } catch {
      router.replace("/login");
    } finally {
      setChecking(false);
    }
  }, [pathname, router]);

  const handleLogout = async () => {
    localStorage.removeItem("tharuux_session_user");
    localStorage.removeItem("tharuux_demo_user");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.replace("/login");
  };

  const navLinks = [
    {
      name: "Dashboard Overview",
      href: "/admin",
      icon: ShieldAlert,
      active: pathname === "/admin",
    },
    {
      name: "User Management",
      href: "/admin/users",
      icon: Users,
      active: pathname === "/admin/users",
    },
    {
      name: "Bot Requests",
      href: "/admin/requests",
      icon: Inbox,
      active: pathname === "/admin/requests",
    },
    {
      name: "Global Bot Config",
      href: "/admin/config",
      icon: Settings,
      active: pathname === "/admin/config",
    },
    {
      name: "Push Notifications",
      href: "/admin/notifications",
      icon: Bell,
      active: pathname === "/admin/notifications",
    },
  ];

  if (checking || !authorized) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#AE00FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-500 font-microma uppercase tracking-wider">Verifying Admin Access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-[#121214] border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/admin" className="flex items-center">
          <Image src="/images/logo-with-wording.svg" alt="THARUUX-MD" width={150} height={34} className="h-7 w-auto object-contain" />
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-zinc-600 dark:text-zinc-300"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#121214] border-r border-zinc-200 dark:border-zinc-800/80 p-6 flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-8">
          {/* Logo & Admin Indicator */}
          <div>
            <Link href="/" className="flex items-center group">
              <Image src="/images/logo-with-wording.svg" alt="THARUUX-MD" width={160} height={36} className="h-8 w-auto object-contain" />
            </Link>
            <div className="mt-2.5 text-[10px] text-[#AE00FF] font-bold tracking-wider uppercase flex items-center gap-1 font-microma">
              <ShieldAlert className="w-3 h-3" />
              <span>Admin Control Panel</span>
            </div>
          </div>

          {/* Admin Profile Tag */}
          <div className="p-3.5 rounded-2xl bg-[#AE00FF]/10 border border-[#AE00FF]/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-bold text-[#AE00FF] font-microma">
                THARUUX (Super Admin)
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">Master access &amp; billing control</p>
          </div>

          {/* Nav List */}
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
                      ? "bg-[#AE00FF] text-white font-semibold shadow-sm font-microma"
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

        {/* Exit & Logout */}
        <div className="space-y-2 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <Link
            href="/dashboard"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <span>User Dashboard View</span>
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

      {/* Admin Content Area */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
