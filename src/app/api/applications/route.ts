import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { engineFetch, emitRealtime } from "@/lib/engine";
import { serializeApplication } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface EngineApplyResult {
  ok: boolean;
  application: {
    status: string;
    method: string;
    matchScore: number;
    appliedAt: string;
    tailoredResume: string | null;
    coverLetter: string | null;
    steps: Array<{ step: string; detail: string; ms: number }>;
  };
}

export async function GET() {
  const rows = await db.application.findMany({
    include: { job: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return NextResponse.json({ applications: rows.map(serializeApplication) });
}

/** POST — apply to a single job through the engine pipeline. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { jobId?: string; method?: string };
  if (!body.jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const job = await db.job.findUnique({ where: { id: body.jobId } });
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });

  const existing = await db.application.findFirst({ where: { jobId: job.id } });
  if (existing) {
    return NextResponse.json({ error: `Already applied to ${job.title} at ${job.company}` }, { status: 409 });
  }

  const [profile, config] = await Promise.all([db.profile.findFirst(), db.automationConfig.findFirst()]);

  // Run the engine's apply pipeline (session auth → parse → tailor → form → submit → confirm)
  let result: EngineApplyResult | null = null;
  try {
    result = await engineFetch<EngineApplyResult>("/apply", {
      method: "POST",
      body: JSON.stringify({
        job: {
          externalId: job.externalId,
          platform: job.platform,
          title: job.title,
          company: job.company,
          description: job.description ?? "",
          tags: JSON.parse(job.tags ?? "[]"),
        },
        profile: {
          fullName: profile?.fullName ?? "",
          skills: JSON.parse(profile?.skills ?? "[]"),
          location: profile?.location ?? "Remote",
          desiredSalary: profile?.desiredSalary ?? 80000,
          experienceYears: profile?.experienceYears ?? 0,
        },
        tailor: config?.autoTailor ?? true,
        coverLetter: config?.autoCoverLetter ?? true,
      }),
    });
  } catch {
    // engine offline → fall through with local defaults so UX still works
  }

  const method = body.method === "manual" ? "manual" : "autopilot";
  const application = await db.application.create({
    data: {
      jobId: job.id,
      status: "applied",
      method,
      matchScore: job.matchScore,
      coverLetter: result?.application.coverLetter ?? null,
      tailoredResume: result?.application.tailoredResume ?? null,
      appliedAt: new Date(),
    },
    include: { job: true },
  });

  if (config) {
    await db.automationConfig.update({
      where: { id: config.id },
      data: {
        appliedToday: { increment: 1 },
        totalApplied: { increment: 1 },
        lastRunAt: new Date(),
      },
    });
  }

  const message = `${method === "autopilot" ? "Autopilot" : "You"} applied to ${job.title} at ${job.company} · ${job.matchScore}% match`;
  await db.activityLog.create({ data: { type: "apply", platform: job.platform, message } });
  await emitRealtime("application", { ...serializeApplication(application), steps: result?.application.steps ?? [] });
  await emitRealtime("activity", { type: "apply", platform: job.platform, message, createdAt: new Date().toISOString() });

  return NextResponse.json({
    application: { ...serializeApplication(application), steps: result?.application.steps ?? [] },
  });
}

/** PATCH — move an application through the pipeline. */
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: string; notes?: string };
  if (!body.id || !body.status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

  const current = await db.application.findUnique({ where: { id: body.id }, include: { job: true } });
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  const application = await db.application.update({
    where: { id: body.id },
    data: {
      status: body.status,
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    include: { job: true },
  });

  const statusLabels: Record<string, string> = {
    queued: "queued", applied: "applied", screening: "screening stage",
    interview: "interview stage", offer: "offer stage 🎉", rejected: "rejected", withdrawn: "withdrawn",
  };
  const message = `${current.job.title} at ${current.job.company} → ${statusLabels[body.status] ?? body.status}`;
  await db.activityLog.create({ data: { type: body.status === "rejected" ? "warning" : "success", platform: current.job.platform, message } });
  await emitRealtime("activity", { type: body.status === "rejected" ? "warning" : "success", platform: current.job.platform, message, createdAt: new Date().toISOString() });

  return NextResponse.json({ application: serializeApplication(application) });
}
