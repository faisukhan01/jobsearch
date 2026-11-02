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

  // Self-heal: if the AutomationConfig row is missing (fresh DB, reset, etc.),
  // create it with defaults so the dashboard always has a valid control state.
  let configRow = configRows;
  if (!configRow) {
    configRow = await db.automationConfig.create({ data: {
      keywords: "Full Stack Engineer,Senior Software Engineer,Backend Engineer",
      locations: "Remote",
      dailyLimit: 15,
      minMatchScore: 70,
      minSalary: 140000,
      autoTailor: true,
      autoCoverLetter: true,
      enabled: true,
    } });
  }
  const config = serializeConfig(configRow);

  return NextResponse.json({
    profile: profiles ? serializeProfile(profiles) : null,
    connectors: connectors.map(serializeConnector),
    config,
    jobs: serializedJobs,
    applications,
    activity: activity.map(serializeActivity),
    stats: computeStats(applications, config, serializedJobs),
    engine: engine
      ? { online: true, status: engine.status, version: engine.version, simulation: engine.simulation, connectors: engine.connectors, autopilot: engine.autopilot }
      : { online: false },
  });
}
