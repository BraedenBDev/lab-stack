import { ArrowUpRight, BookText, Boxes, SquareTerminal } from "lucide-react";
import type { ReactNode } from "react";

const REPO = "https://github.com/BraedenBDev/bun-stack";

const STACK = ["Bun", "Hono", "Drizzle", "Better Auth", "React 19", "Vite", "Tailwind v4"];

type Tile = {
  icon: ReactNode;
  title: string;
  desc: string;
  href?: string;
  onClick?: () => void;
};

/** GitHub brand mark (lucide dropped its brand icons, so inline it). */
function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.3-1.8-1.3-1.8-1.1-.7 0-.7 0-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.4-.5-1.6.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 5 18 5.3 18 5.3c.7 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

const TILES: Tile[] = [
  {
    icon: <SquareTerminal className="size-[18px]" />,
    title: "API Docs",
    desc: "Interactive Swagger UI for every route.",
    href: "/api/docs",
  },
  {
    icon: <Boxes className="size-[18px]" />,
    title: "Notes demo",
    desc: "Auth + per-user CRUD, end-to-end typed.",
  },
  {
    icon: <GitHubMark />,
    title: "Source",
    desc: "README, implementation guide, OpenAPI spec.",
    href: REPO,
  },
  {
    icon: <BookText className="size-[18px]" />,
    title: "Deploy",
    desc: "One container — Docker or Coolify.",
    href: `${REPO}#deploying-to-coolify`,
  },
];

/** Staggered fade-up wrapper for the page-load orchestration. */
function In({ delay, children, className = "" }: { delay: number; children: ReactNode; className?: string }) {
  return (
    <div
      className={`motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 ${className}`}
      style={{ animationDuration: "700ms", animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </div>
  );
}

export function Welcome({ onGetStarted }: { onGetStarted: () => void }) {
  const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#fbfaf5] text-neutral-900">
      {/* warm radial glow */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 h-[480px]"
        style={{ background: "radial-gradient(55% 55% at 50% 0%, rgba(245,188,92,0.32), transparent 72%)" }}
      />
      {/* dot grid, faded toward the edges */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(20,18,12,0.10) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(70% 55% at 50% 38%, #000 0%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(70% 55% at 50% 38%, #000 0%, transparent 78%)",
        }}
      />

      <main className="relative mx-auto flex min-h-svh max-w-5xl flex-col px-6 py-10 sm:py-16">
        {/* top bar */}
        <In delay={0} className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-sm font-medium tracking-tight">
            <span className="grid size-6 place-items-center rounded-md bg-neutral-900 text-[13px] text-white">b</span>
            bun-stack
          </div>
          <nav className="flex items-center gap-1 font-mono text-[13px]">
            <a href="/api/docs" className="rounded-md px-3 py-1.5 text-neutral-500 transition-colors hover:bg-neutral-900/5 hover:text-neutral-900">Docs</a>
            <a href={REPO} className="rounded-md px-3 py-1.5 text-neutral-500 transition-colors hover:bg-neutral-900/5 hover:text-neutral-900">GitHub</a>
            <button onClick={onGetStarted} className="rounded-md px-3 py-1.5 text-neutral-500 transition-colors hover:bg-neutral-900/5 hover:text-neutral-900">Sign in</button>
          </nav>
        </In>

        {/* hero + tiles centered together as one block */}
        <div className="flex flex-1 flex-col justify-center gap-12 py-10">
        <div className="flex flex-col">
          <In delay={80}>
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-900/10 bg-white/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 backdrop-blur">
              Almost a Lab · boilerplate
            </span>
          </In>

          <In delay={150}>
            <h1 className="mt-6 flex items-baseline gap-3 text-6xl font-semibold tracking-[-0.04em] sm:text-7xl">
              bun-stack
              <span className="font-mono text-base font-normal tracking-normal text-neutral-400">v0.1.0</span>
            </h1>
          </In>

          <In delay={210}>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-600">
              The full open-source TypeScript stack — one process, one container.
              The fingerprint we fork for every prototype, then ship.
            </p>
          </In>

          {/* faux terminal "it works" */}
          <In delay={280}>
            <div className="mt-8 w-full max-w-md overflow-hidden rounded-xl border border-neutral-900/10 bg-neutral-950 font-mono text-[13px] shadow-[0_24px_60px_-32px_rgba(20,18,12,0.5)]">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                <span className="size-2.5 rounded-full bg-[#febc2e]" />
                <span className="size-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-2 text-[11px] text-white/30">bun run dev</span>
              </div>
              <div className="space-y-1 px-4 py-3 text-white/70">
                <div><span className="text-[#28c840]">●</span> server &nbsp;<span className="text-white/40">localhost:3000</span></div>
                <div><span className="text-[#28c840]">●</span> web &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-white/40">localhost:5173</span></div>
                <div className="text-white/40">○ live on <span className="text-white/70">{host}</span></div>
              </div>
            </div>
          </In>

          {/* stack chips */}
          <In delay={340} className="mt-8 flex flex-wrap gap-2">
            {STACK.map((t) => (
              <span key={t} className="rounded-full border border-neutral-900/10 bg-white/70 px-3 py-1 font-mono text-xs text-neutral-600">
                {t}
              </span>
            ))}
          </In>

          {/* CTAs */}
          <In delay={400} className="mt-9 flex flex-wrap items-center gap-3">
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Get started
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
            <a
              href="/api/docs"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-900/15 bg-white/70 px-5 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-900/30 hover:bg-white"
            >
              Open API docs
            </a>
            <span className="ml-1 font-mono text-[13px] text-neutral-500">
              edit{" "}
              <code className="rounded-md border border-neutral-900/10 bg-white px-1.5 py-0.5 text-neutral-800">src/client/App.tsx</code>{" "}
              to begin
            </span>
          </In>
        </div>

        {/* link tiles */}
        <In delay={480} className="grid grid-cols-1 gap-3 border-t border-neutral-900/10 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((tile) => {
            const inner = (
              <>
                <div className="flex items-center justify-between text-neutral-900">
                  <span className="text-neutral-500 transition-colors group-hover:text-neutral-900">{tile.icon}</span>
                  <ArrowUpRight className="size-4 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neutral-900" />
                </div>
                <div className="mt-4 text-[15px] font-medium tracking-tight">{tile.title}</div>
                <div className="mt-1 text-[13px] leading-snug text-neutral-500">{tile.desc}</div>
              </>
            );
            const cls =
              "group flex flex-col rounded-xl border border-neutral-900/10 bg-white/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-neutral-900/25 hover:bg-white hover:shadow-[0_18px_40px_-28px_rgba(20,18,12,0.55)]";
            return tile.href ? (
              <a key={tile.title} href={tile.href} className={cls}>{inner}</a>
            ) : (
              <button key={tile.title} onClick={tile.onClick ?? onGetStarted} className={cls}>{inner}</button>
            );
          })}
        </In>
        </div>

        <In delay={560} className="mt-6 flex items-center justify-between font-mono text-[11px] text-neutral-400">
          <span>Bun · Hono · Drizzle · Better Auth · React · Vite</span>
          <span>© Almost a Lab</span>
        </In>
      </main>
    </div>
  );
}
