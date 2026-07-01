import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isBookVisibleToMember } from "@/lib/books/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { bookId: string } }
) {
  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();
  const { data: book } = await supabase
    .from("books")
    .select(
      "storage_path, format, featured_month, hidden_from_members, is_active"
    )
    .eq("id", params.bookId)
    .eq("is_active", true)
    .maybeSingle();

  if (!book) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    profile.whatsapp_group_role === "member" &&
    !isBookVisibleToMember({
      featuredMonth: book.featured_month,
      hiddenFromMembers: book.hidden_from_members,
      timezone: profile.timezone,
    })
  ) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const admin = createAdminClient();
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
