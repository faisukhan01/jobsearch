import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeJob } from "@/lib/serialize";
import { emitRealtime } from "@/lib/engine";

export const dynamic = "force-dynamic";

/** GET — list jobs with optional filters. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform");
  const q = url.searchParams.get("q");
  const remote = url.searchParams.get("remote");
  const minScore = url.searchParams.get("minScore");
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 200);

  const jobs = await db.job.findMany({
    where: {
      ...(platform && platform !== "all" ? { platform } : {}),
      ...(remote === "true" ? { remote: true } : {}),
      ...(minScore ? { matchScore: { gte: Number(minScore) } } : {}),
      ...(status && status !== "all" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { company: { contains: q } },
              { description: { contains: q } },
              { tags: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ matchScore: "desc" }, { postedAt: "desc" }],
    take: limit,
  });

  return NextResponse.json({ jobs: jobs.map(serializeJob) });
}

/** PATCH — save / dismiss / rediscover a job. */
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }
  if (!["discovered", "saved", "dismissed"].includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const job = await db.job.update({
    where: { id: body.id },
    data: { status: body.status },
  });

  if (body.status === "saved") {
    await emitRealtime("activity", {
      type: "info", platform: job.platform,
      message: `Saved ${job.title} at ${job.company} to shortlist`,
      createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ job: serializeJob(job) });
}
