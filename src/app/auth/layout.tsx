import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-emerald-50/40 dark:from-stone-950 dark:via-stone-950 dark:to-emerald-950/20">
      {children}
    </div>
  );
}
