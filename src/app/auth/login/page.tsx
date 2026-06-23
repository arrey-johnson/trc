"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, Label, PageShell } from "@/components/ui";
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
    }

    router.push("/");
    router.refresh();
  }

  return (
    <PageShell
      title="The Reset Circle App"
      subtitle="Sign in with your email and password."
    >
      <Card>
        <form onSubmit={handleLogin} className="space-y-4">
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-center text-sm text-[var(--muted)]">
            New here?{" "}
            <Link href="/auth/signup" className="font-medium text-emerald-700 underline">
              Create an account
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
              Sign out
            </button>
          </p>
        </form>
      </Card>
    </PageShell>
  );
}
