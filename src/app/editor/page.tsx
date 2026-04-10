"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PortfolioContent } from "@/lib/content-schema";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionType = "hero" | "about" | "projects" | "skills" | "contact";
type ThemeId = "minimal" | "bold" | "creative";
type SaveStatus = "saved" | "saving" | "unsaved" | "error";

const SECTIONS: { id: SectionType; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
];

const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: "minimal", label: "Minimal", swatch: "#fafafa" },
  { id: "bold", label: "Bold", swatch: "#000000" },
  { id: "creative", label: "Creative", swatch: "#faf8f5" },
];

const STORAGE_KEY = "cc_editor_draft";
const ONBOARDING_KEY = "cc_draft_content";

// ---------------------------------------------------------------------------
// Default empty content
// ---------------------------------------------------------------------------

function defaultContent(): PortfolioContent {
  return {
    name: "",
    tagline: "",
    sections: [
      { type: "hero", heading: "", subheading: "" },
      { type: "about", body: "" },
      { type: "projects", items: [{ title: "", description: "" }] },
      { type: "skills", items: [""] },
      { type: "contact", email: "", links: { github: "", linkedin: "", twitter: "", website: "" } },
    ],
  };
}

function getSection<T extends SectionType>(
  content: PortfolioContent,
  type: T,
) {
  return content.sections.find((s) => s.type === type);
}

// ---------------------------------------------------------------------------
// Shared input styles
// ---------------------------------------------------------------------------

const inputClass =
  "w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent focus:ring-1 focus:ring-accent/30";
const labelClass = "mb-1 block text-xs font-medium text-muted";

// ---------------------------------------------------------------------------
// Section forms
// ---------------------------------------------------------------------------

function HeroForm({
  content,
  onChange,
}: {
  content: PortfolioContent;
  onChange: (c: PortfolioContent) => void;
}) {
  const hero = getSection(content, "hero") as
    | Extract<PortfolioContent["sections"][number], { type: "hero" }>
    | undefined;

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Heading</label>
        <input
          className={inputClass}
          placeholder="Your name or headline"
          value={hero?.heading ?? ""}
          onChange={(e) => {
            const updated = { ...content };
            updated.sections = content.sections.map((s) =>
              s.type === "hero" ? { ...s, heading: e.target.value } : s,
            );
            onChange(updated);
          }}
        />
      </div>
      <div>
        <label className={labelClass}>Subheading</label>
        <input
          className={inputClass}
          placeholder="A short tagline"
          value={hero?.subheading ?? ""}
          onChange={(e) => {
            const updated = { ...content };
            updated.sections = content.sections.map((s) =>
              s.type === "hero" ? { ...s, subheading: e.target.value } : s,
            );
            onChange(updated);
          }}
        />
      </div>
    </div>
  );
}

function AboutForm({
  content,
  onChange,
}: {
  content: PortfolioContent;
  onChange: (c: PortfolioContent) => void;
}) {
  const about = getSection(content, "about") as
    | Extract<PortfolioContent["sections"][number], { type: "about" }>
    | undefined;

  return (
    <div>
      <label className={labelClass}>About you</label>
      <textarea
        className={inputClass + " min-h-[160px] resize-y"}
        placeholder="Tell visitors about yourself..."
        value={about?.body ?? ""}
        onChange={(e) => {
          const updated = { ...content };
          updated.sections = content.sections.map((s) =>
            s.type === "about" ? { ...s, body: e.target.value } : s,
          );
          onChange(updated);
        }}
      />
    </div>
  );
}

function ProjectsForm({
  content,
  onChange,
}: {
  content: PortfolioContent;
  onChange: (c: PortfolioContent) => void;
}) {
  const projects = getSection(content, "projects") as
    | Extract<PortfolioContent["sections"][number], { type: "projects" }>
    | undefined;

  const items = projects?.items ?? [];

  function updateItems(
    newItems: { title: string; description: string; link?: string }[],
  ) {
    const updated = { ...content };
    updated.sections = content.sections.map((s) =>
      s.type === "projects" ? { ...s, items: newItems } : s,
    );
    onChange(updated);
  }

  return (
    <div className="space-y-5">
      {items.map((item, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-border-light bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Project {i + 1}
            </span>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => updateItems(items.filter((_, j) => j !== i))}
                className="text-xs text-error hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          <input
            className={inputClass}
            placeholder="Project title"
            value={item.title}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], title: e.target.value };
              updateItems(next);
            }}
          />
          <textarea
            className={inputClass + " min-h-[80px] resize-y"}
            placeholder="Short description"
            value={item.description}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], description: e.target.value };
              updateItems(next);
            }}
          />
          <input
            className={inputClass}
            placeholder="Link (optional)"
            value={item.link ?? ""}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], link: e.target.value };
              updateItems(next);
            }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          updateItems([...items, { title: "", description: "" }])
        }
        className="text-sm font-medium text-accent hover:underline"
      >
        + Add project
      </button>
    </div>
  );
}

function SkillsForm({
  content,
  onChange,
}: {
  content: PortfolioContent;
  onChange: (c: PortfolioContent) => void;
}) {
  const skills = getSection(content, "skills") as
    | Extract<PortfolioContent["sections"][number], { type: "skills" }>
    | undefined;

  const items = skills?.items ?? [];

  function updateItems(newItems: string[]) {
    const updated = { ...content };
    updated.sections = content.sections.map((s) =>
      s.type === "skills" ? { ...s, items: newItems } : s,
    );
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      <label className={labelClass}>Skills (one per row)</label>
      {items.map((skill, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={inputClass}
            placeholder="e.g. TypeScript"
            value={skill}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              updateItems(next);
            }}
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => updateItems(items.filter((_, j) => j !== i))}
              className="shrink-0 text-xs text-error hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => updateItems([...items, ""])}
        className="text-sm font-medium text-accent hover:underline"
      >
        + Add skill
      </button>
    </div>
  );
}

function ContactForm({
  content,
  onChange,
}: {
  content: PortfolioContent;
  onChange: (c: PortfolioContent) => void;
}) {
  const contact = getSection(content, "contact") as
    | Extract<PortfolioContent["sections"][number], { type: "contact" }>
    | undefined;

  function update(patch: Record<string, unknown>) {
    const updated = { ...content };
    updated.sections = content.sections.map((s) =>
      s.type === "contact" ? { ...s, ...patch } : s,
    );
    onChange(updated);
  }

  function updateLink(key: string, value: string) {
    const updated = { ...content };
    updated.sections = content.sections.map((s) =>
      s.type === "contact"
        ? { ...s, links: { ...((s as typeof contact)?.links ?? {}), [key]: value } }
        : s,
    );
    onChange(updated);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Email</label>
        <input
          className={inputClass}
          type="email"
          placeholder="you@example.com"
          value={contact?.email ?? ""}
          onChange={(e) => update({ email: e.target.value })}
        />
      </div>
      <div>
        <label className={labelClass}>GitHub URL</label>
        <input
          className={inputClass}
          placeholder="https://github.com/..."
          value={contact?.links?.github ?? ""}
          onChange={(e) => updateLink("github", e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass}>LinkedIn URL</label>
        <input
          className={inputClass}
          placeholder="https://linkedin.com/in/..."
          value={contact?.links?.linkedin ?? ""}
          onChange={(e) => updateLink("linkedin", e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass}>Twitter URL</label>
        <input
          className={inputClass}
          placeholder="https://twitter.com/..."
          value={contact?.links?.twitter ?? ""}
          onChange={(e) => updateLink("twitter", e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass}>Website URL</label>
        <input
          className={inputClass}
          placeholder="https://..."
          value={contact?.links?.website ?? ""}
          onChange={(e) => updateLink("website", e.target.value)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main editor page
// ---------------------------------------------------------------------------

export default function EditorPage() {
  const [content, setContent] = useState<PortfolioContent>(defaultContent);
  const [theme, setTheme] = useState<ThemeId>("minimal");
  const [activeSection, setActiveSection] = useState<SectionType>("hero");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);
  const supabase = useRef<ReturnType<typeof createClient> | null>(null);
  function getSupabase() {
    if (!supabase.current) supabase.current = createClient();
    return supabase.current;
  }

  // --- Load draft on mount ---
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    async function loadFromSupabase() {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return false;

      // Try to load existing portfolio
      const { data: portfolio } = await sb
        .from("portfolios")
        .select("id, subdomain")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

      if (portfolio) {
        setPortfolioId(portfolio.id);
        setSubdomain(portfolio.subdomain);

        // Load latest version content
        const { data: version } = await sb
          .from("portfolio_versions")
          .select("content, theme_id")
          .eq("portfolio_id", portfolio.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (version) {
          if (version.content) setContent(version.content as PortfolioContent);
          if (version.theme_id) setTheme(version.theme_id as ThemeId);
        }
        return true;
      }

      return false;
    }

    async function init() {
      // 1. Try Supabase first
      const loadedFromDb = await loadFromSupabase().catch(() => false);
      if (loadedFromDb) return;

      // 2. Check onboarding localStorage draft
      const onboardingDraft = localStorage.getItem(ONBOARDING_KEY);
      if (onboardingDraft) {
        try {
          const parsed = JSON.parse(onboardingDraft) as PortfolioContent;
          setContent(parsed);
          localStorage.removeItem(ONBOARDING_KEY);

          // Persist onboarding draft to Supabase
          const sb = getSupabase();
          const { data: { user } } = await sb.auth.getUser();
          if (user) {
            // users row created by auth callback (server-side)

            const draftSubdomain = localStorage.getItem("cc_draft_subdomain") || parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20);

            const { data: portfolio } = await sb
              .from("portfolios")
              .insert({ user_id: user.id, name: parsed.name, subdomain: draftSubdomain })
              .select("id, subdomain")
              .single();

            if (portfolio) {
              setPortfolioId(portfolio.id);
              setSubdomain(portfolio.subdomain);
              localStorage.removeItem("cc_draft_subdomain");
              await sb.from("portfolio_versions").insert({
                portfolio_id: portfolio.id,
                content: parsed,
                theme_id: "minimal",
                status: "draft",
              });
            }
          }
          return;
        } catch {
          // ignore bad data
        }
      }

      // 3. Fall back to editor localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const { content: c, theme: t } = JSON.parse(saved);
          if (c) setContent(c);
          if (t) setTheme(t);
        } catch {
          // ignore
        }
      }
    }

    init();
  }, []);

  // --- Save to Supabase (debounced) ---
  const saveToSupabase = useCallback(
    async (nextContent: PortfolioContent, nextTheme: ThemeId) => {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        // No auth — fall back to localStorage only
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ content: nextContent, theme: nextTheme }),
        );
        setSaveStatus("saved");
        return;
      }

      try {
        // Get or create portfolio
        let pid = portfolioId;
        if (!pid) {
          // Ensure users row
          await sb.from("users").upsert(
            { id: user.id, email: user.email!, display_name: user.user_metadata?.full_name || user.email },
            { onConflict: "id" }
          );

          const { data: existing } = await sb
            .from("portfolios")
            .select("id, subdomain")
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .limit(1)
            .maybeSingle();

          if (existing) {
            pid = existing.id;
            setPortfolioId(pid);
            setSubdomain(existing.subdomain);
          } else {
            const slug = nextContent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20);
            const { data: newP } = await sb
              .from("portfolios")
              .insert({ user_id: user.id, name: nextContent.name, subdomain: slug })
              .select("id, subdomain")
              .single();
            if (!newP) throw new Error("Failed to create portfolio");
            pid = newP.id;
            setPortfolioId(pid);
            setSubdomain(newP.subdomain);
          }
        } else {
          // Update name
          await sb.from("portfolios").update({ name: nextContent.name }).eq("id", pid);
        }

        // Upsert draft version
        const { data: existingDraft } = await sb
          .from("portfolio_versions")
          .select("id")
          .eq("portfolio_id", pid)
          .eq("status", "draft")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingDraft) {
          await sb
            .from("portfolio_versions")
            .update({ content: nextContent, theme_id: nextTheme })
            .eq("id", existingDraft.id);
        } else {
          await sb.from("portfolio_versions").insert({
            portfolio_id: pid,
            content: nextContent,
            theme_id: nextTheme,
            status: "draft",
          });
        }

        // Also keep localStorage as offline cache
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ content: nextContent, theme: nextTheme }),
        );
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    },
    [],
  );

  // --- Auto-save with debounce ---
  const handleChange = useCallback(
    (next: PortfolioContent) => {
      setContent(next);
      setSaveStatus("unsaved");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSaveStatus("saving");
        saveToSupabase(next, theme);
      }, 800);
    },
    [theme, saveToSupabase],
  );

  // Also persist when theme changes
  useEffect(() => {
    if (!loaded.current) return;
    setSaveStatus("saving");
    saveToSupabase(content, theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // --- Publish ---
  async function handlePublish() {
    setPublishing(true);
    setPublishedUrl(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          theme,
          portfolioId,
          subdomain: subdomain ?? content.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishedUrl(data.url);
      } else {
        alert(data.error ?? "Publish failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setPublishing(false);
    }
  }

  // --- Preview ---
  function handlePreview() {
    // Store content for the preview page to read
    localStorage.setItem(
      "cc_preview",
      JSON.stringify({ content, theme }),
    );
    window.open("/preview", "_blank");
  }

  // --- Render active form ---
  function renderForm() {
    switch (activeSection) {
      case "hero":
        return <HeroForm content={content} onChange={handleChange} />;
      case "about":
        return <AboutForm content={content} onChange={handleChange} />;
      case "projects":
        return <ProjectsForm content={content} onChange={handleChange} />;
      case "skills":
        return <SkillsForm content={content} onChange={handleChange} />;
      case "contact":
        return <ContactForm content={content} onChange={handleChange} />;
    }
  }

  const saveLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : "Unsaved";

  return (
    <div className="flex h-dvh flex-col bg-white text-foreground">
      {/* --- Published banner --- */}
      {publishedUrl && (
        <div className="flex h-10 shrink-0 items-center justify-center gap-3 bg-green-50 text-sm text-green-800">
          <span>Published!</span>
          <a
            href={`https://${publishedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            {publishedUrl}
          </a>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`https://${publishedUrl}`);
            }}
            className="rounded border border-green-300 bg-white px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => setPublishedUrl(null)}
            className="ml-1 text-green-500 hover:text-green-700"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {/* --- Top bar --- */}
      <header className="glass-nav flex h-12 shrink-0 items-center justify-between border-b border-border-light px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-bold tracking-tight">
            CuriousCirkits
          </Link>
          <span className="hidden text-xs text-muted md:inline">
            / {content.name || "Untitled portfolio"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[11px] ${saveStatus === "error" ? "text-red-500" : "text-muted"}`}>{saveLabel}</span>
          <button
            type="button"
            onClick={handlePreview}
            className="rounded-full border border-border-light px-4 py-1 text-xs font-medium transition-colors hover:bg-surface"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* --- Sidebar (desktop) --- */}
        <aside className="hidden w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border-light bg-surface/60 p-5 md:flex">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Sections
            </p>
            <nav className="flex flex-col gap-0.5">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                    activeSection === s.id
                      ? "bg-white font-medium text-foreground shadow-sm"
                      : "text-muted hover:bg-white/60"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Theme
            </p>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    theme === t.id
                      ? "border-accent scale-110"
                      : "border-border-light hover:border-muted"
                  }`}
                  style={{ background: t.swatch }}
                />
              ))}
            </div>
          </div>

          {/* Portfolio name */}
          <div>
            <label className={labelClass}>Portfolio name</label>
            <input
              className={inputClass}
              placeholder="Your name"
              value={content.name}
              onChange={(e) =>
                handleChange({ ...content, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass}>Tagline</label>
            <input
              className={inputClass}
              placeholder="Short bio"
              value={content.tagline ?? ""}
              onChange={(e) =>
                handleChange({ ...content, tagline: e.target.value })
              }
            />
          </div>
        </aside>

        {/* --- Mobile tab bar --- */}
        <div className="flex shrink-0 overflow-x-auto border-b border-border-light bg-surface/60 md:hidden">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`whitespace-nowrap px-4 py-2.5 text-xs font-medium transition-colors ${
                activeSection === s.id
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* --- Main form area --- */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="mx-auto max-w-[560px]">
            {/* Mobile-only name/tagline fields */}
            <div className="mb-6 space-y-3 md:hidden">
              <input
                className={inputClass}
                placeholder="Your name"
                value={content.name}
                onChange={(e) =>
                  handleChange({ ...content, name: e.target.value })
                }
              />
              <input
                className={inputClass}
                placeholder="Short tagline"
                value={content.tagline ?? ""}
                onChange={(e) =>
                  handleChange({ ...content, tagline: e.target.value })
                }
              />
              <div className="flex gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`h-7 w-7 rounded-full border-2 ${
                      theme === t.id ? "border-accent" : "border-border-light"
                    }`}
                    style={{ background: t.swatch }}
                  />
                ))}
              </div>
            </div>

            <h2 className="mb-5 text-lg font-semibold capitalize tracking-tight">
              {activeSection}
            </h2>
            {renderForm()}
          </div>
        </main>
      </div>
    </div>
  );
}
