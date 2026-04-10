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
      // Check if the user already has a portfolio
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: portfolio } = await supabase
          .from("portfolios")
          .select("id")
          .eq("user_id", user.id)
          .single();

        // Redirect to onboarding if no portfolio exists yet
        if (!portfolio) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth code exchange failed — redirect to home
  return NextResponse.redirect(`${origin}/`);
}
