"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Supabase always succeeds here regardless of whether the email is
    // registered -- same anti-enumeration reasoning as the signup flow, so
    // this screen can't be used to check who has an account.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full text-center sm:w-[400px]">
        <h1 className="mb-2 font-display text-2xl font-extrabold text-text-1">Check your email</h1>
        <p className="text-sm text-text-2">
          If there&apos;s an account for <strong>{email}</strong>, we sent a link to reset the password.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-brand-teal-ink underline">
          ← Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center sm:w-[400px]">
      <Image src="/bucketly-lockup.png" alt="Bucketly" width={140} height={139} className="mb-6" />
      <h1 className="mb-1 font-display text-2xl font-extrabold text-text-1">Reset your password</h1>
      <p className="mb-6 text-sm text-text-2">We&apos;ll email you a link to set a new one.</p>

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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-[11px] bg-brand-coral px-4 py-2 text-sm font-semibold text-white hover:bg-brand-coral-hover disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="mt-4 text-sm text-text-2">
        <Link href="/login" className="font-semibold text-brand-teal-ink underline">
          ← Back to login
        </Link>
      </p>
    </div>
  );
}
