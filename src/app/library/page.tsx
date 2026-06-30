import { redirect } from "next/navigation";
import { ButtonLink, Card, PageShell } from "@/components/ui";
import { readingPercent } from "@/lib/books";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayForUser } from "@/lib/books";

export default async function LibraryPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");

  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  const supabase = createClient();

  const { data: books } = await supabase
    .from("books")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (!books?.length) {
    return (
      <PageShell title="Library" subtitle="Books shared with you">
        <Card className="space-y-3 p-6 text-center">
          <p className="text-4xl" aria-hidden>
            📚
          </p>
          <p className="font-medium text-[var(--foreground)]">No books yet</p>
          <p className="text-sm text-[var(--muted)]">
            Your admin will add books for the group to read together.
          </p>
        </Card>
      </PageShell>
    );
  }

  const today = todayForUser(profile.timezone);
  const bookIds = books.map((book) => book.id);

  const { data: progressList } = await supabase
    .from("book_reading_progress")
    .select("*")
    .eq("user_id", profile.id)
    .in("book_id", bookIds);

  const { data: todayLogs } = await supabase
    .from("book_reading_daily_log")
    .select("book_id, pages_read")
    .eq("user_id", profile.id)
    .eq("date", today)
    .in("book_id", bookIds);

  const progressMap = new Map((progressList ?? []).map((p) => [p.book_id, p]));
  const todayMap = new Map((todayLogs ?? []).map((l) => [l.book_id, l.pages_read]));

  return (
    <PageShell title="Library" subtitle="Books shared with you">
      <ul className="space-y-3">
        {(books ?? []).map((book) => {
          const progress = progressMap.get(book.id);
          const currentPage = progress?.current_page ?? 1;
          const percent = readingPercent(currentPage, book.page_count);
          const pagesToday = todayMap.get(book.id) ?? 0;

          return (
            <li key={book.id}>
              <Card className="space-y-3 p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-lg text-white"
                      aria-hidden
                    >
                      📖
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-[var(--foreground)]">
                        {book.title}
                      </h2>
                      {book.author && (
                        <p className="text-sm text-[var(--muted)]">by {book.author}</p>
                      )}
                      {book.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                          {book.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
                      <span>
                        Page {currentPage} of {book.page_count}
                      </span>
                      <span>{percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--elevated)]">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {pagesToday > 0 && (
                      <p className="mt-2 text-xs text-brand-subtle-fg dark:text-brand-muted">
                        {pagesToday} page{pagesToday === 1 ? "" : "s"} read today
                      </p>
                    )}
                  </div>
                <ButtonLink
                  href={`/library/${book.id}`}
                  className="w-full"
                  prefetch
                >
                  {percent > 0 ? "Continue reading" : "Start reading"}
                </ButtonLink>
              </Card>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
