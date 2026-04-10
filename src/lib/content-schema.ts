import { z } from "zod";

// --- Section schemas (discriminated union on "type") ---

const heroSection = z.object({
  type: z.literal("hero"),
  heading: z.string(),
  subheading: z.string().optional(),
  image_asset_id: z.string().optional(),
});

const aboutSection = z.object({
  type: z.literal("about"),
  body: z.string(),
});

const projectItem = z.object({
  title: z.string(),
  description: z.string(),
  image_asset_id: z.string().optional(),
  link: z.string().optional(),
});

const projectsSection = z.object({
  type: z.literal("projects"),
  items: z.array(projectItem),
});

const skillsSection = z.object({
  type: z.literal("skills"),
  items: z.array(z.string()),
});

const contactSection = z.object({
  type: z.literal("contact"),
  email: z.string().optional(),
  links: z
    .object({
      github: z.string().optional(),
      linkedin: z.string().optional(),
      twitter: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
});

const sectionSchema = z.discriminatedUnion("type", [
  heroSection,
  aboutSection,
  projectsSection,
  skillsSection,
  contactSection,
]);

// --- Portfolio content schema ---

export const portfolioContentSchema = z.object({
  name: z.string(),
  tagline: z.string().optional(),
  sections: z.array(sectionSchema).min(1),
});

export type PortfolioContent = z.infer<typeof portfolioContentSchema>;

/** Validate raw data against the portfolio content schema. Throws on failure. */
export function validateContent(data: unknown): PortfolioContent {
  return portfolioContentSchema.parse(data);
}
