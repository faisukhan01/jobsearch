import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeConnector } from "@/lib/serialize";
import { emitRealtime } from "@/lib/engine";

export const dynamic = "force-dynamic";

const PLATFORM_LABELS: Record<string, string> = {
  indeed: "Indeed", linkedin: "LinkedIn", glassdoor: "Glassdoor",
  ziprecruiter: "ZipRecruiter", greenhouse: "Greenhouse", lever: "Lever",
};

/** PATCH — connect / disconnect a portal or toggle its auto-apply. */
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    platform?: string;
    action?: "connect" | "disconnect" | "autoapply";
    accountEmail?: string;
    autoApply?: boolean;
  };
  if (!body.platform || !body.action) {
    return NextResponse.json({ error: "platform and action required" }, { status: 400 });
  }

  const existing = await db.connector.findUnique({ where: { platform: body.platform } });
  if (!existing) return NextResponse.json({ error: "unknown platform" }, { status: 404 });

  const label = PLATFORM_LABELS[body.platform] ?? body.platform;
  let connector = existing;

  if (body.action === "connect") {
    if (!body.accountEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.accountEmail)) {
      return NextResponse.json({ error: "A valid account email is required to connect" }, { status: 400 });
    }
    connector = await db.connector.update({
      where: { platform: body.platform },
      data: { status: "connected", accountEmail: body.accountEmail, syncedJobs: existing.status === "connected" ? existing.syncedJobs : 0 },
    });
    await db.activityLog.create({
      data: { type: "success", platform: body.platform, message: `${label} account connected (${body.accountEmail}) — ready to sync` },
    });
    await emitRealtime("activity", { type: "success", platform: body.platform, message: `${label} account connected — ready to sync`, createdAt: new Date().toISOString() });
  } else if (body.action === "disconnect") {
    connector = await db.connector.update({
      where: { platform: body.platform },
      data: { status: "disconnected", accountEmail: null, autoApply: false },
    });
    await db.activityLog.create({
      data: { type: "warning", platform: body.platform, message: `${label} account disconnected` },
    });
    await emitRealtime("activity", { type: "warning", platform: body.platform, message: `${label} account disconnected`, createdAt: new Date().toISOString() });
  } else if (body.action === "autoapply") {
    connector = await db.connector.update({
      where: { platform: body.platform },
      data: { autoApply: !!body.autoApply },
    });
    await db.activityLog.create({
      data: { type: "info", platform: body.platform, message: `${label} auto-apply ${body.autoApply ? "enabled" : "disabled"}` },
    });
  }

  return NextResponse.json({ connector: serializeConnector(connector) });
}
