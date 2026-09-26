"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Settings,
  Save,
  Check,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  Layers,
  PhoneCall,
  Loader2,
  Globe,
  AlertCircle,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

export default function AdminConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState({
    // Branding & Media URLs
    brand_icon_url: "/images/icon.png",
    brand_logo_wording_url: "/images/logo-wording.png",
    brand_logo_url: "/images/logo.png",
    hero_banner_url: "/images/banner.png",
    default_alive_image: "https://tharuux.lk/images/banner.png",
    default_menu_banner: "https://tharuux.lk/images/logo.png",
    default_audio_thumb: "https://tharuux.lk/images/logo.png",

    // Default Bot Settings
    default_bot_name: "THARUUX-MD",
    default_prefix: ".",
    default_sticker_pack: "🎯THARUUX-MD",
    default_sticker_author: "THARUUX🍀",
    default_alive_message: "👋 Hey there! *THARUUX-MD* is active and running smooth.",
    default_audio_title: "THARUUX-MD Automated Sound",
    default_audio_artist: "THARUUX & ZYNEX Developments",
    default_call_reject_msg: "📵 Voice/video calls are rejected automatically on this line. Please send a text message.",
    allow_custom_prefixes: true,
    enable_ai_plugins: true,
    enable_auto_status: true,
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/admin/config");
        if (res.ok) {
          const data = await res.json();
          if (data.config && Object.keys(data.config).length > 0) {
            setConfig((prev) => ({ ...prev, ...data.config }));
          }
        }
      } catch (err) {
        console.error("Failed to load global config:", err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save configuration");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Could not save global config to database.");
    } finally {
      setSaving(false);
    }
  };

  const imageFields = [
    {
      key: "brand_icon_url",
      label: "Brand Icon URL (Square Favicon / App Icon)",
      desc: "Used in navigation bars, browser favicons, and portal header icons.",
      defaultValue: "/images/icon.png",
      aspect: "w-12 h-12",
    },
    {
      key: "brand_logo_wording_url",
      label: "Brand Logo Wording URL (Horizontal Brand Banner)",
      desc: "Used beside the icon on the Navbar, sidebar, and landing hero.",
      defaultValue: "/images/logo-wording.png",
      aspect: "w-36 h-9",
    },
    {
      key: "brand_logo_url",
      label: "Brand Master Logo (Full Emblem)",
      desc: "Used on the About page, footer, and official marketing badges.",
      defaultValue: "/images/logo.png",
      aspect: "w-16 h-16",
    },
    {
      key: "hero_banner_url",
      label: "Landing Hero Showcase Banner URL",
      desc: "Main visual banner featured on md.tharuux.lk homepage and OpenGraph cards.",
      defaultValue: "/images/banner.png",
      aspect: "w-44 h-24",
    },
    {
      key: "default_alive_image",
      label: "WhatsApp Bot .alive Response Image URL",
      desc: "Image sent with captions when users type .alive in WhatsApp chats.",
      defaultValue: "https://tharuux.lk/images/banner.png",
      aspect: "w-36 h-20",
    },
    {
      key: "default_menu_banner",
      label: "WhatsApp Bot .menu / Command List Banner URL",
      desc: "Image banner sent when users request the command menu on WhatsApp.",
      defaultValue: "https://tharuux.lk/images/logo.png",
      aspect: "w-24 h-24",
    },
    {
      key: "default_audio_thumb",
      label: "Default Audio / MP3 Tag Artwork Thumbnail URL",
      desc: "Thumbnail artwork embedded when the bot converts or shares audio files.",
      defaultValue: "https://tharuux.lk/images/logo.png",
      aspect: "w-20 h-20",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-microma uppercase">
            Platform Image Assets &amp; Global Bot Defaults
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Configure system-wide image URLs, default WhatsApp messages, and feature flags. All changes update instantly.
          </p>
        </div>

        {success && (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold animate-in fade-in duration-200">
            <Check className="w-3.5 h-3.5" />
            <span>Configurations saved successfully!</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Dynamic Image URLs & Live Previews */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-5 h-5 text-[#AE00FF]" />
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white font-microma uppercase">
                  Platform Branding &amp; Image Assets Management
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Update any image URL below. Enter custom CDN/hosted URLs or local asset paths.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {imageFields.map((field) => {
              const currentVal = (config as any)[field.key] || "";
              return (
                <div
                  key={field.key}
                  className="p-5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex flex-col md:flex-row items-start md:items-center gap-5"
                >
                  {/* Live Preview Box */}
                  <div className="shrink-0 flex flex-col items-center">
                    <div className={`${field.aspect} rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-1 flex items-center justify-center overflow-hidden shadow-sm relative group`}>
                      {currentVal ? (
                        <img
                          src={currentVal}
                          alt={field.label}
                          className="w-full h-full object-contain rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-zinc-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 font-microma uppercase">Preview</span>
                  </div>

                  {/* Input & Description */}
                  <div className="flex-1 w-full space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 font-microma uppercase">
                        {field.label}
                      </label>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, [field.key]: field.defaultValue })}
                        className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-[#AE00FF] transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Default</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-500">{field.desc}</p>

                    <input
                      type="text"
                      value={currentVal}
                      onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                      placeholder={`e.g. ${field.defaultValue}`}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Default Messages & Audio */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <MessageSquare className="w-5 h-5 text-[#C026D3]" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white font-microma uppercase">
              Default WhatsApp Response Messages
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
                Default Alive Response Message
              </label>
              <textarea
                rows={3}
                value={config.default_alive_message}
                onChange={(e) => setConfig({ ...config, default_alive_message: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
                Default Anti-Call Rejection Notice
              </label>
              <textarea
                rows={2}
                value={config.default_call_reject_msg}
                onChange={(e) => setConfig({ ...config, default_call_reject_msg: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
                  Default Sticker Pack
                </label>
                <input
                  type="text"
                  value={config.default_sticker_pack}
                  onChange={(e) => setConfig({ ...config, default_sticker_pack: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
                  Default Sticker Author Tag
                </label>
                <input
                  type="text"
                  value={config.default_sticker_author}
                  onChange={(e) => setConfig({ ...config, default_sticker_author: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Feature Flags */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <Sparkles className="w-5 h-5 text-[#EC4899]" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white font-microma uppercase">
              Platform Feature Flags
            </h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block font-microma">
                  Enable AI Plugin Integration
                </span>
                <span className="text-[11px] text-zinc-400">
                  Allow ChatGPT, Dall-E, and Gemini commands across all instances
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.enable_ai_plugins}
                onChange={(e) => setConfig({ ...config, enable_ai_plugins: e.target.checked })}
                className="w-4 h-4 text-[#AE00FF] rounded focus:ring-[#AE00FF]"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block font-microma">
                  Allow Custom Bot Prefixes
                </span>
                <span className="text-[11px] text-zinc-400">
                  Allow clients to change prefix from default dot (.)
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.allow_custom_prefixes}
                onChange={(e) => setConfig({ ...config, allow_custom_prefixes: e.target.checked })}
                className="w-4 h-4 text-[#AE00FF] rounded focus:ring-[#AE00FF]"
              />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white font-semibold text-xs uppercase tracking-wider font-microma shadow-lg transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating Master Config...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Images &amp; Master Config</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
