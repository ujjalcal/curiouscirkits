import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Skip auth when Supabase isn't configured (local dev without env vars)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Public API route — allow without auth (AI-first auth flow)
  if (pathname.startsWith("/api/ai/generate")) {
    return supabaseResponse;
  }

  // Protected routes: /editor and /api/*
  const isProtected =
    pathname.startsWith("/editor") || pathname.startsWith("/api");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return Response.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
