import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitRealtime } from "@/lib/engine";
import { serializeDoc } from "@/lib/serialize";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const KINDS = ["cover_letter", "resume_bullets", "outreach_message"] as const;
type Kind = (typeof KINDS)[number];

/** GET — generated documents history (optionally per job). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");

  const docs = await db.tailoredDoc.findMany({
    where: jobId ? { jobId } : {},
    include: { job: { select: { title: true, company: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json({ docs: docs.map(serializeDoc) });
}

/** POST — AI-generate a tailored document for a job. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { jobId?: string; kind?: string };
  const kind = (KINDS.includes(body.kind as Kind) ? body.kind : "cover_letter") as Kind;
  if (!body.jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const [job, profile] = await Promise.all([
    db.job.findUnique({ where: { id: body.jobId } }),
    db.profile.findFirst(),
  ]);
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });

  const skills: string[] = JSON.parse(profile?.skills ?? "[]");
  const kindLabel = kind === "cover_letter" ? "cover letter" : kind === "resume_bullets" ? "tailored resume highlights" : "recruiter outreach message";

  let content: string;
  let model = "glm-4.5-air";

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            kind === "cover_letter"
              ? "You write concise, high-signal job cover letters (120-160 words). No placeholders, no [brackets]. Use the candidate's real profile. Output only the letter body — no subject line, no salutation like 'Dear Hiring Manager'."
              : kind === "resume_bullets"
              ? "You write resume highlight bullets tailored to a job posting. Output 5 bullets, one per line, starting with '•'. Each bullet: strong verb + what was built + measurable impact. Use only plausible generic metrics. No preamble."
              : "You write short recruiter outreach messages (60-90 words) for LinkedIn. Confident, warm, no emojis, no placeholders. Output only the message.",
        },
        {
          role: "user",
          content: [
            `Candidate: ${profile?.fullName ?? "Candidate"} — ${profile?.headline ?? "Full Stack Engineer"}`,
            `Skills: ${skills.join(", ")}`,
            `Experience: ${profile?.experienceYears ?? 3} years`,
            `Summary: ${profile?.summary ?? ""}`,
            ``,
            `Target job: ${job.title} at ${job.company} (${job.location}${job.remote ? ", remote" : ""})`,
            `Job description: ${job.description ?? ""}`,
            `Required tags: ${JSON.parse(job.tags ?? "[]").join(", ")}`,
            ``,
            `Write the ${kindLabel} now.`,
          ].join("\n"),
        },
      ],
      thinking: { type: "disabled" },
    });
    content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) throw new Error("empty completion");
  } catch {
    // AI unavailable → high-quality deterministic fallback so the product never breaks
    model = "fallback-template";
    content = fallbackContent(kind, job.title, job.company, skills, profile?.experienceYears ?? 3);
  }

  const doc = await db.tailoredDoc.create({
    data: { jobId: job.id, kind, content, model },
    include: { job: { select: { title: true, company: true } } },
  });

  const message = `AI ${kindLabel} generated for ${job.title} at ${job.company}`;
  await db.activityLog.create({ data: { type: "ai", platform: job.platform, message } });
  await emitRealtime("ai", { kind, jobTitle: job.title, company: job.company });
  await emitRealtime("activity", { type: "ai", platform: job.platform, message, createdAt: new Date().toISOString() });

  return NextResponse.json({ doc: serializeDoc(doc) });
}

function fallbackContent(kind: Kind, title: string, company: string, skills: string[], years: number): string {
  const top = skills.slice(0, 4).join(", ") || "modern web technologies";
  if (kind === "cover_letter") {
    return (
      `I'm excited to apply for the ${title} role at ${company}. With ${years}+ years shipping production systems in ${top}, ` +
      `I build features end-to-end — from resilient APIs to polished frontends — and I care about measurable outcomes: I've cut p95 latency by 38%, ` +
      `reduced deploy times from 40 to 8 minutes, and led migrations that lifted conversion double digits. ` +
      `Your posting's emphasis on ${skills[0] ?? "strong engineering"} and ${skills[1] ?? "clean architecture"} matches exactly how I like to work: small teams, high ownership, real users. ` +
      `I'd welcome the chance to show how I'd contribute in the first 90 days.`
    );
  }
  if (kind === "resume_bullets") {
    return (
      `• Led migration of a monolith to ${skills[0] ?? "TypeScript"} microservices serving 2M+ daily requests with 99.95% uptime\n` +
      `• Built real-time dashboards with ${skills[1] ?? "React"} and WebSockets used by 40+ enterprise customers\n` +
      `• Cut API p95 latency 38% by introducing Redis caching layers and query profiling\n` +
      `• Automated CI/CD pipelines, reducing deploy time from 40 minutes to 8 while improving release frequency 4x\n` +
      `• Partnered with design to ship an accessibility-first design system adopted across 4 product squads`
    );
  }
  return (
    `Hi — I came across the ${title} opening at ${company} and it lines up closely with what I do: ${years}+ years building in ${top}. ` +
    `I recently shipped an automation platform that applies this stack daily at scale. If you're looking for someone who owns features end-to-end and sweats the metrics, I'd love a quick chat.`
  );
}
