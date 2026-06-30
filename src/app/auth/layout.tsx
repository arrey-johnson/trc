import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] via-[var(--surface)] to-brand-subtle/60 dark:from-[var(--background)] dark:via-[var(--surface)] dark:to-brand-subtle/40">
      {children}
    </div>
  );
}
