"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
  Loader2,
  Trash2,
  AlertCircle,
  Key,
  Lock,
  Sparkles,
} from "lucide-react";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: "basic" | "premium" | "business";
  is_active: boolean;
  activation_end: string;
  days_remaining: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    plan: "premium" as "basic" | "premium" | "business",
    validity_days: "30",
    initial_password: "",
  });

  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserRecord | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPasswordInput) return;
    setUpdatingPassword(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUserForPassword.id, password: newPasswordInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      setPasswordSuccess(true);
      setTimeout(() => {
        setPasswordSuccess(false);
        setSelectedUserForPassword(null);
        setNewPasswordInput("");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err: any) {
      setError("Failed to fetch users from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          plan: newUser.plan,
          days: newUser.validity_days,
          is_active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      await fetchUsers();
      setShowModal(false);
      setNewUser({
        name: "",
        email: "",
        phone: "",
        plan: "premium",
        validity_days: "30",
        initial_password: "",
      });
    } catch (err: any) {
      setError(err.message || "Failed to create user in Supabase");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserActive = async (id: string, currentActive: boolean) => {
    // Optimistic update
    setUsers(users.map((u) => (u.id === id ? { ...u, is_active: !currentActive } : u)));

    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
    } catch (err) {
      fetchUsers();
    }
  };

  const extendSubscription = async (id: string, days: number) => {
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, days_to_add: days }),
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-microma uppercase">
            User Management &amp; Access Control
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Real Supabase user records, live validity countdowns, and instant activation toggle.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white text-xs font-semibold shadow-sm hover:scale-[1.02] transition-all font-microma"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Provision New User</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by user name, email, or WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
        />
      </div>

      {/* Users Table Card */}
      <div className="rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/10 apple-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold font-microma">
              <tr>
                <th className="py-3.5 px-6">User / Contact</th>
                <th className="py-3.5 px-6">Plan</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Validity &amp; Expiry</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#AE00FF] mb-2" />
                    <span>Loading users from database...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    No users found in database. Click "Provision New User" to add one.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-semibold text-zinc-900 dark:text-white text-sm font-microma">{user.name}</p>
                      <p className="text-zinc-500 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                      {user.phone && (
                        <p className="text-zinc-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </p>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <span className="capitalize px-2.5 py-1 rounded-full bg-[#AE00FF]/10 text-[#AE00FF] font-semibold text-[11px] font-microma uppercase">
                        {user.plan}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          Active Access
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                          <XCircle className="w-3 h-3" />
                          Suspended / Expired
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {user.activation_end || "No Expiry"}
                      </p>
                      <p className="text-zinc-400 text-[11px] mt-0.5">
                        {user.days_remaining > 0 ? `${user.days_remaining} days left` : user.activation_end ? "Expired" : "Indefinite"}
                      </p>
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => toggleUserActive(user.id, user.is_active)}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-colors ${
                          user.is_active
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100"
                            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100"
                        }`}
                      >
                        {user.is_active ? "Suspend" : "Activate"}
                      </button>

                      <button
                        onClick={() => extendSubscription(user.id, 30)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] hover:bg-zinc-200 transition-colors"
                      >
                        +30 Days
                      </button>

                      <button
                        onClick={() => {
                          setSelectedUserForPassword(user);
                          setNewPasswordInput("");
                          setPasswordSuccess(false);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-[#AE00FF] hover:bg-[#AE00FF]/10 transition-colors"
                        title="Edit / Reset Password"
                      >
                        <Key className="w-3.5 h-3.5 inline" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121214] rounded-[28px] border border-black/10 dark:border-white/10 apple-shadow-lg max-w-lg w-full p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white font-microma uppercase">
                Provision New Client Account
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Enter user details and set their initial subscription activation window.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 font-microma">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Silva"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 font-microma">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@gmail.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 font-microma">
                    WhatsApp Phone
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="94771234567"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 font-microma">
                    Subscription Plan
                  </label>
                  <select
                    value={newUser.plan}
                    onChange={(e) => setNewUser({ ...newUser, plan: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
                  >
                    <option value="basic">Basic (LKR 1,500/mo)</option>
                    <option value="premium">Premium (LKR 2,500/mo)</option>
                    <option value="business">Business (LKR 5,000/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 font-microma">
                    Validity (Days)
                  </label>
                  <select
                    value={newUser.validity_days}
                    onChange={(e) => setNewUser({ ...newUser, validity_days: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50"
                  >
                    <option value="30">30 Days (1 Month)</option>
                    <option value="60">60 Days (2 Months)</option>
                    <option value="90">90 Days (Quarterly)</option>
                    <option value="180">180 Days (Half Year)</option>
                    <option value="365">365 Days (1 Year)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 transition-colors font-microma"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white text-xs font-semibold shadow-md hover:scale-[1.02] transition-all flex items-center gap-2 font-microma"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create &amp; Activate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Password Modal */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121214] rounded-[28px] border border-black/10 dark:border-white/10 apple-shadow-lg max-w-md w-full p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#AE00FF]/10 text-[#AE00FF] flex items-center justify-center shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-microma uppercase">
                  Reset User Password
                </h3>
                <p className="text-xs text-zinc-500">
                  Update credentials for <strong>{selectedUserForPassword.name}</strong> ({selectedUserForPassword.email})
                </p>
              </div>
            </div>

            {passwordSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold font-microma">
                <CheckCircle2 className="w-4 h-4" />
                <span>Password updated successfully!</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-microma">
                      New Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const random = "Tharuux@" + Math.floor(1000 + Math.random() * 9000) + "!";
                        setNewPasswordInput(random);
                      }}
                      className="text-[11px] text-[#AE00FF] hover:underline flex items-center gap-1 font-microma"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Strong</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      minLength={6}
                      placeholder="Enter at least 6 characters"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#AE00FF]/50 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForPassword(null)}
                    className="px-5 py-2 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 transition-colors font-microma"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="px-6 py-2 rounded-full bg-[#AE00FF] hover:bg-[#9600DC] text-white text-xs font-semibold shadow-md hover:scale-[1.02] transition-all flex items-center gap-2 font-microma"
                  >
                    {updatingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Password</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
