import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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
  const isAdmin = profile.whatsapp_group_role === "admin";

  if (!isAdmin) {
    const { data: assignment } = await supabase
      .from("book_assignments")
      .select("id")
      .eq("book_id", params.bookId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json({ error: "Not assigned" }, { status: 403 });
    }
  }

  const { data: book } = await supabase
    .from("books")
    .select("storage_path")
    .eq("id", params.bookId)
    .maybeSingle();

  if (!book) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("books")
    .createSignedUrl(book.storage_path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Could not load PDF" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: data.signedUrl });
}
