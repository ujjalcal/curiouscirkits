import { createClient } from "@/lib/supabase/client";
import type { PortfolioContent } from "@/lib/content-schema";

/**
 * Reads the onboarding draft from localStorage, persists it to Supabase
 * (portfolios + portfolio_versions), clears localStorage, and returns
 * the new portfolio ID.  Returns null if there is no draft to save.
 */
export async function saveDraftFromLocalStorage(): Promise<string | null> {
  const raw = localStorage.getItem("cc_draft_content");
  if (!raw) return null;

  let content: PortfolioContent;
  try {
    content = JSON.parse(raw) as PortfolioContent;
  } catch {
    return null;
  }

  const subdomain = localStorage.getItem("cc_draft_subdomain") || undefined;

  const supabase = createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  // Create portfolio row
  const { data: portfolio, error: portfolioError } = await supabase
    .from("portfolios")
    .insert({
      user_id: user.id,
      name: content.name || "My Portfolio",
      subdomain: subdomain || null,
    })
    .select("id")
    .single();

  if (portfolioError || !portfolio) {
    throw new Error(portfolioError?.message ?? "Failed to create portfolio");
  }

  // Create initial version
  const { error: versionError } = await supabase
    .from("portfolio_versions")
    .insert({
      portfolio_id: portfolio.id,
      theme_id: "minimal",
      content: content as unknown as Record<string, unknown>,
      status: "draft",
    });

  if (versionError) {
    throw new Error(versionError.message);
  }

  // Clean up localStorage
  localStorage.removeItem("cc_draft_content");
  localStorage.removeItem("cc_draft_subdomain");

  return portfolio.id;
}
