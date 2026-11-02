"use client";

import { usePlatform, label } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { MomentumChart } from "@/components/platform/chart";
import { MatchRing, PlatformBadge, timeAgo, formatMoney, ACTIVITY_ICONS } from "./shared";
import { cn } from "@/lib/utils";
import {
  Activity, Bot, CalendarCheck, DollarSign, Filter, Globe, Pause, Play, Send,
  Target, TrendingUp, Zap,
} from "lucide-react";

export function Overview() {
  const { stats, config, toggleAutopilot, runAutopilotNow, ticking, quickApply, setSection } = usePlatform();
  if (!stats || !config) return null;

  const budgetPct = Math.min(100, Math.round((config.appliedToday / Math.max(1, config.dailyLimit)) * 100));
  const keywords = config.keywords.split(",").map((k) => k.trim()).filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={Send} label="Total Applications" value={stats.totalApplications} hint={`${stats.appliedToday} today`} tone="emerald" />
        <StatCard icon={CalendarCheck} label="Interviews" value={stats.interviews} hint={`${stats.offers} offer${stats.offers === 1 ? "" : "s"}`} tone="violet" />
        <StatCard icon={TrendingUp} label="Response Rate" value={`${stats.responseRate}%`} hint="screens + interviews" tone="amber" />
        <StatCard icon={Target} label="Avg Match" value={`${stats.avgMatchScore}%`} hint="across all sends" tone="teal" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Autopilot control ─────────────────────────────────── */}
        <Card className="glow-card border-emerald-500/15 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-400" />
                Autopilot Engine
              </span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider",
                config.enabled ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-zinc-600/40 bg-zinc-500/10 text-zinc-400")}>
                {config.enabled ? "ENGAGED" : "STANDBY"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 p-3">
              <div>
                <p className="text-sm font-medium">{config.enabled ? "Applying on your behalf" : "Autopilot is paused"}</p>
                <p className="text-xs text-zinc-500">
                  {config.enabled ? "Engine hunts, tailors & applies" : "Flip the switch to engage"}
                </p>
              </div>
              <Switch checked={config.enabled} onCheckedChange={() => toggleAutopilot()} aria-label="Toggle autopilot" />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Daily budget</span>
                <span className="font-semibold tabular-nums text-emerald-300">{config.appliedToday} / {config.dailyLimit}</span>
              </div>
              <Progress value={budgetPct} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <PrefChip icon={Filter} text={`Min ${config.minMatchScore}% match`} />
              <PrefChip icon={Globe} text={config.remoteOnly ? "Remote only" : "Any location"} />
              <PrefChip icon={DollarSign} text={`$${Math.round(config.minSalary / 1000)}k+ salary`} />
              <PrefChip icon={Zap} text={config.autoTailor ? "AI tailoring ON" : "AI tailoring off"} />
            </div>

            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((k) => (
                  <Badge key={k} variant="outline" className="border-white/10 bg-white/5 text-[10px] font-normal text-zinc-300">{k}</Badge>
                ))}
              </div>
            )}

            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-zinc-500">{config.lastRunAt ? `Last run ${timeAgo(config.lastRunAt)}` : "Never run"}</p>
              <Button size="sm" disabled={ticking || !config.enabled} onClick={() => runAutopilotNow()}
                className="h-8 gap-1.5 bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
                {config.enabled ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {ticking ? "Running…" : "Run tick"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Momentum chart ────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                14-Day Momentum
              </span>
              <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 text-[10px] text-emerald-300">
                {stats.trend.reduce((s, t) => s + t.applied, 0)} applications
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <MomentumChart data={stats.trend} />
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/5 pt-3 text-[11px] text-zinc-500">
              {stats.byPlatform.slice(0, 5).map((p) => (
                <span key={p.platform} className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {label(p.platform)} · {p.count}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* ── Top matches ───────────────────────────────────────── */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-400" /> Today&apos;s Best Matches</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-400 hover:text-emerald-300" onClick={() => setSection("jobs")}>
                View all →
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topMatches.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-500">No pending matches — sync a portal or lower your match threshold.</p>
            )}
            {stats.topMatches.map((job) => (
              <div key={job.id} className="group flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 p-3 transition-colors hover:border-emerald-500/20">
                <MatchRing score={job.matchScore} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{job.title}</p>
                  <p className="truncate text-xs text-zinc-500">{job.company} · {job.location}</p>
                </div>
                <div className="hidden sm:block">
                  <PlatformBadge platform={job.platform} />
                </div>
                <div className="hidden text-right md:block">
                  <p className="text-xs font-medium text-emerald-300">{formatMoney(job.salaryMin, job.salaryMax, job.currency)}</p>
                  <p className="text-[10px] text-zinc-500">{timeAgo(job.postedAt)}</p>
                </div>
                <Button size="sm" variant="outline"
                  className="h-8 shrink-0 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                  onClick={() => quickApply(job.id)}>
                  Apply
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Live activity ─────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> Live Feed</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-400 hover:text-emerald-300" onClick={() => setSection("activity")}>
                Full log →
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 space-y-2.5 overflow-y-auto firefox-scroll pr-1">
              <ActivityPreview />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone }: {
  icon: React.ElementType; label: string; value: number | string; hint: string; tone: "emerald" | "violet" | "amber" | "teal";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    teal: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  };
  return (
    <Card className="p-4 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
          <p className="mt-0.5 text-[10px] text-zinc-600">{hint}</p>
        </div>
        <div className={cn("rounded-lg border p-2", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function PrefChip({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/5 bg-white/5 px-2 py-1.5 text-[11px] text-zinc-300">
      <Icon className="h-3 w-3 text-zinc-500" /> {text}
    </span>
  );
}

function ActivityPreview() {
  const { activity } = usePlatform();
  if (activity.length === 0) return <p className="py-6 text-center text-sm text-zinc-500">No activity yet.</p>;
  return activity.slice(0, 12).map((a) => (
    <div key={a.id} className="flex items-start gap-2.5 text-xs">
      <span className="mt-0.5 text-sm leading-none">{ACTIVITY_ICONS[a.type] ?? "•"}</span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-zinc-300">{a.message}</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">{a.platform ? label(a.platform) + " · " : ""}{timeAgo(a.createdAt)}</p>
      </div>
    </div>
  ));
}
