"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Full page navigation, not router.push -- see SignOutButton for why:
    // it guarantees no stale client-side cache from a previous session
    // survives into this one.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/dashboard";
  }

  return (
    <div className="flex w-full flex-col items-center sm:w-[400px]">
      <Image src="/bucketly-lockup.png" alt="Bucketly" width={140} height={139} className="mb-6" />
      <h1 className="mb-1 font-display text-2xl font-extrabold text-text-1">Welcome back</h1>
      <p className="mb-6 text-sm text-text-2">Log in to keep checking things off.</p>

      <form onSubmit={handleSubmit} autoComplete="off" className="flex w-full flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold text-text-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[11px] border border-line bg-surface-card px-3 py-2 text-sm text-text-1 focus:border-brand-teal focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold text-text-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            // Browsers (esp. Chrome) will otherwise auto-populate this field
            // with a saved credential on page load, even right after
            // signing out -- "new-password" is the one autocomplete value
            // that reliably suppresses that, on a login field or not.
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[11px] border border-line bg-surface-card px-3 py-2 text-sm text-text-1 focus:border-brand-teal focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-[11px] bg-brand-coral px-4 py-2 text-sm font-semibold text-white hover:bg-brand-coral-hover disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-text-2">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-brand-teal-ink underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
