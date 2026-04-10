import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { portfolioContentSchema } from "@/lib/content-schema";
import { renderPortfolio, THEME_IDS } from "@/lib/themes/render";

export const maxDuration = 9;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { content: rawContent, theme, portfolioId, subdomain: reqSubdomain } = body as {
    content: unknown;
    theme: string;
    portfolioId?: string;
    subdomain?: string;
  };

  if (!THEME_IDS.includes(theme as (typeof THEME_IDS)[number])) {
    return NextResponse.json({ success: false, error: `Invalid theme` }, { status: 400 });
  }

  const parseResult = portfolioContentSchema.safeParse(rawContent);
  if (!parseResult.success) {
    return NextResponse.json({ success: false, error: "Validation failed", issues: parseResult.error.issues }, { status: 400 });
  }
  const content = parseResult.data;

  let html: string;
  try {
    html = renderPortfolio(theme, content);
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Render failed" }, { status: 500 });
  }

  const subdomain = reqSubdomain || content.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Ensure public.users row exists (trigger may have failed)
  const { error: userError } = await supabase
    .from("users")
    .upsert({ id: user.id, email: user.email!, display_name: user.user_metadata?.full_name || user.email }, { onConflict: "id" });

  if (userError) {
    console.error("[publish] users upsert error:", userError);
  }

  // Get or create portfolio
  let pid = portfolioId;
  if (!pid) {
    // Check if user already has a portfolio
    const { data: existing } = await supabase
      .from("portfolios")
      .select("id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .limit(1)
      .single();

    if (existing) {
      pid = existing.id;
      // Update subdomain + name
      await supabase.from("portfolios").update({ name: content.name, subdomain }).eq("id", pid);
    } else {
      // Create new portfolio
      const { data: newPortfolio, error: createError } = await supabase
        .from("portfolios")
        .insert({ user_id: user.id, name: content.name, subdomain })
        .select("id")
        .single();

      if (createError || !newPortfolio) {
        console.error("[publish] portfolio create error:", createError);
        return NextResponse.json({ success: false, error: "Failed to create portfolio: " + (createError?.message || "unknown") }, { status: 500 });
      }
      pid = newPortfolio.id;
    }
  } else {
    // Update existing
    await supabase.from("portfolios").update({ name: content.name, subdomain }).eq("id", pid);
  }

  // Insert published version
  const { error: versionError } = await supabase
    .from("portfolio_versions")
    .insert({
      portfolio_id: pid,
      theme_id: theme,
      content,
      rendered_html: html,
      status: "published",
    });

  if (versionError) {
    console.error("[publish] version insert error:", versionError);
    return NextResponse.json({ success: false, error: "Failed to save version: " + versionError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    url: `/p/${subdomain}`,
    portfolioId: pid,
  });
}
