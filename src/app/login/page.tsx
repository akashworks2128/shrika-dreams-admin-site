"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111827] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1C2738] p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-[#C9A04B]">
            SHRIKA DREAMS
          </p>

          <h1 className="mt-3 text-3xl font-semibold text-white">
            Admin Login
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Sign in to manage your website
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="w-full rounded-lg border border-white/10 bg-[#111827] px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-[#C9A04B] focus:ring-1 focus:ring-[#C9A04B]"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full rounded-lg border border-white/10 bg-[#111827] px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-[#C9A04B] focus:ring-1 focus:ring-[#C9A04B]"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#C9A04B] py-3 font-semibold text-white transition hover:bg-[#B58B39] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Shrika Dreams · Admin Panel
        </p>
      </div>
    </main>
  );
}
