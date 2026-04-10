"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PreviewInner() {
  const searchParams = useSearchParams();
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    // Try URL param first (base64-encoded), then localStorage
    const encoded = searchParams.get("html");
    if (encoded) {
      try {
        setHtml(atob(encoded));
        return;
      } catch {
        // fall through
      }
    }

    const stored = localStorage.getItem("cc_preview");
    if (stored) {
      try {
        const { content, theme } = JSON.parse(stored);
        // Render client-side by calling the render engine via a small API
        // For MVP we send to /api/preview or render inline.
        // Since the render engine uses Node-only Handlebars, we call a
        // lightweight endpoint. But to keep this zero-API, we build the
        // HTML from the stored data by posting to a temporary endpoint.
        fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, theme, previewOnly: true }),
        })
          .then((r) => r.json())
          .then(() => {
            // For preview without auth, render client-side with a simple template
            // Actually, let's just build a minimal HTML string client-side for preview
            setHtml(buildPreviewHtml(content, theme));
          })
          .catch(() => {
            setHtml(buildPreviewHtml(content, theme));
          });
      } catch {
        // ignore
      }
    }
  }, [searchParams]);

  function handleClose() {
    window.close();
  }

  return (
    <div className="relative h-dvh w-full bg-black/50">
      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        className="fixed right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-white/90 backdrop-blur-xl"
        style={{ background: "rgba(255,255,255,0.18)" }}
      >
        X
      </button>

      {/* Iframe */}
      {html ? (
        <iframe
          srcDoc={html}
          title="Portfolio Preview"
          className="h-full w-full border-0"
          sandbox="allow-same-origin"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-white/60">Loading preview...</p>
        </div>
      )}
    </div>
  );
}

// Simple client-side preview renderer (no Handlebars needed)
function buildPreviewHtml(
  content: { name: string; tagline?: string; sections: Record<string, unknown>[] },
  theme: string,
): string {
  const bg = theme === "bold" ? "#000" : theme === "creative" ? "#faf8f5" : "#fafafa";
  const fg = theme === "bold" ? "#f5f5f7" : "#1d1d1f";
  const muted = theme === "bold" ? "rgba(255,255,255,0.5)" : "#6e6e73";
  const accent = theme === "bold" ? "#64d2ff" : theme === "creative" ? "#c4956a" : "#0066cc";
  const border = theme === "bold" ? "rgba(255,255,255,0.1)" : "#e8e8ed";
  const cardBg = theme === "bold" ? "rgba(255,255,255,0.05)" : "#fff";
  const skillBg = theme === "creative" ? "#efe8df" : cardBg;
  const skillColor = theme === "creative" ? "#6b5d4f" : muted;
  const fontFamily = theme === "creative"
    ? "'Georgia', serif"
    : "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif";

  let sectionsHtml = "";
  for (const section of content.sections) {
    if (section.type === "about") {
      const body = String(section.body ?? "");
      sectionsHtml += `<div style="margin-top:48px"><p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${muted};margin-bottom:12px">About</p><div style="font-size:17px;line-height:1.7;color:${fg}">${escapeHtml(body)}</div></div>`;
    }
    if (section.type === "projects" && Array.isArray(section.items)) {
      const cards = (section.items as { title: string; description: string; link?: string }[])
        .map(
          (p) =>
            `<div style="border:1px solid ${border};background:${cardBg};border-radius:10px;padding:20px"><h3 style="font-size:15px;font-weight:600;color:${fg}">${escapeHtml(p.title)}</h3><p style="font-size:13px;color:${muted};margin-top:4px;line-height:1.6">${escapeHtml(p.description)}</p>${p.link ? `<a href="${escapeHtml(p.link)}" style="font-size:12px;color:${accent};text-decoration:none;margin-top:8px;display:inline-block">View &rsaquo;</a>` : ""}</div>`,
        )
        .join("");
      sectionsHtml += `<div style="margin-top:48px"><p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${muted};margin-bottom:12px">Projects</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">${cards}</div></div>`;
    }
    if (section.type === "skills" && Array.isArray(section.items)) {
      const tags = (section.items as string[])
        .filter(Boolean)
        .map(
          (s) =>
            `<span style="background:${skillBg};border:1px solid ${border};border-radius:9999px;padding:4px 14px;font-size:12px;font-weight:500;color:${skillColor};font-family:-apple-system,sans-serif">${escapeHtml(s)}</span>`,
        )
        .join("");
      sectionsHtml += `<div style="margin-top:48px"><p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${muted};margin-bottom:12px">Skills</p><div style="display:flex;flex-wrap:wrap;gap:6px">${tags}</div></div>`;
    }
    if (section.type === "contact") {
      const email = section.email ? `<a href="mailto:${escapeHtml(String(section.email))}" style="font-size:14px;color:${accent};text-decoration:none">${escapeHtml(String(section.email))}</a>` : "";
      const links = section.links as Record<string, string> | undefined;
      const linkHtml = links
        ? Object.entries(links)
            .filter(([, v]) => v)
            .map(
              ([k, v]) =>
                `<a href="${escapeHtml(v)}" style="font-size:14px;color:${accent};text-decoration:none" target="_blank">${escapeHtml(k.charAt(0).toUpperCase() + k.slice(1))}</a>`,
            )
            .join("")
        : "";
      if (email || linkHtml) {
        sectionsHtml += `<div style="margin-top:48px"><p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${muted};margin-bottom:12px">Contact</p><div style="display:flex;flex-wrap:wrap;gap:16px">${email}${linkHtml}</div></div>`;
      }
    }
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${escapeHtml(content.name)}</title></head><body style="margin:0;font-family:${fontFamily};background:${bg};color:${fg};-webkit-font-smoothing:antialiased"><div style="max-width:720px;margin:0 auto;padding:80px 24px"><h1 style="font-size:48px;font-weight:700;letter-spacing:-2px;line-height:1.1;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif">${escapeHtml(content.name)}</h1>${content.tagline ? `<p style="font-size:17px;color:${muted};margin-top:6px">${escapeHtml(content.tagline)}</p>` : ""}${sectionsHtml}</div></body></html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-black/50">
          <p className="text-sm text-white/60">Loading...</p>
        </div>
      }
    >
      <PreviewInner />
    </Suspense>
  );
}
