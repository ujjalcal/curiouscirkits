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

  const { content: rawContent, theme, portfolioId: reqPortfolioId, subdomain: reqSubdomain } = body as {
    content: unknown;
    theme: string;
    portfolioId?: string;
    subdomain?: string;
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
  // Derive subdomain: use request value, fall back to name-based slug
  const derivedSubdomain =
    reqSubdomain ||
    content.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Upsert portfolio row first
  const upsertPayload: Record<string, unknown> = {
    user_id: user.id,
    name: content.name,
    content,
    theme,
    subdomain: derivedSubdomain,
    updated_at: new Date().toISOString(),
  };
  // If the client knows the portfolio id, include it so the upsert can match
  if (reqPortfolioId) upsertPayload.id = reqPortfolioId;

  const { data: portfolio, error: portfolioError } = await supabase
    .from("portfolios")
    .upsert(upsertPayload, { onConflict: "user_id" })
    .select("id, subdomain")
    .single();

  if (portfolioError || !portfolio) {
    return NextResponse.json(
      { success: false, error: "Failed to save portfolio" },
      { status: 500 },
    );
  }

  // Insert a published version with rendered HTML
  const { error: versionError } = await supabase
    .from("portfolio_versions")
    .insert({
      portfolio_id: portfolio.id,
      rendered_html: html,
      theme,
      content,
      status: "published",
      published_at: new Date().toISOString(),
    });

  if (versionError) {
    return NextResponse.json(
      { success: false, error: "Failed to save version" },
      { status: 500 },
    );
  }

  const subdomain = portfolio.subdomain ?? derivedSubdomain;

  return NextResponse.json({
    success: true,
    url: `${subdomain}.curiouscirkits.com`,
  });
}
