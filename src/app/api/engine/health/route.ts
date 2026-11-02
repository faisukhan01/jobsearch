import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { engineFetch } from "@/lib/engine";
import { emitRealtime } from "@/lib/engine";
import { serializeActivity } from "@/lib/serialize";

export const dynamic = "force-dynamic";

interface EngineHealthShape {
  status: string;
  version: string;
  simulation: boolean;
  connectors: number;
  autopilot: { enabled: boolean; appliedToday: number };
}

/** GET — engine liveness probe (proxied server-side to port 8000). */
export async function GET() {
  try {
    const health = await engineFetch<EngineHealthShape>("/health");
    return NextResponse.json({ online: true, ...health });
  } catch {
    return NextResponse.json({ online: false });
  }
}

/** POST — log an engine status change into the activity feed. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { message?: string };
  if (body.message) {
    const log = await db.activityLog.create({
      data: { type: "info", message: body.message },
    });
    await emitRealtime("activity", serializeActivity(log));
  }
  return NextResponse.json({ ok: true });
}
