import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";

const baseBtnStyles =
  "inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-base font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const buttonVariants = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost:
    "bg-transparent text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800",
  danger:
    "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500",
};

type ButtonVariant = keyof typeof buttonVariants;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={`${baseBtnStyles} w-full ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
  prefetch = true,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      scroll={false}
      className={`${baseBtnStyles} ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)] ${className}`}
      {...props}
    />
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
    >
      {children}
    </label>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function PageShell({
  children,
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-[var(--surface)] px-4 py-5 pb-32 transition-colors duration-200">
      {(title || subtitle || action) && (
        <header className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              {title && (
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
              )}
            </div>
            {action}
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
