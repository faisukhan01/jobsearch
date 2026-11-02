import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { engineFetch, emitRealtime } from "@/lib/engine";
import { serializeConfig } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await db.automationConfig.findFirst();
  return NextResponse.json({ config: config ? serializeConfig(config) : null });
}

/** PUT — update autopilot preferences. */
export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const current = await db.automationConfig.findFirst();
  if (!current) return NextResponse.json({ error: "config missing" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.keywords === "string") data.keywords = body.keywords;
  if (typeof body.locations === "string") data.locations = body.locations;
  if (typeof body.remoteOnly === "boolean") data.remoteOnly = body.remoteOnly;
  if (typeof body.minSalary === "number") data.minSalary = body.minSalary;
  if (Array.isArray(body.employmentTypes)) data.employmentTypes = JSON.stringify(body.employmentTypes.map(String));
  if (typeof body.dailyLimit === "number") data.dailyLimit = Math.max(1, Math.min(100, body.dailyLimit));
  if (typeof body.minMatchScore === "number") data.minMatchScore = Math.max(0, Math.min(100, body.minMatchScore));
  if (typeof body.autoTailor === "boolean") data.autoTailor = body.autoTailor;
  if (typeof body.autoCoverLetter === "boolean") data.autoCoverLetter = body.autoCoverLetter;

  const config = await db.automationConfig.update({ where: { id: current.id }, data });

  await db.activityLog.create({
    data: { type: "info", message: "Autopilot preferences updated" },
  });
  await emitRealtime("autopilot", { config: serializeConfig(config) });

  return NextResponse.json({ config: serializeConfig(config) });
}

/** PATCH — master autopilot toggle (syncs the engine's in-memory switch). */
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled boolean required" }, { status: 400 });
  }

  const current = await db.automationConfig.findFirst();
  if (!current) return NextResponse.json({ error: "config missing" }, { status: 404 });

  const [config, _engine] = await Promise.all([
    db.automationConfig.update({ where: { id: current.id }, data: { enabled: body.enabled } }),
    engineFetch("/autopilot/" + (body.enabled ? "enable" : "disable"), { method: "POST" }).catch(() => null),
  ]);

  const message = body.enabled
    ? "🚀 Autopilot ENGAGED — hunting and applying to matched jobs on your behalf"
    : "Autopilot paused — no further applications will be sent";
  await db.activityLog.create({ data: { type: body.enabled ? "success" : "info", message } });
  await emitRealtime("autopilot", { enabled: body.enabled });
  await emitRealtime("activity", { type: body.enabled ? "success" : "info", message, createdAt: new Date().toISOString() });

  return NextResponse.json({ config: serializeConfig(config), engineSynced: _engine !== null });
}
