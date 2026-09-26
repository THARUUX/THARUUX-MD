"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Bot,
  QrCode,
  Radio,
  RefreshCw,
  Terminal,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const [restarting, setRestarting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [botData, setBotData] = useState<any>({
    hasSession: false,
    connectionState: "disconnected",
    isBotRunning: false,
    user: null,
    botMode: "public",
    commandsCount: 110,
    pluginsCount: 12,
    plugins: ["anime","audio","converter","downloader","fun","games","group","logo","main","owner","plugins","tools"],
    prefix: ".",
    uptime: 0,
  });

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem("tharuux_session_user") ||
        localStorage.getItem("tharuux_demo_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.id) setUserId(u.id);
      }
    } catch {}
  }, []);

  const fetchRealBotData = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/bot/status?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setBotData(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (userId) {
      fetchRealBotData();
      const interval = setInterval(fetchRealBotData, 8000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const handleRestart = () => {
    setRestarting(true);
    setTimeout(() => {
      fetchRealBotData();
      setRestarting(false);
    }, 2000);
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0m";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const isConnected = botData.hasSession && botData.connectionState === "open";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-microma uppercase">
            Bot Instance Overview
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time status and operational metrics for your dedicated WhatsApp bot.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRestart}
            disabled={restarting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${restarting ? "animate-spin" : ""}`} />
            <span>{restarting ? "Syncing Node..." : "Refresh Status"}</span>
          </button>
          <Link
            href="/dashboard/connect"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#AE00FF] hover:bg-[#9600DC] text-white text-xs font-semibold font-microma transition-all"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{isConnected ? "Connection Details" : "Connect WhatsApp"}</span>
          </Link>
        </div>
      </div>

      {/* Main Bot Status Card */}
      <div className="p-6 sm:p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-microma">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected &amp; Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold font-microma">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Device Not Linked
              </span>
            )}
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#AE00FF]/10 text-[#AE00FF] font-microma">
              Multi-Device v6
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono">
              Prefix: {botData.prefix}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 uppercase text-[10px] font-microma">
              {botData.botMode} Mode
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-microma">
            {isConnected ? "Your WhatsApp Bot is Live" : "Dedicated Bot Ready to Connect"}
          </h2>

          {isConnected && botData.user ? (
            <p className="text-xs sm:text-sm text-zinc-500 max-w-xl leading-relaxed">
              Linked to your phone: <strong className="text-zinc-800 dark:text-zinc-200">+{botData.user.phone}</strong> {botData.user.name ? `(${botData.user.name})` : ""}. Your bot is actively monitoring messages with your custom settings.
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-zinc-500 max-w-xl leading-relaxed">
              Your dedicated bot instance has been provisioned. Connect your personal WhatsApp phone number using a pairing code or QR to start automating your messages.
            </p>
          )}

          <div className="pt-2 flex flex-wrap gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-[#AE00FF]" />
              Socket State: <strong className="uppercase">{botData.connectionState || "disconnected"}</strong>
            </span>
            <span>&bull;</span>
            <span>
              Installed Plugins: <strong>{botData.pluginsCount || 12} Modules</strong>
            </span>
            <span>&bull;</span>
            <span>
              Live Uptime: <strong>{formatUptime(botData.uptime || 0)}</strong>
            </span>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col items-center sm:items-end justify-center">
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 w-full max-w-xs space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Bot Connection</span>
              <span className={`font-semibold ${isConnected ? "text-emerald-500" : "text-amber-500"}`}>
                {isConnected ? "Online" : "Awaiting Pairing"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Account Type</span>
              <span className="text-[#AE00FF] font-semibold uppercase font-microma text-[10px]">Isolated Instance</span>
            </div>

            {isConnected ? (
              <Link
                href="/dashboard/settings"
                className="w-full py-2.5 rounded-xl bg-[#AE00FF] hover:bg-[#9600DC] text-white text-xs font-semibold text-center block transition-all font-microma"
              >
                Configure Bot Settings
              </Link>
            ) : (
              <Link
                href="/dashboard/connect"
                className="w-full py-2.5 rounded-xl bg-[#AE00FF] hover:bg-[#9600DC] text-white text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-all font-microma"
              >
                <span>Pair Your WhatsApp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-microma">Loaded Commands</span>
            <Terminal className="w-4 h-4 text-[#AE00FF]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-microma">
            {botData.commandsCount || 110}
          </p>
          <p className="text-[11px] text-zinc-400">Ready to execute</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-microma">Connection State</span>
            <Radio className="w-4 h-4 text-[#C026D3]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-microma capitalize">
            {botData.connectionState || "Offline"}
          </p>
          <p className={`text-[11px] font-medium ${isConnected ? "text-emerald-500" : "text-amber-500"}`}>
            {isConnected ? "Linked & Listening" : "No device paired"}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-microma">Active Prefix</span>
            <Zap className="w-4 h-4 text-[#EC4899]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-mono">
            {botData.prefix || "."}
          </p>
          <p className="text-[11px] text-zinc-400">Trigger character</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-microma">Instance Uptime</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-microma">
            {formatUptime(botData.uptime || 0)}
          </p>
          <p className="text-[11px] text-zinc-400">Total runtime</p>
        </div>
      </div>
    </div>
  );
}
