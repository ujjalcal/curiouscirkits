import { describe, it, expect } from "vitest";
import { renderPortfolio } from "@/lib/themes/render";

// Helper to render a minimal portfolio with an about section body
function renderAbout(body: string): string {
  return renderPortfolio("minimal", {
    name: "Test",
    sections: [{ type: "about", body }],
  });
}

describe("HTML sanitization in about section", () => {
  it("preserves allowed tags (p, b, i, em, a, ul, ol, li)", () => {
    const html = renderAbout("<p>Hello <b>world</b> <i>italic</i></p>");
    expect(html).toContain("<p>Hello <b>world</b> <i>italic</i></p>");
  });

  it("strips script tags", () => {
    const html = renderAbout('<p>Safe</p><script>alert("xss")</script>');
    expect(html).not.toContain("<script");
    // Note: current regex sanitizer leaves text content behind (alert text remains)
    // This is a known gap — DOMPurify replacement is planned (TODOS.md)
  });

  it("strips img tags with onerror", () => {
    const html = renderAbout('<img onerror="fetch(\'evil.com\')" src="x">');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror");
  });

  it("strips iframe tags", () => {
    const html = renderAbout('<iframe src="https://evil.com"></iframe>');
    expect(html).not.toContain("<iframe");
  });

  it("strips svg tags with onload", () => {
    const html = renderAbout('<svg onload="alert(1)"><circle></circle></svg>');
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("onload");
  });
});

describe("renderPortfolio", () => {
  it("renders minimal theme with valid content", () => {
    const html = renderPortfolio("minimal", {
      name: "Test User",
      tagline: "Builder",
      sections: [{ type: "about", body: "Hello world" }],
    });
    expect(html).toContain("Test User");
    expect(html).toContain("Hello world");
  });

  it("throws on unknown theme", () => {
    expect(() =>
      renderPortfolio("nonexistent", {
        name: "Test",
        sections: [{ type: "hero", heading: "Hi" }],
      })
    ).toThrow("Unknown theme: nonexistent");
  });

  it("renders all three themes without errors", () => {
    const content = {
      name: "Test",
      sections: [
        { type: "hero" as const, heading: "Hi" },
        { type: "about" as const, body: "About me" },
        { type: "skills" as const, items: ["JS", "TS"] },
      ],
    };
    for (const theme of ["minimal", "bold", "creative"]) {
      expect(() => renderPortfolio(theme, content)).not.toThrow();
    }
  });
});
