import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isBookVisibleToMember } from "@/lib/books/format";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadBookForReader(bookId: string, profile: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const supabase = createClient();
  const { data: book } = await supabase
    .from("books")
    .select(
      "storage_path, format, featured_month, hidden_from_members, is_active"
    )
    .eq("id", bookId)
    .eq("is_active", true)
    .maybeSingle();

  if (!book) {
    return { error: "Not found" as const, status: 404 as const };
  }

  if (
    profile.whatsapp_group_role === "member" &&
    !isBookVisibleToMember({
      featuredMonth: book.featured_month,
      hiddenFromMembers: book.hidden_from_members,
      timezone: profile.timezone,
    })
  ) {
    return { error: "Not available" as const, status: 404 as const };
  }

  return { book };
}

export async function GET(
  request: Request,
  { params }: { params: { bookId: string } }
) {
  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loaded = await loadBookForReader(params.bookId, profile);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  const { book } = loaded;
  const wantsMeta = new URL(request.url).searchParams.get("meta") === "1";

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: "Book file access is not configured on this server." },
      { status: 500 }
    );
  }

  const admin = createAdminClient();

  if (wantsMeta) {
    const { data, error } = await admin.storage
      .from("books")
      .createSignedUrl(book.storage_path, 3600);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message ?? "Could not load book file" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: data.signedUrl,
      format: book.format,
    });
  }

  const { data, error } = await admin.storage
    .from("books")
    .download(book.storage_path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not load book file" },
      { status: 500 }
    );
  }

  const contentType =
    book.format === "pdf" ? "application/pdf" : "application/epub+zip";

  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${book.storage_path}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
