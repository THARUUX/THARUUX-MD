"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Check,
  Bot,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  Lock,
  Key,
  ShieldCheck,
} from "lucide-react";

export default function BotSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    bot_name: "THARUUX-MD",
    prefix: ".",
    mode: "public",
    sticker_pack_name: "THARUUX-MD",
    sticker_author: "THARUUX🍀",
    alive_message: "👋 Hey there! *THARUUX-MD* is active and running smooth.",
    alive_image_url: "",
    audio_title: "THARUUX-MD Official",
    audio_artist: "THARUUX",
    auto_read: false,
    auto_react: true,
    auto_status_view: true,
    auto_call_reject: true,
    call_reject_message: "📵 Automatic Notice: Voice and video calls are not supported on this automated line.",
    sudo_numbers: "",
  });

  const [userId, setUserId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tharuux_session_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.id) setUserId(u.id);
      }
    } catch {}
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !currentPassword || !newPassword) return;
    setChangingPassword(true);
    setPwError(null);
    setPwSuccess(false);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err: any) {
      setPwError(err.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    async function loadSettings() {
      if (!userId) return;
      try {
        const url = `/api/bot/config?userId=${encodeURIComponent(userId)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setSettings((prev) => ({ ...prev, ...data.config }));
          }
        }
      } catch (err) {
        console.error("Failed to load bot settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/bot/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Could not save settings to database.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-microma uppercase">
            Bot Configuration &amp; Behavior
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Customize all response messages, sticker metadata, prefix, and autonomous features.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold animate-in fade-in duration-200">
            <Check className="w-3.5 h-3.5" />
            <span>Settings synced to bot instance!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: General Core Settings */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <Bot className="w-5 h-5 text-[#AE00FF]" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white font-microma uppercase">Core Identity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
                Bot Display Name
              </label>
              <input
                type="text"
                value={settings.bot_name}
                onChange={(e) => setSettings({ ...settings, bot_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
                Command Prefix
              </label>
              <input
                type="text"
                value={settings.prefix}
                onChange={(e) => setSettings({ ...settings, prefix: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
                Work Mode
              </label>
              <select
                value={settings.mode}
                onChange={(e) => setSettings({ ...settings, mode: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
              >
                <option value="public">Public (Everyone in groups)</option>
                <option value="private">Private (Only you &amp; Sudo numbers)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Stickers & Media Branding */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <Layers className="w-5 h-5 text-[#C026D3]" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white font-microma uppercase">Stickers &amp; Media Branding</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
                Sticker Pack Name
              </label>
              <input
                type="text"
                value={settings.sticker_pack_name}
                onChange={(e) => setSettings({ ...settings, sticker_pack_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
                Sticker Author Tag
              </label>
              <input
                type="text"
                value={settings.sticker_author}
                onChange={(e) => setSettings({ ...settings, sticker_author: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
                Audio Tag Title
              </label>
              <input
                type="text"
                value={settings.audio_title}
                onChange={(e) => setSettings({ ...settings, audio_title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
                Audio Tag Artist
              </label>
              <input
                type="text"
                value={settings.audio_artist}
                onChange={(e) => setSettings({ ...settings, audio_artist: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
              Alive Response Message
            </label>
            <textarea
              rows={3}
              value={settings.alive_message}
              onChange={(e) => setSettings({ ...settings, alive_message: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50 font-mono"
            />
          </div>
        </div>

        {/* Section 3: Autonomous Feature Toggles */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <Sparkles className="w-5 h-5 text-[#EC4899]" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white font-microma uppercase">Autonomous Features</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-[#AE00FF]/30 transition-colors">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block font-microma">Auto Status Viewer</span>
                <span className="text-[11px] text-zinc-400">Silently view incoming stories from contacts</span>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_status_view}
                onChange={(e) => setSettings({ ...settings, auto_status_view: e.target.checked })}
                className="w-4 h-4 text-[#AE00FF] rounded focus:ring-[#AE00FF]"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-[#AE00FF]/30 transition-colors">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block font-microma">Auto Reactions</span>
                <span className="text-[11px] text-zinc-400">React with random emojis to chat commands</span>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_react}
                onChange={(e) => setSettings({ ...settings, auto_react: e.target.checked })}
                className="w-4 h-4 text-[#AE00FF] rounded focus:ring-[#AE00FF]"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-[#AE00FF]/30 transition-colors">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block font-microma">Anti-Call Shield</span>
                <span className="text-[11px] text-zinc-400">Reject voice/video calls automatically</span>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_call_reject}
                onChange={(e) => setSettings({ ...settings, auto_call_reject: e.target.checked })}
                className="w-4 h-4 text-[#AE00FF] rounded focus:ring-[#AE00FF]"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-[#AE00FF]/30 transition-colors">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block font-microma">Auto Read Messages</span>
                <span className="text-[11px] text-zinc-400">Blue tick received group and PM messages</span>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_read}
                onChange={(e) => setSettings({ ...settings, auto_read: e.target.checked })}
                className="w-4 h-4 text-[#AE00FF] rounded focus:ring-[#AE00FF]"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
              Sudo Numbers (Privileged Controllers)
            </label>
            <input
              type="text"
              placeholder="94781234567, 94771234567"
              value={settings.sudo_numbers}
              onChange={(e) => setSettings({ ...settings, sudo_numbers: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50 font-mono"
            />
            <p className="text-[11px] text-zinc-400 mt-1">Comma-separated phone numbers with country code.</p>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white font-semibold text-xs uppercase tracking-wider font-microma transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Applying Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Bot Settings</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Account Security & Password Card */}
      <div className="p-6 sm:p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white font-microma uppercase">
              Account Security &amp; Password
            </h2>
            <p className="text-xs text-zinc-500">
              Update your account login password to keep your bot portal secure.
            </p>
          </div>
        </div>

        {pwSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold font-microma">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Password updated successfully! Use your new password for your next login.</span>
          </div>
        )}

        {pwError && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pwError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 font-microma">
              Current Password
            </label>
            <input
              type="password"
              required
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 font-microma">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
            />
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs uppercase tracking-wider font-microma transition-all flex items-center gap-2"
          >
            {changingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Key className="w-3.5 h-3.5" />
            <span>Update Password</span>
          </button>
        </form>
      </div>
    </div>
  );
}
