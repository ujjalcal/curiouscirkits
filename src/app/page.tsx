import Link from "next/link";

function Nav() {
  return (
    <nav className="glass-nav sticky top-0 z-50 border-b border-border-light">
      <div className="mx-auto flex h-12 max-w-[980px] items-center justify-between px-6">
        <span className="text-lg font-bold tracking-tight">
          CuriousCirkits
        </span>
        <div className="flex items-center gap-7">
          <a href="#how" className="text-xs text-muted hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#pricing" className="text-xs text-muted hover:text-foreground transition-colors">
            Pricing
          </a>
          <Link
            href="/onboarding"
            className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-85"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-[980px] px-6 pt-20 pb-16 text-center">
      <p className="mb-2 text-[17px] text-muted">Made for students.</p>
      <h1 className="mx-auto max-w-[700px] text-[64px] font-bold leading-[1.05] tracking-[-3px]">
        Your story.
        <br />
        Built by AI.
        <br />
        Owned by you.
      </h1>
      <p className="mx-auto mt-4 max-w-[560px] text-[21px] leading-relaxed text-muted">
        Create a professional portfolio in minutes. AI writes the content.
        You make it yours. Free forever.
      </p>
      <div className="mt-7 flex items-center justify-center gap-5">
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-7 py-3 text-[17px] text-white transition-opacity hover:opacity-85"
        >
          Create your portfolio <span className="text-sm">›</span>
        </Link>
        <a
          href="#examples"
          className="text-[17px] text-accent hover:underline"
        >
          See examples <span className="text-xs">›</span>
        </a>
      </div>

      {/* Browser frame with portfolio preview */}
      <div className="mx-auto mt-14 max-w-[840px]">
        <div className="overflow-hidden rounded-xl border border-border-light bg-surface">
          <div className="flex items-center gap-2 border-b border-border-light bg-[#e8e8ed] px-4 py-3">
            <div className="h-2.5 w-2.5 rounded-full bg-border" />
            <div className="h-2.5 w-2.5 rounded-full bg-border" />
            <div className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="flex-1 text-center text-[11px] font-medium text-muted">
              reyan.curiouscirkits.com
            </span>
          </div>
          <div className="p-10 text-left" style={{ background: "#fafafa" }}>
            <h2 className="text-[40px] font-bold leading-tight tracking-[-1.5px]">
              Reyan Bhattacharjee
            </h2>
            <p className="mb-8 text-[17px] text-muted">
              CS student &amp; maker
            </p>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1px] text-subtle">
              Projects
            </p>
            <div className="mb-8 grid grid-cols-2 gap-3">
              {[
                ["StudyBuddy AI", "An AI-powered study companion that adapts to your learning style."],
                ["CodeReview Bot", "Automated code review tool for student projects."],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-[10px] border border-border-light bg-white p-5">
                  <h4 className="text-[15px] font-semibold">{title}</h4>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{desc}</p>
                </div>
              ))}
            </div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1px] text-subtle">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["Python", "React", "TypeScript", "Next.js", "Figma"].map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border-light bg-white px-3 py-1 text-xs font-medium text-muted"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "1",
      title: "Paste & generate",
      desc: "Paste your LinkedIn bio or answer a few questions. AI writes your portfolio in real time.",
    },
    {
      num: "2",
      title: "Customize",
      desc: "Pick a theme. Upload photos. Edit anything. Preview your site before the world sees it.",
    },
    {
      num: "3",
      title: "Publish",
      desc: "Choose your URL. Hit publish. Live in under 60 seconds. Share it everywhere.",
    },
  ];

  return (
    <section id="how" className="mx-auto max-w-[980px] px-6 py-24">
      <div className="mb-12 text-center">
        <h2 className="text-[40px] font-bold tracking-[-1.5px]">
          Three steps. One portfolio.
        </h2>
        <p className="mt-2 text-[17px] text-muted">
          No templates. No coding. No monthly fees.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.num} className="rounded-[18px] bg-surface p-10 text-center">
            <p className="text-[44px] font-bold tracking-[-2px] opacity-15">
              {s.num}
            </p>
            <h3 className="mt-3 text-[19px] font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-[980px] px-6 pb-24">
      <div className="mb-12 text-center">
        <h2 className="text-[40px] font-bold tracking-[-1.5px]">
          Simple pricing.
        </h2>
        <p className="mt-2 text-[17px] text-muted">
          Start free. Upgrade when you&apos;re ready for your own domain.
        </p>
      </div>
      <div className="mx-auto grid max-w-[680px] gap-4 md:grid-cols-2">
        {/* Free tier */}
        <div className="rounded-[18px] bg-surface p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
            Free
          </p>
          <p className="mt-2 text-[48px] font-bold tracking-[-2px]">$0</p>
          <p className="text-sm text-muted">Free forever</p>
          <ul className="mt-6 space-y-2 border-t border-border-light pt-6">
            {["1 portfolio", "AI content generation", "3 themes", "yourname.curiouscirkits.com"].map((f) => (
              <li key={f} className="border-b border-border-light pb-2 text-sm text-muted">
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/onboarding"
            className="mt-6 inline-block text-sm font-medium text-accent"
          >
            Get started ›
          </Link>
        </div>

        {/* Pro tier */}
        <div className="rounded-[18px] bg-foreground p-10 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Pro
          </p>
          <p className="mt-2 text-[48px] font-bold tracking-[-2px]">$29</p>
          <p className="text-sm text-white/50">per year</p>
          <ul className="mt-6 space-y-2 border-t border-white/10 pt-6">
            {["Everything in Free", "Custom domain", "Unlimited portfolios", "Analytics"].map((f) => (
              <li key={f} className="border-b border-white/10 pb-2 text-sm text-white/70">
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/onboarding"
            className="mt-6 inline-block text-sm font-medium text-[#64d2ff]"
          >
            Get started ›
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border-light py-8 text-center text-xs text-subtle">
      <p>CuriousCirkits. Made for students who build.</p>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <HowItWorks />
      <Pricing />
      <Footer />
    </>
  );
}
