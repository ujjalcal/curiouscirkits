import { describe, it, expect } from "vitest";
import { portfolioContentSchema, validateContent } from "@/lib/content-schema";

const validContent = {
  name: "Reyan Bhattacharjee",
  tagline: "CS student & maker",
  sections: [
    { type: "hero", heading: "Hi, I'm Reyan", subheading: "I build things." },
    { type: "about", body: "I'm a CS student who loves building." },
    {
      type: "projects",
      items: [{ title: "StudyBuddy", description: "AI study companion" }],
    },
    { type: "skills", items: ["Python", "React", "TypeScript"] },
    { type: "contact", email: "reyan@example.com" },
  ],
};

describe("portfolioContentSchema", () => {
  it("accepts valid content with all section types", () => {
    const result = portfolioContentSchema.safeParse(validContent);
    expect(result.success).toBe(true);
  });

  it("accepts content with only required fields", () => {
    const minimal = {
      name: "Test User",
      sections: [{ type: "hero", heading: "Hello" }],
    };
    const result = portfolioContentSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("rejects content with no name", () => {
    const noName = { sections: [{ type: "hero", heading: "Hi" }] };
    const result = portfolioContentSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it("rejects content with empty sections array", () => {
    const empty = { name: "Test", sections: [] };
    const result = portfolioContentSchema.safeParse(empty);
    expect(result.success).toBe(false);
  });

  it("rejects content with invalid section type", () => {
    const bad = {
      name: "Test",
      sections: [{ type: "invalid", heading: "Hi" }],
    };
    const result = portfolioContentSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects about section without body", () => {
    const noBody = {
      name: "Test",
      sections: [{ type: "about" }],
    };
    const result = portfolioContentSchema.safeParse(noBody);
    expect(result.success).toBe(false);
  });
});

describe("validateContent", () => {
  it("returns parsed content on valid input", () => {
    const result = validateContent(validContent);
    expect(result.name).toBe("Reyan Bhattacharjee");
    expect(result.sections).toHaveLength(5);
  });

  it("throws on invalid input", () => {
    expect(() => validateContent({ name: "Test", sections: [] })).toThrow();
  });
});
