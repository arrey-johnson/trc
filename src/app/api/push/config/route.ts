import { NextResponse } from "next/server";
import { isPushConfigured } from "@/lib/push/server";

export const dynamic = "force-dynamic";

/** Public VAPID public key for client subscribe (safe to expose). */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey || !isPushConfigured()) {
    return NextResponse.json({ configured: false, publicKey: null });
  }

  return NextResponse.json({ configured: true, publicKey });
}
