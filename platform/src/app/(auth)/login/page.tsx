"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sign in. Please check credentials.");
      }

      const user = data.user;
      localStorage.setItem("tharuux_session_user", JSON.stringify(user));

      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Please enter your email address to receive a magic sign-in link.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (otpError) throw otpError;
      setMagicLinkSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send magic link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#121214] p-8 sm:p-10 rounded-[28px] border border-black/5 dark:border-white/10 apple-shadow-lg">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Image
            src="/images/logo-with-wording.svg"
            alt="THARUUX-MD"
            width={180}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white font-microma uppercase">
          Client Portal
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Access your bot instances, WhatsApp connection, and runtime configurations.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {magicLinkSent ? (
        <div className="text-center py-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white font-microma">Check Your Inbox</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            We sent a secure magic login link to <strong>{email}</strong>. Click the link in your email to sign in directly.
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="text-xs font-semibold text-[#AE00FF] hover:underline pt-2 font-microma"
          >
            Use password instead
          </button>
        </div>
      ) : (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5 font-microma">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-microma">
                Password
              </label>
              <button
                type="button"
                onClick={handleMagicLink}
                className="text-[11px] text-[#AE00FF] dark:text-[#C547FF] hover:underline"
              >
                Send magic link
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white font-semibold text-xs uppercase tracking-wider font-microma transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Request Access notice */}
      <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800/80 text-center space-y-2">
        <p className="text-xs text-zinc-500">
          Don't have an active bot account yet?
        </p>
        <Link
          href="/contact?intent=request"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#AE00FF] dark:text-[#C547FF] hover:underline font-microma"
        >
          <span>Request bot access from admin</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
