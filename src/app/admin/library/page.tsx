import Link from "next/link";
import { Card } from "@/components/ui";
import { BookUploadForm } from "@/components/admin/BookUploadForm";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLibraryPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data: books } = await supabase
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });

  const bookIds = (books ?? []).map((b) => b.id);

  const { data: assignmentCounts } = bookIds.length
    ? await supabase.from("book_assignments").select("book_id")
    : { data: [] };

  const countMap = new Map<string, number>();
  for (const a of assignmentCounts ?? []) {
    countMap.set(a.book_id, (countMap.get(a.book_id) ?? 0) + 1);
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Library</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Upload books and assign them to members
        </p>
      </header>

      <Card className="mb-6 space-y-4 p-5">
        <h2 className="font-semibold text-[var(--foreground)]">Upload a book</h2>
        <BookUploadForm />
      </Card>

      {!books?.length ? (
        <Card className="p-5 text-center text-[var(--muted)]">
          No books uploaded yet.
        </Card>
      ) : (
        <ul className="space-y-3">
          {books.map((book) => (
            <li key={book.id}>
              <Link href={`/admin/library/${book.id}`}>
                <Card className="block space-y-2 p-4 transition active:scale-[0.99]">
                  <h2 className="font-semibold text-[var(--foreground)]">
                    {book.title}
                  </h2>
                  {book.author && (
                    <p className="text-sm text-[var(--muted)]">by {book.author}</p>
                  )}
                  <p className="text-xs text-[var(--muted)]">
                    {book.page_count} pages · {countMap.get(book.id) ?? 0} members
                    assigned
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
