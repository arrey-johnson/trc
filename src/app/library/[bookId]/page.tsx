import { notFound, redirect } from "next/navigation";
import { BookReaderClient } from "@/components/library/BookReaderClient";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, title, page_count")
    .eq("id", params.bookId)
    .eq("is_active", true)
    .maybeSingle();

  if (!book) notFound();

  const { data: progress } = await supabase
    .from("book_reading_progress")
    .select("current_page")
    .eq("book_id", params.bookId)
    .eq("user_id", profile.id)
    .maybeSingle();

  return (
    <BookReaderClient
      bookId={book.id}
      title={book.title}
      pageCount={book.page_count}
      initialPage={progress?.current_page ?? 1}
    />
  );
}
