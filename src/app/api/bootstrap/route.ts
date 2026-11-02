import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  computeStats, serializeActivity, serializeApplication, serializeConfig, serializeConnector, serializeJob, serializeProfile,
} from "@/lib/serialize";
import { engineFetch } from "@/lib/engine";

export const dynamic = "force-dynamic";

interface EngineHealthShape {
  status: string;
  version: string;
  simulation: boolean;
  connectors: number;
  autopilot: { enabled: boolean; appliedToday: number };
}

/** One-shot bootstrap payload for the dashboard. */
export async function GET() {
  const [profiles, connectors, configRows, jobs, applicationRows, activity, engine] = await Promise.all([
    db.profile.findFirst(),
    db.connector.findMany({ orderBy: { platform: "asc" } }),
    db.automationConfig.findFirst(),
    db.job.findMany({ orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }], take: 200 }),
    db.application.findMany({ include: { job: true }, orderBy: { createdAt: "desc" }, take: 300 }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    engineFetch<EngineHealthShape>("/health").catch(() => null),
  ]);

  const applications = applicationRows.map(serializeApplication);
  const appliedJobIds = new Set(applicationRows.map((a) => a.jobId));
  const serializedJobs = jobs.map((j) => serializeJob({ ...j, hasApplication: appliedJobIds.has(j.id) }));
  const config = configRows ? serializeConfig(configRows) : null;

  return NextResponse.json({
    profile: profiles ? serializeProfile(profiles) : null,
    connectors: connectors.map(serializeConnector),
    config,
    jobs: serializedJobs,
    applications,
    activity: activity.map(serializeActivity),
    stats: config ? computeStats(applications, config, serializedJobs) : null,
    engine: engine
      ? { online: true, status: engine.status, version: engine.version, simulation: engine.simulation, connectors: engine.connectors, autopilot: engine.autopilot }
      : { online: false },
  });
}
