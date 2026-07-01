import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import { isBookVisibleToMember } from "@/lib/books/format";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const BookReaderClient = dynamic(
  () =>
    import("@/components/library/BookReaderClient").then(
      (mod) => mod.BookReaderClient
    ),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 text-[var(--muted)]">
        Loading reader…
      </div>
    ),
  }
);

interface BookPageProps {
  params: { bookId: string };
}

export default async function BookReadPage({ params }: BookPageProps) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");

  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  const supabase = createClient();

  const { data: book } = await supabase
    .from("books")
    .select("id, title, page_count, format, featured_month, hidden_from_members")
    .eq("id", params.bookId)
    .eq("is_active", true)
    .maybeSingle();

  if (!book) notFound();

  if (
    profile.whatsapp_group_role === "member" &&
    !isBookVisibleToMember({
      featuredMonth: book.featured_month,
      hiddenFromMembers: book.hidden_from_members,
      timezone: profile.timezone,
    })
  ) {
    notFound();
  }

  const { data: progress } = await supabase
    .from("book_reading_progress")
    .select("current_page, epub_location")
    .eq("book_id", params.bookId)
    .eq("user_id", profile.id)
    .maybeSingle();

  const isEpub = book.format === "epub";

  return (
    <BookReaderClient
      bookId={book.id}
      title={book.title}
      format={book.format}
      pageCount={book.page_count}
      initialPage={progress?.current_page ?? (isEpub ? 0 : 1)}
      initialEpubLocation={progress?.epub_location ?? null}
    />
  );
}
