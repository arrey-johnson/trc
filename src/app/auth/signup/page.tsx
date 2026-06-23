"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button, Input, Label } from "@/components/ui";
import { friendlyDbError } from "@/lib/db-errors";
import { isValidPassword, normalizeWhatsAppNumber } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);

  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }

    const phone = normalizeWhatsAppNumber(whatsapp);
    if (phone.length < 8) {
      setError("Please enter a valid WhatsApp number with country code.");
      return;
    }

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

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          phone_number: phone,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user && data.session) {
      const { error: profileError } = await supabase.from("users").insert({
        id: data.user.id,
        email: email.trim().toLowerCase(),
        display_name: displayName.trim(),
        phone_number: phone,
        onboarding_complete: false,
      });

      if (profileError) {
        setError(friendlyDbError(profileError.message, profileError.code));
        setLoading(false);
        return;
      }

      router.push("/onboarding");
      router.refresh();
      return;
    }

    setLoading(false);
    setConfirmEmail(true);
  }

  if (confirmEmail) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="We sent a confirmation link to finish creating your account."
        footer={
          <Link
            href="/auth/login"
            className="text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-4 text-sm text-[var(--muted)]">
          <p>
            Open the link in your inbox, then return here and sign in to get
            started.
          </p>
          <p className="rounded-xl bg-[var(--elevated)] px-3 py-2 text-xs">
            For local testing, you can disable email confirmation in Supabase →
            Authentication → Providers → Email.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Join the circle"
      subtitle="Create your account to log daily habits, share progress, and grow with your group."
      footer={
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              Sign in
            </Link>
          </p>
          <button
            type="button"
            className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/auth/login");
              router.refresh();
            }}
          >
            Stuck? Sign out and try again
          </button>
        </div>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <Label htmlFor="displayName">Your name</Label>
          <Input
            id="displayName"
            autoComplete="name"
            placeholder="e.g. Arrey J."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            Shown on your WhatsApp report — use the name your group knows.
          </p>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="whatsapp">WhatsApp number</Label>
          <Input
            id="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+237 6XX XXX XXX"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            required
          />
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            Include country code. Used to identify you in group reports.
          </p>
        </div>

        <PasswordInput
          id="password"
          label="Password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={setPassword}
          required
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm password"
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
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
