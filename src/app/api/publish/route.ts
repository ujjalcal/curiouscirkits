import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { portfolioContentSchema } from "@/lib/content-schema";
import { renderPortfolio, THEME_IDS } from "@/lib/themes/render";

export const maxDuration = 9; // Vercel timeout guard

export async function POST(request: NextRequest) {
  // --- Auth ---
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // --- Parse body ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const { content: rawContent, theme } = body as {
    content: unknown;
    theme: string;
  };

  // --- Validate theme ---
  if (!THEME_IDS.includes(theme as (typeof THEME_IDS)[number])) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid theme. Must be one of: ${THEME_IDS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // --- Validate content with Zod ---
  const parseResult = portfolioContentSchema.safeParse(rawContent);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        issues: parseResult.error.issues,
      },
      { status: 400 },
    );
  }

  const content = parseResult.data;

  // --- Render HTML ---
  let html: string;
  try {
    html = renderPortfolio(theme, content);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Render failed",
      },
      { status: 500 },
    );
  }

  // --- Save to DB (MVP: rendered_html column) ---
  // Upsert portfolio row first
  const { data: portfolio, error: portfolioError } = await supabase
    .from("portfolios")
    .upsert(
      {
        user_id: user.id,
        name: content.name,
        content,
        theme,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("id, subdomain")
    .single();

  if (portfolioError || !portfolio) {
    return NextResponse.json(
      { success: false, error: "Failed to save portfolio" },
      { status: 500 },
    );
  }

  // Insert a version with rendered HTML
  const { error: versionError } = await supabase
    .from("portfolio_versions")
    .insert({
      portfolio_id: portfolio.id,
      rendered_html: html,
      theme,
      content,
      published_at: new Date().toISOString(),
    });

  if (versionError) {
    return NextResponse.json(
      { success: false, error: "Failed to save version" },
      { status: 500 },
    );
  }

  const subdomain = portfolio.subdomain ?? content.name.toLowerCase().replace(/\s+/g, "-");

  return NextResponse.json({
    success: true,
    url: `${subdomain}.curiouscirkits.com`,
  });
}
