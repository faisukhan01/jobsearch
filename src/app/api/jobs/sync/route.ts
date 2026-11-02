import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { engineFetch, emitRealtime } from "@/lib/engine";
import { serializeJob } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface EngineJob {
  externalId: string;
  platform: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  employmentType: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  description: string;
  tags: string[];
  easyApply: boolean;
  matchScore: number;
  postedAt: string;
}

interface SyncResponse { platform: string; count: number; jobs: EngineJob[] }
interface ScoredItem { externalId: string; matchScore: number }

/** POST — pull fresh listings from a portal via the engine, score + persist. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { platform?: string };
  const platform = body.platform;
  if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 });

  const connector = await db.connector.findUnique({ where: { platform } });
  if (!connector) return NextResponse.json({ error: "unknown platform" }, { status: 404 });
  if (connector.status !== "connected") {
    return NextResponse.json({ error: `${platform} is not connected — connect it first` }, { status: 409 });
  }

  const [profile, config] = await Promise.all([db.profile.findFirst(), db.automationConfig.findFirst()]);
  const keywords = config?.keywords?.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3).join(", ") || "Software Engineer";

  // 1) Pull listings from the engine connector
  const sync = await engineFetch<SyncResponse>("/sync", {
    method: "POST",
    body: JSON.stringify({ platform, keywords, location: profile?.location ?? "Remote", limit: 40 }),
  });

  // 2) Upsert jobs
  let imported = 0;
  for (const j of sync.jobs) {
    const existing = await db.job.findUnique({ where: { externalId: j.externalId } });
    if (existing) {
      await db.job.update({
        where: { externalId: j.externalId },
        data: { description: j.description, easyApply: j.easyApply, salaryMin: j.salaryMin, salaryMax: j.salaryMax },
      });
    } else {
      await db.job.create({
        data: {
          externalId: j.externalId,
          platform: j.platform,
          title: j.title,
          company: j.company,
          companyLogo: j.company.slice(0, 2).toUpperCase(),
          location: j.location,
          remote: j.remote,
          employmentType: j.employmentType,
          salaryMin: j.salaryMin,
          salaryMax: j.salaryMax,
          currency: j.currency,
          description: j.description,
          tags: JSON.stringify(j.tags),
          easyApply: j.easyApply,
          postedAt: new Date(j.postedAt),
        },
      });
      imported++;
    }
  }

  // 3) Score all jobs for this platform via the matching engine
  const allPlatformJobs = await db.job.findMany({ where: { platform } });
  let scores: ScoredItem[] = [];
  try {
    const match = await engineFetch<{ scored: ScoredItem[] }>("/match", {
      method: "POST",
      body: JSON.stringify({
        profile: {
          skills: JSON.parse(profile?.skills ?? "[]"),
          location: profile?.location ?? "Remote",
          desiredSalary: profile?.desiredSalary ?? 80000,
          experienceYears: profile?.experienceYears ?? 0,
        },
        config: { remoteOnly: config?.remoteOnly ?? false, minSalary: config?.minSalary ?? 0, locations: (config?.locations ?? "").split(",").map((s) => s.trim()) },
        jobs: sync.jobs,
      }),
    });
    scores = match.scored;
  } catch {
    // engine offline — keep existing scores
  }

  const scoreMap = new Map(scores.map((s) => [s.externalId, s.matchScore]));
  let relevant = 0;
  for (const job of allPlatformJobs) {
    const score = scoreMap.get(job.externalId);
    if (score !== undefined) {
      await db.job.update({ where: { id: job.id }, data: { matchScore: score } });
      if (score >= (config?.minMatchScore ?? 70)) relevant++;
    }
  }

  // 4) Update connector + activity
  const updatedConnector = await db.connector.update({
    where: { platform },
    data: { lastSyncAt: new Date(), syncedJobs: { increment: imported } },
  });

  await db.activityLog.create({
    data: { type: "sync", platform, message: `Synced ${sync.count} listings from ${connectorLabel(platform)} — ${imported} new · ${relevant} relevant` },
  });
  await emitRealtime("sync", { platform, imported, total: sync.count, relevant });
  await emitRealtime("activity", {
    type: "sync", platform,
    message: `Synced ${sync.count} listings from ${connectorLabel(platform)} — ${imported} new · ${relevant} relevant`,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    platform,
    total: sync.count,
    imported,
    relevant,
    connector: updatedConnector,
  });
}

function connectorLabel(platform: string): string {
  const labels: Record<string, string> = {
    indeed: "Indeed", linkedin: "LinkedIn", glassdoor: "Glassdoor",
    ziprecruiter: "ZipRecruiter", greenhouse: "Greenhouse", lever: "Lever",
  };
  return labels[platform] ?? platform;
}
