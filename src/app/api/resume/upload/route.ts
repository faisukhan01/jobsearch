import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProfile } from "@/lib/serialize";
import { broadcastActivity } from "@/lib/engine";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const OK_EXT = [".pdf", ".docx", ".doc"];

/** ── Text extraction ─────────────────────────────────────────────── */
async function extractText(fileName: string, buffer: Buffer): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const { extractText: extractPdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return typeof text === "string" ? text : String(text ?? "");
  }
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }
  throw new Error(`Unsupported file type: ${fileName}`);
}

/** ── Heuristic parser (fast, deterministic baseline) ─────────────── */
const SKILL_DICTIONARY = [
  "typescript", "javascript", "python", "java", "c++", "c#", "go", "rust", "php", "ruby", "kotlin", "swift",
  "react", "next.js", "nextjs", "vue", "angular", "svelte", "node.js", "nodejs", "express", "fastapi",
  "django", "flask", "laravel", "spring", ".net", "graphql", "rest api", "grpc", "websocket", "socket.io",
  "postgresql", "postgres", "mysql", "mongodb", "redis", "sqlite", "prisma", "sql", "nosql", "kafka",
  "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ci/cd", "jenkins", "github actions",
  "tailwind", "css", "html", "sass", "redux", "zustand", "jest", "cypress", "playwright", "pytest",
  "machine learning", "deep learning", "nlp", "llm", "pytorch", "tensorflow", "pandas", "numpy",
  "git", "linux", "microservices", "system design", "agile", "scrum", "figma", "devops", "sre",
];

function heuristicParse(raw: string) {
  const text = raw.replace(/\r/g, "").trim();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const warnings: string[] = [];

  // Email
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/)?.[0] ?? "";

  // Phone (international-ish)
  const phone = text.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? null;

  // Name — first 1-4 word line near the top that isn't an email/label
  let fullName = "";
  for (const l of lines.slice(0, 6)) {
    const clean = l.replace(/[|•,]/g, "").trim();
    const words = clean.split(/\s+/);
    if (clean.length >= 3 && clean.length <= 40 && words.length <= 4
      && !/@|\d{3}|resume|curriculum|cv$/i.test(clean)
      && /^[A-Za-zÀ-ÿ'.\- ]+$/.test(clean)) {
      fullName = clean;
      break;
    }
  }

  // Location — "City, ST" / "City, Country" patterns
  const location = text.match(/\b([A-Z][a-zA-Z.]+(?:\s[A-Z][a-zA-Z.]+)*,\s*(?:[A-Z]{2}\b|[A-Z][a-zA-Z]+))/)?.[1] ?? "Remote";

  // Years of experience
  let experienceYears = 0;
  const yr = text.match(/(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s*of)?\s*(?:professional\s*)?experience/i)
    ?? text.match(/experience\s*:?\s*(\d{1,2})\+?\s*(?:years?|yrs?)/i);
  if (yr) experienceYears = Math.min(40, Math.max(0, Number(yr[1])));
  if (!experienceYears) {
    const span = text.match(/(20\d{2})\s*[-–—]\s*(20\d{2}|present)/i);
    if (span) experienceYears = Math.min(40, new Date().getFullYear() - Number(span[1]));
  }

  // Desired salary
  let desiredSalary: number | null = null;
  const sal = text.match(/\$?\s*(\d{2,3})\s*[-–—to]+\s*\$?\s*(\d{2,3})\s*,?\s*(\d{3})?\s*(?:k)?/i);
  if (sal && /salary|expect|target|compensation/i.test(text)) {
    const a = Number(sal[1]), b = Number(sal[2]);
    const mult = sal[3] ? 1 : 1000;
    desiredSalary = Math.round(((a + b) / 2) * mult);
    if (desiredSalary < 10000 || desiredSalary > 900000) desiredSalary = null;
  }

  // Skills — dictionary matches (respecting word boundaries)
  const lower = text.toLowerCase();
  const found = new Set<string>();
  const canon = (s: string) => s.toLowerCase();
  for (const s of SKILL_DICTIONARY) {
    if ([...found].some((f) => canon(f) === canon(s))) continue;
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(lower)) {
      found.add(s.replace(/\b\w/g, (c) => c.toUpperCase()).replace("Next.Js", "Next.js").replace("Node.Js", "Node.js"));
    }
    if (found.size >= 16) break;
  }

  // Headline — line right after the name containing a role keyword
  const roleRx = /(engineer|developer|architect|manager|designer|analyst|scientist|consultant|administrator|specialist)/i;
  let headline: string | null = null;
  const nameIdx = lines.findIndex((l) => l === fullName);
  for (const l of lines.slice(nameIdx >= 0 ? nameIdx + 1 : 0, (nameIdx >= 0 ? nameIdx + 1 : 0) + 5)) {
    if (roleRx.test(l) && l.length <= 90 && !/^\+?\d|@/.test(l)) { headline = l; break; }
  }

  // Summary — longest early paragraph (30+ words) not a skills dump.
  // PDFs wrap lines, so join consecutive non-blank lines into paragraphs first.
  const paragraphs: string[] = [];
  let buf = "";
  for (const l of lines) {
    if (/^(skills?|technologies|core skills|experience|education|projects|certifications?)\b/i.test(l) && buf) {
      paragraphs.push(buf); buf = ""; continue;
    }
    buf = buf ? `${buf} ${l}` : l;
    if (/[.!?]$/.test(l) && buf.split(/\s+/).length >= 20) { paragraphs.push(buf); buf = ""; }
  }
  if (buf) paragraphs.push(buf);
  let summary: string | null = null;
  for (const p of paragraphs.slice(0, 8)) {
    if (p.split(/\s+/).length >= 30 && p.length <= 700) { summary = p; break; }
  }
  if (!summary) warnings.push("Could not confidently detect a professional summary — please review.");

  return { fullName, email, phone, location, headline, summary, experienceYears, desiredSalary, skills: [...found], warnings };
}

/** ── LLM refinement (structured extraction from raw text) ───────── */
async function aiParse(raw: string) {
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You extract structured data from resumes/CVs. Return ONLY a JSON object (no markdown fences, no commentary) with keys: "
            + 'fullName (string), email (string, "" if absent), phone (string or null), location (string, "Remote" if absent), '
            + 'headline (string, job title line), summary (string, professional summary max 400 chars), '
            + 'skills (array of up to 14 concrete skill strings), experienceYears (integer), desiredSalary (integer USD or null). '
            + "Infer experienceYears from work-history date ranges if not stated. Never invent employers or degrees.",
        },
        { role: "user", content: `Resume text:\n\n${raw.slice(0, 9000)}` },
      ],
    });
    const content = completion.choices[0]?.message?.content ?? "";
    const jsonText = content.replace(/```json|```/g, "").trim();
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const p = JSON.parse(jsonText.slice(start, end + 1));
    return {
      fullName: typeof p.fullName === "string" ? p.fullName : "",
      email: typeof p.email === "string" ? p.email : "",
      phone: typeof p.phone === "string" ? p.phone : null,
      location: typeof p.location === "string" && p.location ? p.location : "Remote",
      headline: typeof p.headline === "string" ? p.headline : null,
      summary: typeof p.summary === "string" ? p.summary : null,
      experienceYears: Number.isFinite(Number(p.experienceYears)) ? Math.min(40, Math.max(0, Number(p.experienceYears))) : 0,
      desiredSalary: Number.isFinite(Number(p.desiredSalary)) && Number(p.desiredSalary) > 0 ? Math.round(Number(p.desiredSalary)) : null,
      skills: Array.isArray(p.skills) ? p.skills.map(String).slice(0, 14) : [],
    };
  } catch {
    return null;
  }
}

/** ── POST /api/resume/upload ─────────────────────────────────────── */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large — 8 MB maximum" }, { status: 413 });
  }
  const lowerName = file.name.toLowerCase();
  if (!OK_EXT.some((e) => lowerName.endsWith(e))) {
    return NextResponse.json({ error: "Only PDF, DOC and DOCX resumes are supported" }, { status: 415 });
  }

  let raw: string;
  try {
    raw = await extractText(file.name, Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "Could not read this file — it may be corrupted or password-protected" }, { status: 422 });
  }

  if (raw.replace(/\s/g, "").length < 40) {
    return NextResponse.json({ error: "No readable text found — scanned/image-only PDFs are not supported yet" }, { status: 422 });
  }

  const heur = heuristicParse(raw);
  const ai = await aiParse(raw);

  // Merge: AI wins where it produced a value, heuristics fill the gaps.
  const merged = {
    fullName: ai?.fullName || heur.fullName || "Job Seeker",
    email: ai?.email || heur.email || "",
    phone: ai?.phone ?? heur.phone,
    location: ai?.location || heur.location || "Remote",
    headline: ai?.headline ?? heur.headline,
    summary: ai?.summary ?? heur.summary,
    experienceYears: ai?.experienceYears || heur.experienceYears || 0,
    desiredSalary: ai?.desiredSalary ?? heur.desiredSalary,
    skills: [...new Map([...(ai?.skills ?? []), ...heur.skills].map((s) => [s.toLowerCase(), s])).values()].slice(0, 16),
  };

  const warnings = [...heur.warnings];
  if (!merged.email) warnings.push("No email found in the resume — please fill it in.");
  if (!ai) warnings.push("AI refinement unavailable — used fast offline parsing.");

  const data = {
    fullName: merged.fullName,
    email: merged.email,
    phone: merged.phone,
    location: merged.location,
    headline: merged.headline,
    summary: merged.summary,
    skills: JSON.stringify(merged.skills),
    experienceYears: merged.experienceYears,
    desiredSalary: merged.desiredSalary,
    currency: "USD",
    resumeFileName: file.name,
  };

  const existing = await db.profile.findFirst();
  const profile = existing
    ? await db.profile.update({ where: { id: existing.id }, data })
    : await db.profile.create({ data });

  await broadcastActivity(
    async (l) => db.activityLog.create({ data: { type: l.type, platform: l.platform, message: l.message } }),
    "ai",
    `Resume imported (${file.name}) — profile auto-filled with ${merged.skills.length} skills, ${merged.experienceYears} yrs experience`
  );

  return NextResponse.json({ profile: serializeProfile(profile), meta: { fileName: file.name, chars: raw.length, method: ai ? "ai+heuristics" : "heuristics", warnings } });
}
