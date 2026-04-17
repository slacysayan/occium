import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  Link2,
  Linkedin,
  PenSquare,
  ShieldCheck,
  Sparkles,
  Youtube,
} from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { workspaceRoutes } from "../lib/routes";

const moduleMap = [
  {
    title: "Channel graph",
    description: "Connect YouTube and LinkedIn destinations without leaving the workspace.",
    icon: Link2,
  },
  {
    title: "AI Studio",
    description: "Turn rough prompts or imported source material into channel-ready drafts.",
    icon: Sparkles,
  },
  {
    title: "Queue control",
    description: "See every scheduled asset, what is pending, and what is already in motion.",
    icon: CalendarClock,
  },
  {
    title: "Performance view",
    description: "Track connected account health and live channel momentum from one screen.",
    icon: BarChart3,
  },
];

const platformCards = [
  {
    title: "One command surface",
    description:
      "Occium replaces the usual sprawl of docs, prompt tabs, creator tools, and scheduling views with one shared operating layer.",
    icon: LayoutDashboard,
  },
  {
    title: "Drafting that stays operational",
    description:
      "AI support is embedded directly into the publishing workflow so strategy, creation, and execution do not drift apart.",
    icon: PenSquare,
  },
  {
    title: "Governed publishing motion",
    description:
      "Create, review, schedule, and monitor content with clear status transitions instead of disconnected handoffs.",
    icon: ShieldCheck,
  },
  {
    title: "Signal after launch",
    description:
      "Pull channel analytics and post activity into the same system so teams can adjust the next move from real performance.",
    icon: BarChart3,
  },
];

const workflowSteps = [
  {
    title: "Connect channels",
    description: "Bring destination accounts into the workspace and keep channel readiness visible from the start.",
    icon: Link2,
  },
  {
    title: "Shape the narrative",
    description: "Use AI Studio and source imports to turn ideas, videos, and notes into polished channel-native drafts.",
    icon: Sparkles,
  },
  {
    title: "Schedule with confidence",
    description: "Move the right assets into the queue, choose timing, and keep status visible for every stakeholder.",
    icon: CalendarClock,
  },
  {
    title: "Measure what moves",
    description: "Review live post motion and connected channel analytics so the next campaign starts sharper.",
    icon: BarChart3,
  },
];

const channelCards = [
  {
    title: "YouTube operations",
    description: "Import source videos, prepare publish-ready metadata, and keep channel status tied to the wider content plan.",
    icon: Youtube,
    accent: "from-red-400/20 via-red-500/8 to-transparent",
    badge: "Video pipeline",
  },
  {
    title: "LinkedIn publishing",
    description: "Draft clean professional posts, manage account connections, and keep messaging consistent with the rest of the campaign.",
    icon: Linkedin,
    accent: "from-sky-400/20 via-sky-500/8 to-transparent",
    badge: "Thought leadership",
  },
  {
    title: "AI-guided creation",
    description: "Switch from blank-page chaos to a structured drafting flow that helps operators move quickly without losing tone.",
    icon: Sparkles,
    accent: "from-amber-300/18 via-amber-300/8 to-transparent",
    badge: "Creation layer",
  },
];

const outcomeCards = [
  {
    value: "1",
    label: "shared workspace",
    description: "A single command layer for creation, scheduling, and channel visibility.",
  },
  {
    value: "2",
    label: "publishing surfaces",
    description: "Coordinate YouTube and LinkedIn from the same operating rhythm.",
  },
  {
    value: "4",
    label: "core workflows unified",
    description: "Connect, draft, schedule, and measure without tool-switching drag.",
  },
];

const principleList = [
  "Built for founder-led brands, content operators, and enterprise teams proving out a repeatable motion.",
  "Designed to feel premium and calm on the surface while staying operationally sharp underneath.",
  "Clear information hierarchy, glassmorphic depth, and structured product framing tuned for conversion.",
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const LandingPage = () => (
  <div id="top" className="relative min-h-screen overflow-x-clip text-white">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-gradient-to-b from-[#071119]/55 via-[#071119]/25 to-transparent" />
    <div className="pointer-events-none absolute left-1/2 top-[22rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/10 blur-[130px]" />
    <div className="pointer-events-none absolute inset-x-0 top-[48rem] h-[32rem] bg-gradient-to-b from-transparent via-[#f4ede0]/6 to-transparent" />

    <header className="sticky top-0 z-30 px-4 pt-4 md:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-[#091521]/52 px-4 py-3 shadow-[0_18px_55px_rgba(2,8,13,0.22)] backdrop-blur-2xl md:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <img src="/branding/occium-mark.webp" alt="" className="h-7 w-7 object-contain" />
          </div>
          <span className="text-xl font-semibold tracking-[-0.055em]">Occium</span>
        </Link>

        <div className="hidden items-center gap-7 text-sm text-white/60 md:flex">
          <a href="#platform" className="transition-colors hover:text-white">
            Platform
          </a>
          <a href="#workflow" className="transition-colors hover:text-white">
            Workflow
          </a>
          <a href="#channels" className="transition-colors hover:text-white">
            Channels
          </a>
          <a href="#proof" className="transition-colors hover:text-white">
            Outcomes
          </a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#workflow"
            className="hidden rounded-full border border-white/12 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/24 hover:text-white md:inline-flex"
          >
            See workflow
          </a>
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950 transition-transform hover:scale-[1.02]"
          >
            Sign in <ArrowRight size={16} />
          </Link>
        </div>
      </nav>
    </header>

    <main className="relative z-10 px-4 pb-24 pt-10 md:px-8 md:pb-28">
      <section className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-5xl"
        >
          <div className="rounded-[2rem] border border-white/10 bg-[rgba(10,18,28,0.7)] p-4 shadow-[0_42px_120px_rgba(2,8,13,0.28)] backdrop-blur-[30px] md:p-6">
            <div className="grid gap-4 lg:grid-cols-[0.92fr,1.08fr]">
              <div className="space-y-3">
                {moduleMap.map((item, index) => {
                  const Icon = item.icon;
                  const isPrimary = index === 1;

                  return (
                    <div
                      key={item.title}
                      className={`rounded-[1.4rem] border p-4 transition-colors ${
                        isPrimary ? "border-white/16 bg-white/10" : "border-white/8 bg-black/10"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white">
                          <Icon size={19} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-medium tracking-tight text-white">{item.title}</h3>
                            {isPrimary && (
                              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-100">
                                Live focus
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-white/52">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-[1.7rem] border border-white/12 bg-white/[0.92] p-5 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Campaign command screen</p>
                    <h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                      Launch without losing control
                    </h3>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                      See channel readiness, draft velocity, and queue health in one premium surface that stays aligned to the live
                      product experience.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white">
                    Workspace preview
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <PreviewMetric label="Connected accounts" value="2" note="YouTube + LinkedIn" />
                  <PreviewMetric label="Drafts in motion" value="12" note="Across active campaigns" />
                  <PreviewMetric label="Queue clarity" value="Clear" note="Every publish date visible" />
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-[1fr,0.72fr]">
                  <div className="rounded-[1.45rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Active flow</p>
                    <div className="mt-4 space-y-3">
                      {workflowSteps.slice(0, 3).map((step, index) => (
                        <div key={step.title} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                            0{index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-950">{step.title}</p>
                            <p className="text-xs text-slate-500">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.45rem] border border-slate-200 bg-[linear-gradient(180deg,#0F1721_0%,#172635_100%)] p-4 text-white">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Operator notes</p>
                    <div className="mt-4 space-y-3">
                      {[
                        "Channel connections stay visible at the point of creation.",
                        "AI Studio helps teams move faster without breaking tone.",
                        "Queue status becomes a source of truth instead of an afterthought.",
                      ].map((note) => (
                        <div key={note} className="flex items-start gap-2 rounded-2xl border border-white/8 bg-white/6 px-3 py-3">
                          <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-amber-200" />
                          <p className="text-xs leading-5 text-white/76">{note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.72, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-14 max-w-5xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.36em] text-amber-100/70">Enterprise content operations</p>
          <h1 className="mt-6 text-[clamp(3.4rem,8vw,6.75rem)] font-semibold leading-[0.94] tracking-[-0.07em] text-white">
            The operating system for high-conviction content motion
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/66 md:text-xl">
            Occium turns channel connections, AI drafting, scheduling, and performance visibility into one cinematic command layer so
            teams can ship faster and sell the product with more clarity.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signin"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-medium text-slate-950 transition-transform hover:scale-[1.02]"
            >
              Enter the workspace <ArrowRight size={18} />
            </Link>
            <a
              href="#platform"
              className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/6 px-7 py-3.5 text-base text-white/88 backdrop-blur-xl transition-colors hover:border-white/24 hover:bg-white/10"
            >
              Explore the platform
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-white/56">
            {["Founder-led brands", "Content ops teams", "Enterprise pilot programs"].map((chip) => (
              <span key={chip} className="rounded-full border border-white/10 bg-black/10 px-4 py-2 backdrop-blur-lg">
                {chip}
              </span>
            ))}
          </div>
        </motion.div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {outcomeCards.map((item, index) => (
            <GlassCard key={item.label} className="p-6" delay={0.1 + index * 0.05}>
              <p className="text-5xl font-semibold tracking-[-0.06em] text-white">{item.value}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.24em] text-amber-100/65">{item.label}</p>
              <p className="mt-4 text-sm leading-6 text-white/52">{item.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="platform" className="mx-auto mt-28 max-w-7xl scroll-mt-28">
        <div className="grid gap-10 lg:grid-cols-[0.9fr,1.1fr] lg:gap-16">
          <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs uppercase tracking-[0.34em] text-amber-100/65">Platform mapping</p>
            <h2 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              Enterprise structure, mapped to the product you already have
            </h2>
            <p className="text-base leading-8 text-white/62 md:text-lg">
              The landing experience mirrors the application itself: calm lunar backdrop, premium glass depth, and a layout that makes
              Occium feel operationally credible instead of concept-only.
            </p>

            <div className="rounded-[1.7rem] border border-white/10 bg-black/14 p-6 backdrop-blur-2xl">
              <p className="text-sm font-medium text-white">What buyers understand immediately</p>
              <div className="mt-5 space-y-3">
                {[
                  "Where content comes from",
                  "How drafts get shaped",
                  "How publishing gets governed",
                  "How the team sees what is working",
                ].map((line) => (
                  <div key={line} className="flex items-center gap-3 text-sm text-white/66">
                    <CheckCircle2 size={16} className="text-amber-200" />
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {platformCards.map((card, index) => (
              <GlassCard key={card.title} delay={0.08 + index * 0.05}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white">
                  <card.icon size={22} />
                </div>
                <h3 className="mt-6 text-2xl font-medium tracking-tight text-white">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-white/52">{card.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto mt-28 max-w-7xl scroll-mt-28">
        <GlassCard className="rounded-[2rem] p-7 md:p-10" delay={0.12}>
          <div className="grid gap-10 lg:grid-cols-[0.82fr,1.18fr] lg:gap-14">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-amber-100/65">Workflow</p>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                From source material to scheduled motion, without cross-tool drift
              </h2>
              <p className="mt-5 text-base leading-8 text-white/58 md:text-lg">
                Occium turns what is usually a messy chain of handoffs into one visible operating rhythm. That is the difference between
                making content and running content as a system.
              </p>

              <div className="mt-8 space-y-3">
                {principleList.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-amber-200" />
                    <p className="text-sm leading-6 text-white/70">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {workflowSteps.map((step, index) => (
                <div key={step.title} className="rounded-[1.6rem] border border-white/10 bg-black/12 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white">
                      <step.icon size={20} />
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.24em] text-white/34">0{index + 1}</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-medium tracking-tight text-white">{step.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/54">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </section>

      <section id="channels" className="mx-auto mt-28 max-w-7xl scroll-mt-28">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-amber-100/65">Channels and craft</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              A sales-ready story, grounded in the product reality
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-8 text-white/58 md:text-right md:text-lg">
            The landing page frames Occium the way enterprise buyers expect: focused messaging, clear channel coverage, and a direct
            path into the live workspace.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {channelCards.map((card, index) => (
            <GlassCard key={card.title} className="p-0" delay={0.1 + index * 0.05}>
              <div className={`h-full rounded-[1.45rem] bg-gradient-to-br ${card.accent} p-6`}>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                    <card.icon size={22} />
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/14 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/72">
                    {card.badge}
                  </span>
                </div>
                <h3 className="mt-8 text-2xl font-medium tracking-tight text-white">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-white/58">{card.description}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="proof" className="mx-auto mt-28 max-w-7xl scroll-mt-28">
        <div className="grid gap-8 lg:grid-cols-[0.95fr,1.05fr]">
          <GlassCard className="p-8 md:p-10" delay={0.12}>
            <p className="text-xs uppercase tracking-[0.34em] text-amber-100/65">Outcomes</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              Built to make the product easier to understand and easier to buy
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/58 md:text-lg">
              This structure gives Occium the kind of top-level narrative enterprise websites use: a clear operating thesis, a product
              map, a workflow model, and visible proof of where value shows up.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <OutcomeLine icon={Clock3} title="Less context switching" description="One place to connect, create, queue, and review." />
              <OutcomeLine
                icon={FileText}
                title="Sharper storytelling"
                description="A headline-to-workflow narrative that explains the product before a demo even starts."
              />
              <OutcomeLine
                icon={CalendarClock}
                title="Cleaner operations"
                description="Scheduling and queue visibility stay tied to the creation system."
              />
              <OutcomeLine
                icon={BarChart3}
                title="Feedback with signal"
                description="Connected analytics help teams learn from what ships, not just what gets drafted."
              />
            </div>
          </GlassCard>

          <GlassCard className="p-8 md:p-10" delay={0.16}>
            <p className="text-xs uppercase tracking-[0.34em] text-amber-100/65">Conversion close</p>
            <h3 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
              The product already feels premium. Now the front door does too.
            </h3>
            <p className="mt-5 text-base leading-8 text-white/58 md:text-lg">
              The landing experience now speaks in the same visual language as the application: moonlit backdrop, cool glass surfaces,
              focused enterprise copy, and a clear progression into the workspace.
            </p>

            <div className="mt-8 rounded-[1.7rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-white/38">Recommended next action</p>
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl bg-black/10 px-4 py-4">
                  <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-amber-200" />
                  <p className="text-sm leading-6 text-white/72">
                    Use the landing page as the new entry route for demos, outbound links, and product storytelling.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-black/10 px-4 py-4">
                  <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-amber-200" />
                  <p className="text-sm leading-6 text-white/72">
                    Route active operators into the workspace instantly with a single click, so marketing and product stay connected.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      <section className="mx-auto mt-28 max-w-7xl">
        <GlassCard className="rounded-[2rem] px-8 py-10 text-center md:px-12 md:py-14" delay={0.18}>
          <p className="text-xs uppercase tracking-[0.36em] text-amber-100/65">Ready to use</p>
          <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
            Sell the system, then step directly into it
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/58 md:text-lg">
            Occium now has a marketing surface that matches the application aesthetic and gives buyers a structured reason to keep going.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signin"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-medium text-slate-950 transition-transform hover:scale-[1.02]"
            >
              Open the product workspace <ArrowRight size={18} />
            </Link>
            <a
              href="#top"
              className="inline-flex items-center gap-2 rounded-full border border-white/14 px-7 py-3.5 text-base text-white/88 transition-colors hover:border-white/24 hover:bg-white/8"
            >
              Back to top
            </a>
          </div>
        </GlassCard>
      </section>

      <footer className="mx-auto mt-28 max-w-7xl px-8 pb-12">
        <div className="flex flex-col items-center justify-between gap-8 border-t border-white/10 pt-12 md:flex-row">
          <Link to="/" className="flex items-center gap-3 opacity-60 transition-opacity hover:opacity-100">
            <img src="/branding/occium-mark.webp" alt="" className="h-6 w-6 object-contain" />
            <span className="text-lg font-semibold tracking-tight">Occium</span>
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-white/40">
            <a href="#platform" className="transition-colors hover:text-white">Platform</a>
            <a href="#workflow" className="transition-colors hover:text-white">Workflow</a>
            <Link to="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="transition-colors hover:text-white">Terms of Service</Link>
          </div>

          <p className="text-sm text-white/25">© 2026 Occium. Built for founders.</p>
        </div>
      </footer>
    </main>
  </div>
);

const PreviewMetric = ({ label, value, note }) => (
  <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
    <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{value}</p>
    <p className="mt-2 text-xs text-slate-500">{note}</p>
  </div>
);

const OutcomeLine = ({ icon: Icon, title, description }) => (
  <div className="rounded-[1.45rem] border border-white/10 bg-white/5 p-5">
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white">
      <Icon size={20} />
    </div>
    <h3 className="mt-5 text-lg font-medium text-white">{title}</h3>
    <p className="mt-3 text-sm leading-6 text-white/54">{description}</p>
  </div>
);

export default LandingPage;
