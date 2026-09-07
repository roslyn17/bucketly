"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import EyeIcon from "@/components/EyeIcon";

// How long to wait for Supabase to finish establishing the recovery session
// from the emailed link's URL fragment before concluding there isn't one --
// that processing happens client-side, async, right after the page loads.
const RECOVERY_SESSION_TIMEOUT_MS = 2000;

type Status = "checking" | "ready" | "invalid";

export default function UpdatePasswordForm() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // A reset link logs the visitor in via a short-lived "recovery" session
  // encoded in the URL fragment -- supabase-js parses that out and
  // establishes the session asynchronously right after the client is
  // created, so there's a brief window where "no session yet" doesn't
  // necessarily mean the link was invalid. Both the auth-state subscription
  // (catches it as soon as it's ready) and the immediate getSession() check
  // (catches it if it was already done before we subscribed) feed the same
  // state, and only a real timeout with neither firing counts as "invalid".
  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        settled = true;
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!settled && session) {
        settled = true;
        setStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setStatus("invalid");
      }
    }, RECOVERY_SESSION_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (status === "checking") {
    return <p className="text-sm text-text-2">Verifying your reset link...</p>;
  }

  if (status === "invalid") {
    return (
      <div className="w-full text-center sm:w-[400px]">
        <h1 className="mb-2 font-display text-2xl font-extrabold text-text-1">Link expired</h1>
        <p className="text-sm text-text-2">
          This password reset link is invalid or has expired. Reset links only work once and go stale after a
          while.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-semibold text-brand-teal-ink underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full text-center sm:w-[400px]">
        <h1 className="mb-2 font-display text-2xl font-extrabold text-text-1">Password updated</h1>
        <p className="mb-6 text-sm text-text-2">You&apos;re all set. Head back to your dashboard.</p>
        <Link
          href="/dashboard"
          className="rounded-[11px] bg-brand-coral px-4 py-2 text-sm font-semibold text-white hover:bg-brand-coral-hover"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center sm:w-[400px]">
      <Image src="/bucketly-lockup.png" alt="Bucketly" width={140} height={139} className="mb-6" />
      <h1 className="mb-1 font-display text-2xl font-extrabold text-text-1">Set a new password</h1>
      <p className="mb-6 text-sm text-text-2">Make it something you&apos;ll remember this time.</p>

      <form onSubmit={handleSubmit} autoComplete="off" className="flex w-full flex-col gap-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold text-text-2">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[11px] border border-line bg-surface-card px-3 py-2 pr-10 text-sm text-text-1 focus:border-brand-teal focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-text-2 hover:text-text-1"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          <p className="mt-1 text-xs text-text-2">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-semibold text-text-2">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-[11px] border border-line bg-surface-card px-3 py-2 text-sm text-text-1 focus:border-brand-teal focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-[11px] bg-brand-coral px-4 py-2 text-sm font-semibold text-white hover:bg-brand-coral-hover disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save new password"}
        </button>
      </form>
    </div>
  );
}
