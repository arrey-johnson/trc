"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_NAV: {
  href: string;
  label: string;
  exact?: boolean;
}[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/people", label: "People" },
  { href: "/admin/commitment", label: "Commit" },
  { href: "/admin/library", label: "Library" },
  { href: "/admin/forum", label: "Forum" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-4"
      aria-label="Admin navigation"
    >
      <div className="pointer-events-auto mx-auto mb-3 max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] px-1 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-around gap-0.5">
          {ADMIN_NAV.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-10 flex-1 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-[10px] font-semibold transition ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
