"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/progress", label: "Progress", Icon: ProgressIcon },
  { href: "/forum", label: "Forum", Icon: ForumIcon },
] as const;

const HIDDEN_PREFIXES = ["/auth", "/onboarding"];

export function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-4"
      aria-label="Main navigation"
    >
      <div className="pointer-events-auto mx-auto mb-3 max-w-md rounded-2xl border border-stone-200/80 bg-white px-2 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 flex-1 items-center justify-center rounded-full transition-all duration-200 ${
                  isActive
                    ? "gap-2 bg-emerald-600 px-4 py-2.5 text-white shadow-sm"
                    : "px-3 py-2.5 text-stone-400 hover:text-stone-600"
                }`}
              >
                <item.Icon filled={isActive} />
                {isActive && (
                  <span className="text-sm font-semibold">{item.label}</span>
                )}
                {!isActive && (
                  <span className="sr-only">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

function HomeIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 3.172 3 10.172V20a1 1 0 0 0 1 1h5v-6h6v6h5a1 1 0 0 0 1-1v-9.828L12 3.172Z" />
      </svg>
    );
  }

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function ProgressIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M3 13h2v8H3v-8Zm7-6h2v14h-2V7Zm7 3h2v11h-2V10Z" />
      </svg>
    );
  }

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 20V12M10 20V4M16 20v-8M22 20V8" />
    </svg>
  );
}

function ForumIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M6 4h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 3v-3H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      </svg>
    );
  }

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 5h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-4 3v-3H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M8 9h8M8 12.5h5" />
    </svg>
  );
}
