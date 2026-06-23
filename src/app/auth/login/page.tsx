"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button, Input, Label } from "@/components/ui";
import { getDefaultAppPath } from "@/lib/auth-routes";
import { friendlyDbError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/client";

async function ensureUserProfile(
  supabase: ReturnType<typeof createClient>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
) {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return { error: null };

  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "";
  const phoneNumber =
    typeof user.user_metadata?.phone_number === "string"
      ? user.user_metadata.phone_number
      : "";

  const { error } = await supabase.from("users").insert({
    id: user.id,
    email: user.email ?? "",
    display_name: displayName,
    phone_number: phoneNumber,
    onboarding_complete: false,
  });

  return { error };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await ensureUserProfile(supabase, data.user);
      if (profileError) {
        setError(friendlyDbError(profileError.message, profileError.code));
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("onboarding_complete, whatsapp_group_role")
        .eq("id", data.user.id)
        .maybeSingle();

      router.push(getDefaultAppPath(profile));
    } else {
      router.push("/");
    }
    router.refresh();
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your daily check-ins and stay accountable with your circle."
      footer={
        <p className="text-sm text-[var(--muted)]">
          New here?{" "}
          <Link
            href="/auth/signup"
            className="font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
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
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            hideLabel
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={setPassword}
            required
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
