"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Inbox,
  CreditCard,
  Activity,
  ArrowRight,
  MessageCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { formatCurrencyLKR } from "@/lib/utils";

export default function AdminOverviewPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeBots: 0,
    pendingRequests: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, reqsRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/requests"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.stats) setStats(statsData.stats);
        }

        if (reqsRes.ok) {
          const reqsData = await reqsRes.json();
          if (reqsData.requests) setRequests(reqsData.requests.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to load admin overview data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-microma uppercase">
            Admin Master Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time live overview of user requests, active subscriptions, revenue in LKR, and platform health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/users?action=new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white text-xs font-semibold shadow-sm hover:scale-[1.02] transition-all font-microma"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Create User Account</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-[22px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-microma">Total Users</span>
            <Users className="w-4 h-4 text-[#AE00FF]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-microma">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-[#AE00FF]" /> : stats.totalUsers}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">
            {stats.activeBots} active subscriptions
          </p>
        </div>

        <div className="p-6 rounded-[22px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-microma">Pending Leads</span>
            <Inbox className="w-4 h-4 text-[#C026D3]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-microma">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-[#C026D3]" /> : stats.pendingRequests}
          </p>
          <p className="text-[11px] text-[#AE00FF] font-medium">Awaiting contact / payment</p>
        </div>

        <div className="p-6 rounded-[22px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-microma">Monthly Revenue</span>
            <CreditCard className="w-4 h-4 text-[#EC4899]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-microma">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-[#EC4899]" /> : formatCurrencyLKR(stats.monthlyRevenue)}
          </p>
          <p className="text-[11px] text-zinc-400">Calculated from active plans</p>
        </div>

        <div className="p-6 rounded-[22px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-microma">Bot Nodes Online</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-microma">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" /> : `${stats.activeBots} / ${stats.totalUsers || 1}`}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">
            {stats.totalUsers > 0 ? `${Math.round((stats.activeBots / stats.totalUsers) * 100)}% operational` : "System ready"}
          </p>
        </div>
      </div>

      {/* Pending Bot Requests Table */}
      <div className="p-6 sm:p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white font-microma uppercase">
              Recent Onboarding Requests
            </h2>
            <p className="text-xs text-zinc-500">
              Users who submitted the request form. Contact them via WhatsApp to verify payment and issue credentials.
            </p>
          </div>
          <Link
            href="/admin/requests"
            className="text-xs font-semibold text-[#AE00FF] hover:text-[#9600DC] flex items-center gap-1 font-microma"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="py-8 text-center text-zinc-400 text-xs font-microma">
            No pending requests found in the database.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {requests.map((req) => (
              <div
                key={req.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-zinc-900 dark:text-white font-microma">{req.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#AE00FF]/10 text-[#AE00FF] text-[10px] font-bold font-microma uppercase">
                      {req.plan_interest}
                    </span>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(req.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {req.email} &bull; <span className="font-mono text-zinc-700 dark:text-zinc-300">+{req.phone}</span>
                  </p>
                  {req.message && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                      "{req.message}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${req.phone}?text=Hello%20${encodeURIComponent(
                      req.name
                    )},%20this%20is%20THARUUX%20from%20THARUUX-MD.%20We%20received%20your%20request%20for%20the%20${encodeURIComponent(
                      req.plan_interest
                    )}%20plan.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-colors font-microma"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Contact</span>
                  </a>

                  <Link
                    href={`/admin/users?action=new&name=${encodeURIComponent(req.name)}&email=${encodeURIComponent(
                      req.email
                    )}&phone=${encodeURIComponent(req.phone)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#AE00FF] hover:bg-[#9600DC] text-white text-xs font-semibold shadow-sm transition-colors font-microma"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Create Account</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
