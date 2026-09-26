"use client";

import { useState } from "react";
import {
  Bell,
  Send,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Radio,
  Users,
  Loader2,
} from "lucide-react";

interface NotificationHistory {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  target: string;
  sent_at: string;
  read_count: number;
}

export default function AdminNotificationsPage() {
  const [target, setTarget] = useState<"all" | "specific">("all");
  const [specificEmail, setSpecificEmail] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success" | "error">("info");
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const [history, setHistory] = useState<NotificationHistory[]>([
    {
      id: "notif_1",
      title: "Baileys Engine Multi-Device v6 Upgrade Completed",
      message: "All bot instances have been automatically upgraded to the latest socket protocol with enhanced media speed.",
      type: "success",
      target: "Broadcast (All 38 Users)",
      sent_at: "Today, 10:30 AM",
      read_count: 32,
    },
    {
      id: "notif_2",
      title: "Scheduled Cloud Maintenance Window",
      message: "Brief 5-minute socket keep-alive reconnect on Sunday at 03:00 AM UTC. No action required.",
      type: "warning",
      target: "Broadcast (All 38 Users)",
      sent_at: "Yesterday",
      read_count: 36,
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    setSending(true);
    setTimeout(() => {
      const created: NotificationHistory = {
        id: `notif_${Date.now()}`,
        title,
        message,
        type,
        target: target === "all" ? "Broadcast (All 38 Users)" : specificEmail,
        sent_at: "Just now",
        read_count: 0,
      };

      setHistory([created, ...history]);
      setSending(false);
      setSentSuccess(true);
      setTitle("");
      setMessage("");
      setTimeout(() => setSentSuccess(false), 3000);
    }, 900);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Push Notifications &amp; Client Broadcasts
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Dispatch high-priority system announcements, maintenance alerts, or account updates to client portals.
          </p>
        </div>

        {sentSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold animate-in fade-in duration-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Notification broadcast sent!</span>
          </div>
        )}
      </div>

      {/* Broadcast Composer */}
      <form
        onSubmit={handleSend}
        className="p-6 sm:p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-6"
      >
        <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <Bell className="w-5 h-5 text-purple-600" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            Compose New Push Notification
          </h2>
        </div>

        {/* Target Audience */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Audience Target
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="all">Broadcast to All Users</option>
              <option value="specific">Single Client Account</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Notification Type / Severity
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="info">Info / General Update</option>
              <option value="success">Success / Feature Release</option>
              <option value="warning">Warning / Maintenance</option>
              <option value="error">Critical Alert</option>
            </select>
          </div>
        </div>

        {target === "specific" && (
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Client Email Address
            </label>
            <input
              type="email"
              required
              placeholder="client@gmail.com"
              value={specificEmail}
              onChange={(e) => setSpecificEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
            Notification Title
          </label>
          <input
            type="text"
            required
            placeholder="e.g. New AI Image Generator Command Added (.imagine)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
            Message Body
          </label>
          <textarea
            rows={3}
            required
            placeholder="Write the notification details that will appear on client dashboards..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="px-8 py-3.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-xs uppercase tracking-wider shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Push...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Push Notification</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* History Log */}
      <div className="p-6 sm:p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-5">
        <h3 className="font-bold text-base text-zinc-900 dark:text-white">
          Notification Broadcast History
        </h3>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
          {history.map((item) => (
            <div key={item.id} className="py-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.type === "success"
                        ? "bg-emerald-500"
                        : item.type === "warning"
                        ? "bg-amber-500"
                        : "bg-purple-500"
                    }`}
                  />
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{item.title}</h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    {item.target}
                  </span>
                </div>
                <span className="text-zinc-400">{item.sent_at}</span>
              </div>
              <p className="text-zinc-500 leading-relaxed pl-4">{item.message}</p>
              <div className="pl-4 text-[11px] text-zinc-400 flex items-center gap-4">
                <span>
                  Delivered: <strong className="text-zinc-700 dark:text-zinc-300">100%</strong>
                </span>
                <span>
                  Read by: <strong className="text-zinc-700 dark:text-zinc-300">{item.read_count} users</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
