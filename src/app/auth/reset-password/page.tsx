"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui";
import { isValidPassword } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setCheckingSession(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const passwordError = isValidPassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    await supabase.auth.signOut();
    router.refresh();
  }

  if (checkingSession) {
    return (
      <AuthShell title="Reset password" subtitle="Loading...">
        <p className="text-sm text-[var(--muted)]">Please wait...</p>
      </AuthShell>
    );
  }

  if (!hasSession) {
    return (
      <AuthShell
        title="Link expired"
        subtitle="This reset link is invalid or has expired."
        footer={
          <Link
            href="/auth/forgot-password"
            className="text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Request a new link
          </Link>
        }
      >
        <p className="text-sm text-[var(--muted)]">
          Password reset links can only be used once. Request a new one and try
          again.
        </p>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        title="Password updated"
        subtitle="Your new password is ready to use."
        footer={
          <Link
            href="/auth/login"
            className="text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Sign in
          </Link>
        }
      >
        <p className="text-sm text-[var(--muted)]">
          Sign in with your new password to continue.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Enter and confirm your new password below."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordInput
          id="password"
          label="New password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={setPassword}
          required
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
        />

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}
