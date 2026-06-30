import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { ButtonLink } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <>
      <div className="mx-auto min-h-screen max-w-md bg-[var(--surface)] px-4 py-5 pb-32">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            href="/admin"
            className="text-sm font-semibold text-brand dark:text-brand-muted"
          >
            Admin
          </Link>
          <div className="flex items-center gap-1">
            <ButtonLink href="/" variant="ghost" className="w-auto px-3 py-2 text-sm">
              ← Member app
            </ButtonLink>
            <AdminLogoutButton />
          </div>
        </div>
        {children}
      </div>
      <AdminNav />
    </>
  );
}
