"use client";

import { cn } from "@/lib/utils";
import { label } from "@/lib/store";
import { Globe, MapPin, Zap } from "lucide-react";

/* ─── Match score ring ─────────────────────────────────────────────────── */
export function MatchRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? "#34d399" : score >= 70 ? "#fbbf24" : score >= 50 ? "#a78bfa" : "#71717a";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Match score ${score}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(1 0 0 / 8%)" strokeWidth="3.5" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * score) / 100}
          className="transition-all duration-700"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums"
        style={{ color, fontSize: size * 0.3 }}
      >
        {score}
      </span>
    </div>
  );
}

/* ─── Platform badge ───────────────────────────────────────────────────── */
export function PlatformBadge({ platform, className }: { platform: string; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide border",
      platformTone(platform),
      className
    )}>
      {label(platform)}
    </span>
  );
}

function platformTone(platform: string): string {
  switch (platform) {
    case "indeed": return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
    case "linkedin": return "border-sky-500/25 bg-sky-500/10 text-sky-300";
    case "glassdoor": return "border-teal-500/25 bg-teal-500/10 text-teal-300";
    case "ziprecruiter": return "border-amber-500/25 bg-amber-500/10 text-amber-300";
    case "greenhouse": return "border-lime-500/25 bg-lime-500/10 text-lime-300";
    case "lever": return "border-violet-500/25 bg-violet-500/10 text-violet-300";
    default: return "border-zinc-500/25 bg-zinc-500/10 text-zinc-300";
  }
}

/* ─── Application status ───────────────────────────────────────────────── */
export const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  queued: { label: "Queued", color: "text-zinc-300 bg-zinc-500/10 border-zinc-500/25", dot: "bg-zinc-400" },
  applied: { label: "Applied", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25", dot: "bg-emerald-400" },
  screening: { label: "Screening", color: "text-amber-300 bg-amber-500/10 border-amber-500/25", dot: "bg-amber-400" },
  interview: { label: "Interview", color: "text-violet-300 bg-violet-500/10 border-violet-500/25", dot: "bg-violet-400" },
  offer: { label: "Offer", color: "text-teal-300 bg-teal-500/10 border-teal-500/25", dot: "bg-teal-400" },
  rejected: { label: "Rejected", color: "text-rose-300 bg-rose-500/10 border-rose-500/25", dot: "bg-rose-400" },
  withdrawn: { label: "Withdrawn", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/25", dot: "bg-zinc-500" },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.queued;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.color)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

/* ─── Misc ─────────────────────────────────────────────────────────────── */
export function EasyApplyBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
      <Zap className="h-2.5 w-2.5" /> Easy Apply
    </span>
  );
}

export function formatMoney(min?: number | null, max?: number | null, currency = "USD"): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max)!);
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CompanyAvatar({ name, logo, size = "md" }: { name: string; logo?: string | null; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-8 w-8 text-[10px]" : size === "lg" ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";
  const hue = [...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-lg font-bold text-zinc-100 border border-white/10", dims)}
      style={{ background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.25 0.05 ${hue}))` }}
      aria-hidden
    >
      {logo ?? name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export const ACTIVITY_ICONS: Record<string, string> = {
  apply: "🎯", sync: "🔄", ai: "✨", success: "✅", warning: "⚠️", error: "⛔", info: "ℹ️",
};

export function RemoteBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
      <Globe className="h-3 w-3" /> Remote
    </span>
  );
}

export function LocationText({ location }: { location: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
      <MapPin className="h-3 w-3" /> {location}
    </span>
  );
}

export function SectionTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
