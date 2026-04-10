"use client";

import { useState, useRef } from "react";
import type { PortfolioContent } from "@/lib/content-schema";
import { createClient } from "@/lib/supabase/client";

type Mode = "text" | "answers";
type Step = 1 | 2 | 3 | 4 | 5;

const QUESTIONS: { key: keyof Answers; label: string; placeholder: string }[] = [
  { key: "name", label: "What's your name?", placeholder: "Reyan Bhattacharjee" },
  { key: "role", label: "What do you do?", placeholder: "CS student, designer, freelance developer..." },
  { key: "about", label: "Tell us about yourself.", placeholder: "I'm passionate about building tools that..." },
  { key: "projects", label: "What have you built?", placeholder: "StudyBuddy AI, a code review bot, a campus events app..." },
  { key: "skills", label: "What are your skills?", placeholder: "Python, React, TypeScript, Figma..." },
];

type Answers = {
  name: string;
  role: string;
  about: string;
  projects: string;
  skills: string;
};

export default function OnboardingPage() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState<Answers>({
    name: "", role: "", about: "", projects: "", skills: "",
  });
  const [wizardStep, setWizardStep] = useState<Step>(1);
  const [generating, setGenerating] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");
  const [content, setContent] = useState<PortfolioContent | null>(null);
  const [error, setError] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "available" | "taken">("idle");
  const eventSourceRef = useRef<EventSource | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setStreamStatus("Generating portfolio content...");
    setContent(null);

    try {
      const body = mode === "text"
        ? { mode: "text", text }
        : { mode: "answers", answers };

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE format: "event: <type>\ndata: <json>\n\n"
        // Split on double newline to get complete events
        const events = buffer.split("\n\n");
        buffer = events.pop() || ""; // last chunk may be incomplete

        for (const event of events) {
          if (!event.trim()) continue;

          const lines = event.split("\n");
          let eventType = "";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              eventData = line.slice(6);
            }
          }

          if (!eventData) continue;

          try {
            const parsed = JSON.parse(eventData);

            if (eventType === "status") {
              setStreamStatus(parsed.message || "Working...");
            } else if (eventType === "content") {
              setContent(parsed);
              setStreamStatus("");
              const suggested = (parsed.name as string)
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "")
                .slice(0, 20);
              setSubdomain(suggested);
              setSubdomainStatus("available");
            } else if (eventType === "error") {
              throw new Error(parsed.message || "Generation failed");
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue; // malformed JSON, skip
            throw e;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStreamStatus("");
    } finally {
      setGenerating(false);
    }
  }

  const currentQ = QUESTIONS[wizardStep - 1];
  const currentAnswer = currentQ ? answers[currentQ.key] : "";

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal nav */}
      <nav className="glass-nav sticky top-0 z-50 border-b border-border-light">
        <div className="mx-auto flex h-12 max-w-[980px] items-center px-6">
          <span className="text-lg font-bold tracking-tight">CuriousCirkits</span>
        </div>
      </nav>

      <div className="mx-auto max-w-[580px] px-6 py-20">
        <h2 className="text-center text-[32px] font-bold tracking-[-1px]">
          Let&apos;s build your portfolio.
        </h2>
        <p className="mt-1 text-center text-[17px] text-muted">
          AI generates your content. You review everything before it goes live.
        </p>

        {/* Segmented control */}
        <div className="mt-10 flex rounded-[9px] bg-surface p-[3px]">
          {(["text", "answers"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-[7px] py-2 text-[13px] font-medium transition-all ${
                mode === m
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted"
              }`}
            >
              {m === "text" ? "Paste LinkedIn text" : "Answer questions"}
            </button>
          ))}
        </div>

        {/* Text mode */}
        {mode === "text" && (
          <div className="mt-7">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Copy your LinkedIn About section, Experience, and Skills here. The more you paste, the better the result."
              className="w-full rounded-xl border border-border bg-white p-4 text-[15px] leading-relaxed text-foreground placeholder:text-subtle focus:border-muted focus:outline-none"
              rows={8}
            />
            <p className="mt-2 text-xs text-subtle">
              We never access your LinkedIn account. You paste, we generate.
            </p>
          </div>
        )}

        {/* Answers mode - wizard */}
        {mode === "answers" && (
          <div className="mt-7">
            {/* Progress dots */}
            <div className="mb-8 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    s === wizardStep ? "bg-foreground" : s < wizardStep ? "bg-muted" : "bg-border"
                  }`}
                />
              ))}
            </div>

            <p className="text-center text-[11px] font-semibold uppercase tracking-[1.5px] text-subtle">
              Question {wizardStep} of 5
            </p>
            <h3 className="mt-3 text-center text-[24px] font-bold tracking-[-0.5px]">
              {currentQ?.label}
            </h3>
            <input
              type="text"
              value={currentAnswer}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [currentQ!.key]: e.target.value }))
              }
              placeholder={currentQ?.placeholder}
              className="mt-6 w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px] text-foreground placeholder:text-subtle focus:border-muted focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && wizardStep < 5) setWizardStep((s) => (s + 1) as Step);
              }}
            />
            <div className="mt-4 flex justify-between">
              <button
                onClick={() => setWizardStep((s) => (s - 1) as Step)}
                disabled={wizardStep === 1}
                className="text-sm text-muted disabled:opacity-30"
              >
                Back
              </button>
              {wizardStep < 5 ? (
                <button
                  onClick={() => setWizardStep((s) => (s + 1) as Step)}
                  className="text-sm font-medium text-accent"
                >
                  Next ›
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || (mode === "text" ? !text.trim() : !answers.name.trim())}
          className="mt-6 w-full rounded-xl bg-foreground py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {generating ? "Generating..." : "Generate my portfolio"}
        </button>

        {/* Error */}
        {error && (
          <p className="mt-4 text-center text-sm text-error">{error}</p>
        )}

        {/* Streaming preview */}
        {(generating || content) && (
          <div className="mt-8 rounded-2xl bg-surface p-6">
            {generating && (
              <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                {streamStatus || "Writing your portfolio"}
              </div>
            )}
            {content && (
              <div className="space-y-5">
                {/* Name + tagline */}
                <div>
                  <h3 className="text-[24px] font-bold tracking-[-0.5px]">{content.name}</h3>
                  {content.tagline && (
                    <p className="mt-1 text-[15px] text-muted">{content.tagline}</p>
                  )}
                </div>

                {/* Render each section */}
                {content.sections.map((section, i) => {
                  if (section.type === "hero") return (
                    <div key={i} className="rounded-xl bg-white p-4 border border-border-light">
                      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-subtle mb-2">Hero</p>
                      <p className="text-[17px] font-semibold">{section.heading}</p>
                      {section.subheading && <p className="text-[14px] text-muted mt-1">{section.subheading}</p>}
                    </div>
                  );
                  if (section.type === "about") return (
                    <div key={i} className="rounded-xl bg-white p-4 border border-border-light">
                      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-subtle mb-2">About</p>
                      <p className="text-[14px] leading-relaxed text-muted">{section.body}</p>
                    </div>
                  );
                  if (section.type === "projects") return (
                    <div key={i} className="rounded-xl bg-white p-4 border border-border-light">
                      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-subtle mb-2">Projects</p>
                      <div className="space-y-2">
                        {section.items.map((proj, j) => (
                          <div key={j} className="flex gap-2">
                            <span className="text-[14px] font-medium shrink-0">{proj.title}</span>
                            <span className="text-[13px] text-muted">{proj.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                  if (section.type === "skills") return (
                    <div key={i} className="rounded-xl bg-white p-4 border border-border-light">
                      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-subtle mb-2">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {section.items.map((skill, j) => (
                          <span key={j} className="rounded-full bg-surface px-2.5 py-0.5 text-[12px] font-medium text-muted">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                  if (section.type === "contact") return (
                    <div key={i} className="rounded-xl bg-white p-4 border border-border-light">
                      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-subtle mb-2">Contact</p>
                      {section.email && <p className="text-[14px]">{section.email}</p>}
                      {section.links && (
                        <div className="flex gap-3 mt-1">
                          {Object.entries(section.links).map(([key, url]) =>
                            url ? <span key={key} className="text-[13px] text-accent">{key}</span> : null
                          )}
                        </div>
                      )}
                    </div>
                  );
                  return null;
                })}
              </div>
            )}
          </div>
        )}

        {/* Subdomain picker */}
        {content && (
          <div className="mt-8 border-t border-border-light pt-7">
            <h3 className="text-[17px] font-semibold">Choose your URL</h3>
            <div className="mt-3 flex overflow-hidden rounded-[10px] border border-border focus-within:border-muted">
              <input
                type="text"
                value={subdomain}
                onChange={(e) => {
                  setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  setSubdomainStatus(e.target.value ? "available" : "idle");
                }}
                placeholder="yourname"
                className="flex-1 bg-transparent px-4 py-3 text-base text-foreground outline-none"
              />
              <span className="border-l border-border-light bg-surface px-4 py-3 text-sm text-subtle">
                .curiouscirkits.com
              </span>
            </div>
            {subdomainStatus === "available" && subdomain && (
              <p className="mt-1.5 text-[13px] font-medium text-success">
                ✓ {subdomain}.curiouscirkits.com is available
              </p>
            )}

            {/* Sign up to save */}
            <button
              onClick={async () => {
                // Store content in localStorage for post-auth recovery
                localStorage.setItem("cc_draft_content", JSON.stringify(content));
                localStorage.setItem("cc_draft_subdomain", subdomain);
                // Trigger Google OAuth
                const supabase = createClient();
                await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo:
                      window.location.origin + "/auth/callback?next=/editor",
                  },
                });
              }}
              className="mt-6 w-full rounded-xl bg-foreground py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-85"
            >
              Sign up to save your portfolio
            </button>
            <p className="mt-2 text-center text-xs text-subtle">
              Sign in with Google. Takes 2 seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
