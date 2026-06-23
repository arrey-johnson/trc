import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { processBookUpload } from "@/lib/admin/upload-book";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete || profile.whatsapp_group_role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const result = await processBookUpload(formData, profile);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ bookId: result.bookId });
}
