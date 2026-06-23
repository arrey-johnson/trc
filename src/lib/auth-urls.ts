export function authCallbackUrl(next = "/"): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }
  return `/auth/callback?next=${encodeURIComponent(next)}`;
}
