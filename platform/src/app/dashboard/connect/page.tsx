"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  QrCode,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  Unlink,
  AlertCircle,
  Zap,
} from "lucide-react";

export default function ConnectWhatsAppPage() {
  const [activeTab, setActiveTab] = useState<"qr" | "pairing">("pairing");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRequestingQR, setIsRequestingQR] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tharuux_session_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.id) setUserId(u.id);
      }
    } catch {}
  }, []);

  const fetchStatus = async () => {
    if (!userId) return;
    try {
      const url = `/api/bot/status?userId=${encodeURIComponent(userId)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (userId) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const isConnected = status?.hasSession && status?.connectionState === "open";

  const handleGeneratePairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !userId) return;

    setIsGenerating(true);
    setErrorMsg(null);
    setPairingCode(null);

    try {
      const res = await fetch("/api/bot/pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber, userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate pairing code.");
      }
      if (data.code) {
        setPairingCode(data.code);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Could not generate pairing code. Please try again.");
    } finally {
      setIsGenerating(false);
      fetchStatus();
    }
  };

  const handleRequestQR = async () => {
    if (!userId) return;
    setIsRequestingQR(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/bot/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to request QR session.");
      }
      if (data.qr) {
        setStatus((prev: any) => ({ ...prev, currentQR: data.qr }));
      }
      fetchStatus();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate QR session.");
    } finally {
      setIsRequestingQR(false);
    }
  };

  const handleDisconnect = async () => {
    if (!userId) return;
    if (!confirm("Are you sure you want to disconnect this bot session? You will need to re-link your device.")) {
      return;
    }

    setDisconnecting(true);
    try {
      await fetch("/api/bot/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setPairingCode(null);
      await fetchStatus();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to disconnect session.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode.replace("-", ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-microma uppercase">
          WhatsApp Connection Manager
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Link your WhatsApp account to your dedicated THARUUX-MD bot instance using an 8-character pairing code or QR code scanning.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Current Connection Status Alert */}
      {isConnected ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-emerald-900 dark:text-emerald-300 font-microma">
                Active WhatsApp Connection (Online)
              </h3>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400">
                Connected to WhatsApp account {status?.user?.phone ? <strong>+{status.user.phone}</strong> : ""} {status?.user?.name ? `(${status.user.name})` : ""}. Your bot is listening and operational.
              </p>
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-sm font-microma disabled:opacity-50"
          >
            <Unlink className="w-3.5 h-3.5" />
            <span>{disconnecting ? "Disconnecting..." : "Disconnect Session"}</span>
          </button>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <div>
              <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-200 font-microma">
                Device Not Linked
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Generate a pairing code or QR code below to link your WhatsApp account to your dedicated bot.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Connection Tabs Card */}
      <div className="p-6 sm:p-10 rounded-[28px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-8">
        {/* Tab Switcher */}
        <div className="flex items-center p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 max-w-sm mx-auto">
          <button
            onClick={() => setActiveTab("pairing")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold transition-all font-microma ${
              activeTab === "pairing"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Pairing Code</span>
          </button>
          <button
            onClick={() => setActiveTab("qr")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold transition-all font-microma ${
              activeTab === "qr"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Code</span>
          </button>
        </div>

        {/* Tab 1: Pairing Code (Recommended) */}
        {activeTab === "pairing" && (
          <div className="max-w-md mx-auto space-y-6">
            <form onSubmit={handleGeneratePairingCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
                  Phone Number with Country Code
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                    +
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="94771234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\+/g, "").trim())}
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50 font-mono"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Enter your full WhatsApp number including country code without plus or spaces (e.g. 94771234567 for Sri Lanka).
                </p>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3.5 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white font-semibold text-xs uppercase tracking-wider font-microma transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Requesting Code from WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Generate 8-Digit Pairing Code</span>
                  </>
                )}
              </button>
            </form>

            {(pairingCode || status?.currentPairingCode) && (
              <div className="p-6 rounded-2xl bg-zinc-900 text-white text-center space-y-4 animate-in fade-in zoom-in-95 duration-200 border border-purple-500/20 shadow-lg">
                <span className="text-[11px] font-semibold tracking-wider text-[#D946EF] uppercase font-microma">
                  Your WhatsApp Pairing Code
                </span>
                <div className="text-3xl font-mono font-bold tracking-widest text-white py-2">
                  {pairingCode || status?.currentPairingCode}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied to Clipboard!" : "Copy Code"}</span>
                </button>
              </div>
            )}

            <div className="text-left bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 font-microma">How to enter pairing code:</p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-500">
                <li>Open <strong>WhatsApp</strong> on your phone</li>
                <li>Go to <strong>Linked Devices &gt; Link a Device</strong></li>
                <li>Tap <strong>Link with phone number instead</strong> at the bottom</li>
                <li>Enter the 8-character code shown above</li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 2: QR Code */}
        {activeTab === "qr" && (
          <div className="flex flex-col items-center text-center space-y-6 max-w-md mx-auto">
            <div className="relative p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center w-full">
              {status?.currentQR ? (
                <div className="w-64 h-64 bg-white p-3 rounded-2xl shadow-md flex items-center justify-center relative overflow-hidden">
                  <img
                    src={status.currentQR}
                    alt="WhatsApp QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-64 h-64 bg-white dark:bg-zinc-800/40 rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <QrCode className="w-12 h-12 text-zinc-400" />
                  <p className="text-xs text-zinc-500">
                    Click the button below to generate a real-time QR code from WhatsApp socket.
                  </p>
                  <button
                    onClick={handleRequestQR}
                    disabled={isRequestingQR}
                    className="px-4 py-2 rounded-xl bg-[#AE00FF] hover:bg-[#9600DC] text-white text-xs font-semibold font-microma transition-all flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isRequestingQR ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <span>Generate QR</span>
                    )}
                  </button>
                </div>
              )}

              {status?.currentQR && (
                <div className="mt-4 flex flex-col items-center gap-2.5">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Socket QR (Scan with WhatsApp camera)</span>
                  </div>
                  <button
                    onClick={handleRequestQR}
                    disabled={isRequestingQR}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRequestingQR ? "animate-spin" : ""}`} />
                    <span>{isRequestingQR ? "Refreshing..." : "Refresh QR Code"}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="text-left bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-2 w-full">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 font-microma">How to scan from WhatsApp:</p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-500">
                <li>Open <strong>WhatsApp</strong> on your mobile device</li>
                <li>Tap <strong>Settings</strong> (iOS) or <strong>Three Dots &gt; Linked Devices</strong> (Android)</li>
                <li>Tap <strong>Link a Device</strong> and point your camera at this QR code</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
