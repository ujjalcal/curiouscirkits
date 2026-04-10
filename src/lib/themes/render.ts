import Handlebars from "handlebars";
import type { PortfolioContent } from "@/lib/content-schema";

// --- Register helpers ---

Handlebars.registerHelper("eq", function (
  this: unknown,
  a: unknown,
  b: unknown,
  options: Handlebars.HelperOptions,
) {
  return a === b ? options.fn(this) : options.inverse(this);
});

// --- Load and pre-compile templates ---

// We inline the templates at build time via raw imports.
// Next.js + webpack resolve .hbs as raw text when configured,
// but to keep it zero-config we use require with a fs fallback.

import minimalSrc from "./templates/minimal.hbs";
import boldSrc from "./templates/bold.hbs";
import creativeSrc from "./templates/creative.hbs";

const templates: Record<string, HandlebarsTemplateDelegate> = {
  minimal: Handlebars.compile(minimalSrc),
  bold: Handlebars.compile(boldSrc),
  creative: Handlebars.compile(creativeSrc),
};

// --- Asset type (stub for future R2 integration) ---

export interface Asset {
  id: string;
  url: string;
}

// --- Minimal HTML sanitisation for about body ---

function sanitizeHtml(html: string): string {
  // Allow only basic formatting tags, strip everything else
  return html.replace(/<(?!\/?(?:p|br|b|strong|i|em|a|ul|ol|li)\b)[^>]*>/gi, "");
}

// --- Main render function ---

export function renderPortfolio(
  themeId: string,
  content: PortfolioContent,
  _assets: Asset[] = [],
): string {
  const template = templates[themeId];
  if (!template) {
    throw new Error(`Unknown theme: ${themeId}. Available: ${Object.keys(templates).join(", ")}`);
  }

  // Prepare template data — add sanitizedBody to about sections
  const sections = content.sections.map((section) => {
    if (section.type === "about") {
      return { ...section, sanitizedBody: sanitizeHtml(section.body) };
    }
    return section;
  });

  return template({
    name: content.name,
    tagline: content.tagline,
    sections,
  });
}

export const THEME_IDS = ["minimal", "bold", "creative"] as const;
export type ThemeId = (typeof THEME_IDS)[number];
