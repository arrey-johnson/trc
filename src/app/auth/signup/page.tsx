"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, Label, PageShell } from "@/components/ui";
import { isValidPassword, normalizeWhatsAppNumber } from "@/lib/phone";
import { friendlyDbError } from "@/lib/db-errors";
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
      <PageShell
        title="Check your email"
        subtitle="We sent a confirmation link to complete your signup."
      >
        <Card className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Open the link in your email, then come back and{" "}
            <Link href="/auth/login" className="font-medium text-emerald-700 underline">
              sign in
            </Link>
            .
          </p>
          <p className="text-xs text-[var(--muted)]">
            For local testing, you can disable email confirmation in Supabase →
            Authentication → Providers → Email.
          </p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Join The Reset Circle App"
      subtitle="Create your account to start daily check-ins."
    >
      <Card>
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
            <p className="mt-1 text-xs text-[var(--muted)]">
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
            <p className="mt-1 text-xs text-[var(--muted)]">
              Include country code. Used to identify you in group reports.
            </p>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-center text-sm text-[var(--muted)]">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-emerald-700 underline">
              Sign in
            </Link>
          </p>
          <p className="text-center">
            <button
              type="button"
              className="text-xs text-[var(--muted)] underline"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/auth/login");
                router.refresh();
              }}
            >
              Stuck? Sign out and try again
            </button>
          </p>
        </form>
      </Card>
    </PageShell>
  );
}
