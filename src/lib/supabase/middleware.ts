import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDefaultAppPath } from "@/lib/auth-routes";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isCronRoute = pathname.startsWith("/api/cron");
  const isPushConfigRoute = pathname.startsWith("/api/push");
  const isPasswordRecoveryRoute =
    pathname === "/auth/reset-password" || pathname === "/auth/callback";
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js";

  if (!user && !isAuthRoute && !isPublicAsset && !isCronRoute && !isPushConfigRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute && !isPasswordRecoveryRoute) {
    const { data: profile } = await supabase
      .from("users")
      .select("onboarding_complete, whatsapp_group_role")
      .eq("id", user.id)
      .maybeSingle();

    const url = request.nextUrl.clone();
    url.pathname = getDefaultAppPath(profile);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/") {
    const { data: profile } = await supabase
      .from("users")
      .select("onboarding_complete, whatsapp_group_role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.whatsapp_group_role === "admin" && profile.onboarding_complete) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
