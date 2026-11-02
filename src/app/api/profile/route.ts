import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProfile } from "@/lib/serialize";
import { broadcastActivity } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await db.profile.findFirst();
  return NextResponse.json({ profile: profile ? serializeProfile(profile) : null });
}

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const data = {
    fullName: String(body.fullName ?? "Job Seeker"),
    email: String(body.email ?? ""),
    phone: body.phone ? String(body.phone) : null,
    location: String(body.location ?? "Remote"),
    headline: body.headline ? String(body.headline) : null,
    summary: body.summary ? String(body.summary) : null,
    skills: JSON.stringify(Array.isArray(body.skills) ? body.skills.map(String) : []),
    experienceYears: Number(body.experienceYears ?? 0),
    desiredSalary: body.desiredSalary ? Number(body.desiredSalary) : null,
    currency: String(body.currency ?? "USD"),
    resumeFileName: body.resumeFileName ? String(body.resumeFileName) : null,
  };

  const existing = await db.profile.findFirst();
  const profile = existing
    ? await db.profile.update({ where: { id: existing.id }, data })
    : await db.profile.create({ data });

  await broadcastActivity(
    async (l) => db.activityLog.create({ data: { type: l.type, platform: l.platform, message: l.message } }),
    "info",
    "Career profile updated — future matches will use the new criteria"
  );

  return NextResponse.json({ profile: serializeProfile(profile) });
}
