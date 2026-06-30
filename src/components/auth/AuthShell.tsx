import Image from "next/image";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8 pb-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-muted/25 blur-3xl dark:bg-brand/15" />
        <div className="absolute bottom-0 right-0 h-48 w-48 translate-x-1/4 rounded-full bg-orange-300/20 blur-3xl dark:bg-orange-800/10" />
        <div className="absolute left-0 top-1/3 h-40 w-40 -translate-x-1/4 rounded-full bg-pink-300/20 blur-3xl dark:bg-pink-900/10" />
      </div>

      <header className="relative mb-8 flex flex-col items-center text-center">
        <div className="mb-5 flex h-[104px] w-[104px] items-center justify-center rounded-[28px] bg-white p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.08)] ring-1 ring-stone-200/80 dark:bg-stone-900 dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] dark:ring-stone-700">
          <Image
            src="/icons/icon-512.png"
            alt="The Reset Circle"
            width={88}
            height={88}
            priority
            className="h-[88px] w-[88px] rounded-[20px]"
          />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-subtle-fg dark:text-brand-muted">
          The Reset Circle
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--muted)]">
            {subtitle}
          </p>
        )}
      </header>

      <div className="relative rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.25)]">
        {children}
      </div>

      {footer && <div className="relative mt-6 text-center">{footer}</div>}
    </div>
  );
}
