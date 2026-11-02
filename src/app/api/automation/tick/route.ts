import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { engineFetch, emitRealtime } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface TickApplication {
  status: string;
  method: string;
  matchScore: number;
  appliedAt: string;
  tailoredResume: string | null;
  coverLetter: string | null;
}

interface TickResult {
  applied: Array<{ job: { externalId: string; platform: string; title: string; company: string }; application: TickApplication }>;
  skipped: { belowScore: number; alreadyApplied: number; dailyLimit: number };
  dailyLimitReached: boolean;
  events: Array<{ type: string; platform: string; message: string; ts: string }>;
}

/**
 * POST — one autopilot tick: rank pending candidates via the engine and
 * apply within the daily budget. Called by the dashboard heartbeat and
 * the manual "Run now" button.
 */
export async function POST() {
  const [config, profile] = await Promise.all([db.automationConfig.findFirst(), db.profile.findFirst()]);
  if (!config) return NextResponse.json({ error: "config missing" }, { status: 404 });
  if (!config.enabled) {
    return NextResponse.json({ ok: false, reason: "autopilot is disabled" }, { status: 409 });
  }

  const appliedApps = await db.application.findMany({ select: { jobId: true } });
  const appliedJobIds = new Set(appliedApps.map((a) => a.jobId));

  const candidates = await db.job.findMany({
    where: {
      status: "discovered",
      matchScore: { gte: config.minMatchScore },
      id: { notIn: Array.from(appliedJobIds) },
    },
    orderBy: { matchScore: "desc" },
    take: 40,
  });

  if (candidates.length === 0) {
    await db.automationConfig.update({ where: { id: config.id }, data: { lastRunAt: new Date() } });
    return NextResponse.json({ ok: true, applied: 0, message: "No pending candidates above your match threshold" });
  }

  const alreadyExternal = await db.job.findMany({
    where: { id: { in: Array.from(appliedJobIds) } },
    select: { externalId: true },
  });

  const result = await engineFetch<TickResult>("/autopilot/tick", {
    method: "POST",
    body: JSON.stringify({
      profile: {
        fullName: profile?.fullName ?? "",
        skills: JSON.parse(profile?.skills ?? "[]"),
        location: profile?.location ?? "Remote",
        desiredSalary: profile?.desiredSalary ?? 80000,
        experienceYears: profile?.experienceYears ?? 0,
      },
      config: {
        dailyLimit: config.dailyLimit,
        minMatchScore: config.minMatchScore,
        appliedToday: config.appliedToday,
        autoTailor: config.autoTailor,
        autoCoverLetter: config.autoCoverLetter,
      },
      candidates: candidates.map((j) => ({
        dbId: j.id,
        externalId: j.externalId,
        platform: j.platform,
        title: j.title,
        company: j.company,
        description: j.description ?? "",
        tags: JSON.parse(j.tags ?? "[]"),
        matchScore: j.matchScore,
      })),
      alreadyAppliedIds: alreadyExternal.map((j) => j.externalId),
    }),
  });

  // Persist engine results
  const externalToDb = new Map(candidates.map((j) => [j.externalId, j.id]));
  const created: string[] = [];
  for (const item of result.applied) {
    const jobId = (item.job as { dbId?: string }).dbId ?? externalToDb.get(item.job.externalId);
    if (!jobId) continue;
    await db.application.create({
      data: {
        jobId,
        status: "applied",
        method: "autopilot",
        matchScore: item.application.matchScore,
        coverLetter: item.application.coverLetter,
        tailoredResume: item.application.tailoredResume,
        appliedAt: new Date(item.application.appliedAt),
      },
    });
    created.push(item.job.externalId);
  }

  const remainingBudget = Math.max(0, config.dailyLimit - config.appliedToday);
  const newAppliedToday = config.appliedToday + created.length;

  await db.automationConfig.update({
    where: { id: config.id },
    data: {
      appliedToday: newAppliedToday,
      totalApplied: { increment: created.length },
      lastRunAt: new Date(),
    },
  });

  // Persist + broadcast engine events
  for (const ev of result.events) {
    await db.activityLog.create({
      data: { type: "apply", platform: ev.platform, message: ev.message },
    });
    await emitRealtime("activity", { type: "apply", platform: ev.platform, message: ev.message, createdAt: ev.ts });
    await emitRealtime("application", { platform: ev.platform, message: ev.message, ts: ev.ts });
  }

  if (created.length > 0 && result.dailyLimitReached) {
    const msg = `Daily budget reached (${newAppliedToday}/${config.dailyLimit}) — autopilot will resume tomorrow`;
    await db.activityLog.create({ data: { type: "info", message: msg } });
    await emitRealtime("activity", { type: "info", message: msg, createdAt: new Date().toISOString() });
  }

  return NextResponse.json({
    ok: true,
    applied: created.length,
    skipped: result.skipped,
    dailyLimitReached: result.dailyLimitReached,
    appliedToday: newAppliedToday,
    dailyLimit: config.dailyLimit,
    remainingBudget: Math.max(0, remainingBudget - created.length),
  });
}
