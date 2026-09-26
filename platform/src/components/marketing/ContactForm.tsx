"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ContactForm() {
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") || "premium";
  const intent = searchParams.get("intent");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    plan_interest: initialPlan,
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("plan")) {
      setFormData((prev) => ({ ...prev, plan_interest: searchParams.get("plan")! }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please contact via WhatsApp directly.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-8 sm:p-12 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white font-microma">Request Received!</h3>
        <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
          Thank you for choosing <strong>THARUUX-MD</strong>. Our administrator (THARUUX) will contact you via WhatsApp ({formData.phone}) or Email ({formData.email}) shortly to finalize setup and grant portal access.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormData({
              name: "",
              email: "",
              phone: "",
              plan_interest: "premium",
              message: "",
            });
          }}
          className="mt-4 px-6 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-200 transition-colors font-microma"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-8 sm:p-12 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow space-y-6"
    >
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-microma">
          {intent === "request" ? "Request Your THARUUX-MD Bot" : "Get in Touch"}
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Provide your details below. The administrator will contact you with payment details and provision your account.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
            Full Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Kasun Silva"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="you@domain.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
              WhatsApp Number *
            </label>
            <input
              type="tel"
              required
              placeholder="+94 7X XXX XXXX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
            Selected Subscription Plan *
          </label>
          <select
            value={formData.plan_interest}
            onChange={(e) => setFormData({ ...formData, plan_interest: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
          >
            <option value="basic">Basic Plan (LKR 500 / month) — Standard Branding</option>
            <option value="premium">Premium Plan (LKR 1,500 / month) — Full Customization</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 font-microma">
            Additional Requirements or Notes
          </label>
          <textarea
            rows={4}
            placeholder="Tell us about your bot goals, custom prefix preference, group sizes, or any specific plugin requirements..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white font-semibold text-xs uppercase tracking-wider font-microma transition-all flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Sending Request...</span>
          </>
        ) : (
          <>
            <span>Submit Bot Request</span>
            <Send className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-[11px] text-zinc-400 text-center">
        By submitting, you agree to receive onboarding communications via WhatsApp or Email from THARUUX.
      </p>
    </form>
  );
}
