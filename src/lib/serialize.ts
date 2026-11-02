import type {
  Activity, Application, AutomationConfig, Connector, Job, Profile, Stats, TailoredDocItem,
} from "./types";
import type { ActivityLog, Application as DbApplication, AutomationConfig as DbConfig, Connector as DbConnector, Job as DbJob, Profile as DbProfile } from "@prisma/client";

export function serializeProfile(p: DbProfile): Profile {
  return { ...p, skills: safeParse(p.skills, []), createdAt: iso(p.createdAt), updatedAt: iso(p.updatedAt) };
}

export function serializeConnector(c: DbConnector): Connector {
  return { ...c, lastSyncAt: c.lastSyncAt ? iso(c.lastSyncAt) : null, createdAt: iso(c.createdAt), updatedAt: iso(c.updatedAt) };
}

export function serializeJob(j: DbJob & { hasApplication?: boolean }): Job {
  return {
    ...j,
    tags: safeParse(j.tags, []),
    postedAt: j.postedAt ? iso(j.postedAt) : null,
    createdAt: iso(j.createdAt),
  };
}

export function serializeApplication(a: DbApplication & { job: DbJob }): Application {
  return {
    ...a,
    job: serializeJob(a.job),
    appliedAt: a.appliedAt ? iso(a.appliedAt) : null,
    createdAt: iso(a.createdAt),
    updatedAt: iso(a.updatedAt),
  };
}

export function serializeConfig(c: DbConfig): AutomationConfig {
  return { ...c, employmentTypes: safeParse(c.employmentTypes, ["FULL_TIME"]), lastRunAt: c.lastRunAt ? iso(c.lastRunAt) : null, updatedAt: iso(c.updatedAt) };
}

export function serializeActivity(a: ActivityLog): Activity {
  return { ...a, createdAt: iso(a.createdAt) };
}

export function serializeDoc(d: { id: string; jobId: string | null; kind: string; content: string; model: string | null; createdAt: Date; job?: { title: string; company: string } | null }): TailoredDocItem {
  return {
    id: d.id, jobId: d.jobId, kind: d.kind, content: d.content, model: d.model,
    createdAt: iso(d.createdAt),
    jobTitle: d.job?.title,
    jobCompany: d.job?.company,
  };
}

export function computeStats(
  applications: Application[],
  config: AutomationConfig,
  jobs: Job[]
): Stats {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const byStatus: Record<string, number> = {};
  for (const a of applications) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;

  const applied = byStatus.applied ?? 0;
  const screening = byStatus.screening ?? 0;
  const interview = byStatus.interview ?? 0;
  const offer = byStatus.offer ?? 0;
  const rejected = byStatus.rejected ?? 0;
  const responded = screening + interview + offer + rejected;

  const platformMap = new Map<string, number>();
  for (const a of applications) platformMap.set(a.job.platform, (platformMap.get(a.job.platform) ?? 0) + 1);

  const trend: Stats["trend"] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(startOfDay.getTime() - i * 86400000);
    const next = new Date(day.getTime() + 86400000);
    const count = applications.filter((a) => {
      const t = a.appliedAt ? new Date(a.appliedAt) : null;
      return t && t >= day && t < next;
    }).length;
    trend.push({
      date: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      applied: count,
    });
  }

  const appliedJobIds = new Set(applications.map((a) => a.jobId));
  const topMatches = [...jobs]
    .filter((j) => j.status !== "dismissed" && !appliedJobIds.has(j.id))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6);

  const scored = applications.filter((a) => a.matchScore > 0);

  return {
    totalApplications: applications.length,
    appliedToday: applications.filter((a) => a.appliedAt && new Date(a.appliedAt) >= startOfDay).length,
    interviews: interview,
    offers: offer,
    responseRate: applied > 0 ? Math.round(((screening + interview + offer) / applied) * 100) : 0,
    successRate: applications.length > 0 ? Math.round(((applied - rejected) / applied) * 100) : 0,
    avgMatchScore: scored.length > 0 ? Math.round(scored.reduce((s, a) => s + a.matchScore, 0) / scored.length) : 0,
    byStatus,
    byPlatform: Array.from(platformMap.entries()).map(([platform, count]) => ({ platform, count })).sort((a, b) => b.count - a.count),
    trend,
    topMatches,
  };
}

function safeParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function iso(d: Date): string {
  return d.toISOString();
}
