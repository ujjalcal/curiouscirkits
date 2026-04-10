import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";

interface Props {
  params: Promise<{ subdomain: string }>;
}

async function getPortfolioData(subdomain: string) {
  const supabase = createPublicClient();

  // Find the portfolio by subdomain (not soft-deleted)
  const { data: portfolio, error: portfolioError } = await supabase
    .from("portfolios")
    .select("id, name")
    .eq("subdomain", subdomain)
    .is("deleted_at", null)
    .single();

  if (portfolioError || !portfolio) {
    return null;
  }

  // Get the latest published version with rendered HTML
  const { data: version, error: versionError } = await supabase
    .from("portfolio_versions")
    .select("rendered_html, content")
    .eq("portfolio_id", portfolio.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (versionError || !version?.rendered_html) {
    return null;
  }

  return {
    name: portfolio.name,
    tagline: (version.content as { tagline?: string })?.tagline ?? null,
    renderedHtml: version.rendered_html as string,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain } = await params;
  const data = await getPortfolioData(subdomain);

  if (!data) {
    return { title: "Portfolio not found" };
  }

  return {
    title: data.name,
    description: data.tagline ?? `${data.name}'s portfolio`,
  };
}

export default async function PublishedPortfolioPage({ params }: Props) {
  const { subdomain } = await params;
  const data = await getPortfolioData(subdomain);

  if (!data) {
    notFound();
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: data.renderedHtml }}
      style={{ minHeight: "100vh" }}
    />
  );
}
