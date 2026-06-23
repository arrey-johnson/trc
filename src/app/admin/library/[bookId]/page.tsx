import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberAssignToggle } from "@/components/admin/MemberAssignToggle";
import { AssignAllMembersButton } from "@/components/admin/AssignAllMembersButton";
import { Card } from "@/components/ui";
import { isActiveReader, readingPercent, todayForUser } from "@/lib/books";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface AdminBookPageProps {
  params: { bookId: string };
}

export default async function AdminBookDetailPage({ params }: AdminBookPageProps) {
  const admin = await requireAdmin();
  const supabase = createClient();
  const today = todayForUser(admin.timezone);

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", params.bookId)
    .maybeSingle();

  if (!book) notFound();

  const [{ data: members }, { data: assignments }, { data: progress }, { data: daily }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, display_name")
        .eq("onboarding_complete", true)
        .eq("whatsapp_group_role", "member")
        .order("display_name"),
      supabase
        .from("book_assignments")
        .select("user_id")
        .eq("book_id", params.bookId),
      supabase
        .from("book_reading_progress")
        .select("user_id, current_page, last_read_at")
        .eq("book_id", params.bookId),
      supabase
        .from("book_reading_daily_log")
        .select("user_id, pages_read")
        .eq("book_id", params.bookId)
        .eq("date", today),
    ]);

  const assignedSet = new Set((assignments ?? []).map((a) => a.user_id));
  const dailyMap = new Map((daily ?? []).map((d) => [d.user_id, d.pages_read]));

  const readers = (progress ?? [])
    .map((p) => {
      const member = members?.find((m) => m.id === p.user_id);
      return {
        ...p,
        displayName: member?.display_name ?? "Unknown",
        pagesToday: dailyMap.get(p.user_id) ?? 0,
        percent: readingPercent(p.current_page, book.page_count),
        active: isActiveReader(p.last_read_at),
      };
    })
    .sort((a, b) => b.pagesToday - a.pagesToday);

  return (
    <>
      <Link
        href="/admin/library"
        className="mb-4 inline-flex text-sm font-medium text-indigo-600"
      >
        ← Library
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{book.title}</h1>
        {book.author && (
          <p className="text-sm text-[var(--muted)]">by {book.author}</p>
        )}
        <p className="mt-1 text-sm text-[var(--muted)]">
          {book.page_count} pages · {assignedSet.size} assigned
        </p>
      </header>

      <Card className="mb-6 space-y-3 p-5">
        <h2 className="font-semibold text-[var(--foreground)]">
          Reading activity today
        </h2>
        {!readers.length ? (
          <p className="text-sm text-[var(--muted)]">No reading activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {readers.map((r) => (
              <li
                key={r.user_id}
                className="flex items-center justify-between rounded-xl bg-[var(--elevated)] px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-[var(--foreground)]">
                    {r.displayName}
                    {r.active && (
                      <span className="ml-2 text-xs text-emerald-600">● active</span>
                    )}
                  </span>
                  <p className="text-xs text-[var(--muted)]">
                    {r.percent}% · page {r.current_page}
                    {r.pagesToday > 0 && ` · ${r.pagesToday} pages today`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-semibold text-[var(--foreground)]">Assign members</h2>
        <AssignAllMembersButton
          bookId={book.id}
          memberCount={(members ?? []).length}
        />
        <div className="space-y-2">
          {(members ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No onboarded members yet. Books can still be uploaded and assigned
              later.
            </p>
          ) : (
            (members ?? []).map((m) => (
              <MemberAssignToggle
                key={m.id}
                bookId={book.id}
                userId={m.id}
                displayName={m.display_name}
                assigned={assignedSet.has(m.id)}
              />
            ))
          )}
        </div>
      </Card>
    </>
  );
}
