"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmation is required, Supabase returns a user but no
    // session yet -- there's nothing to log in to until they confirm.
    if (!data.session) {
      setCheckEmail(true);
      return;
    }
    // Full page navigation, not router.push -- see SignOutButton for why:
    // it guarantees no stale client-side cache from a previous session
    // survives into this one.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/dashboard";
  }

  if (checkEmail) {
    return (
      <div className="w-full text-center sm:w-[400px]">
        <h1 className="mb-2 font-display text-2xl font-extrabold text-text-1">Check your email</h1>
        <p className="text-sm text-text-2">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account,
          then come back and log in.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center sm:w-[400px]">
      <Image src="/bucketly-lockup.png" alt="Bucketly" width={140} height={139} className="mb-6" />
      <h1 className="mb-1 font-display text-2xl font-extrabold text-text-1">Create your account</h1>
      <p className="mb-6 text-sm text-text-2">Start checking things off today.</p>

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold text-text-2">
            Email
          </label>
          <input
            id="email"
            type="email"
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
            required
            minLength={6}
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
          {loading ? "Signing up..." : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-sm text-text-2">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-teal-ink underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
