"use client";

import { cn } from "@/lib/utils";
import { label, usePlatform, type SectionId } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot, Briefcase, Cpu, Database, LayoutDashboard, Plug, Radar, Rocket,
  ScrollText, Sparkles, Wifi, WifiOff, Zap,
} from "lucide-react";
import { timeAgo } from "./shared";

const NAV: Array<{ id: SectionId; label: string; icon: React.ElementType }> = [
  { id: "overview", label: "Mission Control", icon: LayoutDashboard },
  { id: "jobs", label: "Job Radar", icon: Radar },
  { id: "pipeline", label: "Pipeline", icon: Briefcase },
  { id: "connections", label: "Connections", icon: Plug },
  { id: "studio", label: "AI Studio", icon: Sparkles },
  { id: "activity", label: "Activity", icon: ScrollText },
];

const SECTION_META: Record<SectionId, { title: string; sub: string }> = {
  overview: { title: "Mission Control", sub: "Your job hunt at a glance — autopilot status, momentum and live activity" },
  jobs: { title: "Job Radar", sub: "Fresh listings pulled from your connected portals, ranked by AI match score" },
  pipeline: { title: "Application Pipeline", sub: "Every application the autopilot (and you) have sent, tracked end-to-end" },
  connections: { title: "Portal Connections", sub: "Link your job board accounts — the engine applies through them on your behalf" },
  studio: { title: "AI Studio", sub: "Tailor your resume and generate cover letters per job with one click" },
  activity: { title: "Activity Log", sub: "Everything the platform, the engine and the AI have done, in real time" },
};

export function Shell({ children }: { children: React.ReactNode }) {
  const { section, setSection, engine, config, realtime, ticking, runAutopilotNow } = usePlatform();

  const meta = SECTION_META[section];
  const connected = engine.online;

  return (
    <div className="app-bg min-h-screen flex flex-col">
      <div className="grid-overlay pointer-events-none fixed inset-0" aria-hidden />

      <div className="relative flex flex-1">
        {/* ── Sidebar (desktop) ─────────────────────────────────────── */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/5 bg-black/20 px-3 py-4 backdrop-blur md:flex">
          <div className="mb-6 flex items-center gap-2.5 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <Rocket className="h-5 w-5 text-zinc-950" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">JobPilot</p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Autopilot Platform</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1" aria-label="Primary">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  section === item.id
                    ? "bg-emerald-500/10 text-emerald-300 shadow-[inset_0_0_0_1px_oklch(0.84_0.16_160/15%)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
                aria-current={section === item.id ? "page" : undefined}
              >
                <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", section === item.id && "text-emerald-400")} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-2 px-1">
            <EnginePanel />
            <p className="px-2 text-[10px] text-zinc-600">JobPilot v1.0 · Next 16 · FastAPI · Socket.IO</p>
          </div>
        </aside>

        {/* ── Main column ───────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 border-b border-white/5 bg-black/30 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 py-3 md:px-6">
              <div className="flex items-center gap-2 md:hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
                  <Rocket className="h-4 w-4 text-zinc-950" />
                </div>
                <span className="text-sm font-bold">JobPilot</span>
              </div>

              <div className="hidden min-w-0 md:block">
                <h1 className="truncate text-base font-semibold tracking-tight">{meta.title}</h1>
                <p className="truncate text-xs text-zinc-500">{meta.sub}</p>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <RealtimeBadge />
                <AutopilotPill />
                <Button
                  size="sm"
                  onClick={() => runAutopilotNow()}
                  disabled={ticking || !config?.enabled}
                  className="h-8 gap-1.5 bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                  title={config?.enabled ? "Run an autopilot tick now" : "Enable autopilot first"}
                >
                  {ticking ? <Bot className="h-3.5 w-3.5 animate-pulse" /> : <Zap className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{ticking ? "Running…" : "Run now"}</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-4 pb-10 pt-5 md:px-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>

          {/* Sticky footer */}
          <footer className="mt-auto border-t border-white/5 bg-black/20 px-4 py-3 backdrop-blur md:px-6">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <Cpu className={cn("h-3 w-3", connected ? "text-emerald-400" : "text-rose-400")} />
                Engine {connected ? `v${engine.version ?? "1.0.0"} online` : "offline"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Wifi className={cn("h-3 w-3", realtime === "live" ? "text-emerald-400" : realtime === "connecting" ? "text-amber-400" : "text-zinc-500")} />
                Realtime {realtime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Database className="h-3 w-3 text-violet-400" /> SQLite · Prisma
              </span>
              {engine.simulation && (
                <Badge variant="outline" className="h-4 border-amber-500/25 bg-amber-500/10 px-1.5 text-[9px] text-amber-300">
                  SIMULATION MODE
                </Badge>
              )}
              <span className="ml-auto hidden sm:inline">
                {config?.lastRunAt ? `Last autopilot run ${timeAgo(config.lastRunAt)}` : "Autopilot idle"}
              </span>
            </div>
          </footer>
        </div>
      </div>

      {/* ── Mobile bottom nav ───────────────────────────────────────── */}
      <nav className="sticky bottom-0 z-40 border-t border-white/10 bg-black/60 backdrop-blur-xl md:hidden" aria-label="Mobile">
        <div className="grid grid-cols-6">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                "flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[9px] font-medium",
                section === item.id ? "text-emerald-400" : "text-zinc-500"
              )}
              aria-current={section === item.id ? "page" : undefined}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function EnginePanel() {
  const { engine, stats, config } = usePlatform();
  return (
    <div className="rounded-xl border border-white/5 bg-black/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Engine</span>
        <span className={cn("pulse-dot h-2 w-2 rounded-full", engine.online ? "bg-emerald-400 text-emerald-400" : "bg-rose-400")} />
      </div>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between text-zinc-400">
          <span>FastAPI</span>
          <span className={engine.online ? "text-emerald-400" : "text-rose-400"}>{engine.online ? "healthy" : "down"}</span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>Connectors</span>
          <span>{engine.connectors ?? 6} wired</span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>Applied</span>
          <span className="text-emerald-300">{config?.appliedToday ?? 0}/{config?.dailyLimit ?? 15} today</span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>Interviews</span>
          <span className="text-violet-300">{stats?.interviews ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

function AutopilotPill() {
  const { config, toggleAutopilot } = usePlatform();
  const on = config?.enabled ?? false;
  return (
    <button
      onClick={() => toggleAutopilot()}
      className={cn(
        "flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-all",
        on
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_16px_-4px_oklch(0.84_0.16_160/50%)]"
          : "border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200"
      )}
      aria-pressed={on}
      title="Toggle autopilot"
    >
      <Bot className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Autopilot</span>
      <span className={cn("h-1.5 w-1.5 rounded-full", on ? "pulse-dot bg-emerald-400 text-emerald-400" : "bg-zinc-500")} />
      <span>{on ? "ON" : "OFF"}</span>
    </button>
  );
}

function RealtimeBadge() {
  const { realtime } = usePlatform();
  const map = {
    live: { icon: Wifi, cls: "text-emerald-400", text: "LIVE" },
    connecting: { icon: Wifi, cls: "text-amber-400", text: "…" },
    offline: { icon: WifiOff, cls: "text-zinc-500", text: "OFF" },
  } as const;
  const m = map[realtime];
  return (
    <span className={cn("hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold tracking-wider sm:inline-flex", m.cls)}>
      <m.icon className="h-3 w-3" />
      {m.text}
    </span>
  );
}

export { NAV };
