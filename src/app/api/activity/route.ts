import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeActivity } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 60), 200);

  const rows = await db.activityLog.findMany({
    where: type && type !== "all" ? { type } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ activity: rows.map(serializeActivity) });
}
