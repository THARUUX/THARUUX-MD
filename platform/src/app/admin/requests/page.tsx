"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Inbox,
  MessageCircle,
  Mail,
  Clock,
  CheckCircle,
} from "lucide-react";

interface RequestItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan_interest: string;
  message: string;
  status: "pending" | "contacted" | "resolved";
  created_at: string;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "contacted" | "resolved">("all");

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/admin/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, newStatus: "pending" | "contacted" | "resolved") => {
    setRequests(
      requests.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    try {
      await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
    } catch (e) {}
  };

  const filtered = requests.filter(
    (r) => filter === "all" || r.status === filter
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-microma uppercase">
            Bot Requests &amp; Lead Inquiries (Real Supabase Data)
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Submitted inquiries from prospective bot users. Connect via WhatsApp or email to confirm payment and activate accounts.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-[#121214] rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
          {(["all", "pending", "contacted", "resolved"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors font-microma text-[11px] ${
                filter === tab
                  ? "bg-[#AE00FF] text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Card List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-400 font-microma">
            Loading inquiries from Supabase...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400 font-microma">
            No requests matching filter.
          </div>
        ) : (
          filtered.map((req) => (
            <div
              key={req.id}
              className="p-6 sm:p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white font-microma">{req.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#AE00FF]/10 text-[#AE00FF] font-semibold text-[10px] font-microma uppercase">
                    {req.plan_interest}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-microma ${
                      req.status === "pending"
                        ? "bg-amber-500/10 text-amber-600"
                        : req.status === "contacted"
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-emerald-500/10 text-emerald-600"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(req.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-500">
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{req.email}</span>
                </p>
                <p className="flex items-center gap-2 font-mono">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>+{req.phone}</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300">
                <p className="font-semibold text-zinc-900 dark:text-white mb-1 font-microma text-[11px]">User Message / Requirement:</p>
                <p className="leading-relaxed">{req.message || "No custom message provided."}</p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-microma text-[10px]">Mark Status:</span>
                  <button
                    onClick={() => updateStatus(req.id, "pending")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold font-microma uppercase ${
                      req.status === "pending" ? "bg-amber-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => updateStatus(req.id, "contacted")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold font-microma uppercase ${
                      req.status === "contacted" ? "bg-blue-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    Contacted
                  </button>
                  <button
                    onClick={() => updateStatus(req.id, "resolved")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold font-microma uppercase ${
                      req.status === "resolved" ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    Resolved
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={`https://wa.me/${req.phone}?text=Hello%20${encodeURIComponent(
                      req.name
                    )},%20this%20is%20THARUUX%20from%20THARUUX-MD.%20We%20received%20your%20request%20for%20the%20${encodeURIComponent(
                      req.plan_interest
                    )}%20plan.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-colors font-microma"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Chat on WhatsApp</span>
                  </a>

                  <Link
                    href={`/admin/users?action=new&name=${encodeURIComponent(req.name)}&email=${encodeURIComponent(
                      req.email
                    )}&phone=${encodeURIComponent(req.phone)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#AE00FF] hover:bg-[#9600DC] text-white text-xs font-semibold shadow-sm transition-colors font-microma"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Provision Account</span>
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
