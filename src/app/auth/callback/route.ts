import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/editor";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Ensure public.users row exists (server-side, bypasses RLS via service role)
        await supabase
          .from("users")
          .upsert(
            {
              id: user.id,
              email: user.email!,
              display_name:
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email!.split("@")[0],
            },
            { onConflict: "id" }
          );

        // Check if user already has a portfolio
        const { data: portfolio } = await supabase
          .from("portfolios")
          .select("id")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();

        if (!portfolio) {
          return NextResponse.redirect(`${origin}/editor?new=true`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
