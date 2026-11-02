/**
 * Seed script — populates the platform with a realistic starting state.
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SKILLS = [
  "TypeScript", "Python", "React", "Next.js", "Node.js", "FastAPI", "PostgreSQL",
  "Prisma", "Docker", "AWS", "GraphQL", "Tailwind", "Redis", "Kubernetes",
];

interface SeedJob {
  externalId: string;
  platform: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  employmentType: string;
  salaryMin: number;
  salaryMax: number;
  description: string;
  tags: string[];
  easyApply: boolean;
  matchScore: number;
  postedDaysAgo: number;
}

const JOBS: SeedJob[] = [
  { externalId: "indeed-a1f3c9e2b4d8", platform: "indeed", title: "Senior Full Stack Engineer", company: "Stripe", location: "Remote — US", remote: true, employmentType: "FULL_TIME", salaryMin: 165000, salaryMax: 210000, description: "Join the payments platform team building developer-facing APIs consumed by millions. You will own services end-to-end across React frontends and FastAPI backends.", tags: ["TypeScript", "React", "Python", "PostgreSQL"], easyApply: true, matchScore: 94, postedDaysAgo: 1 },
  { externalId: "indeed-b7e2d4a8c1f6", platform: "indeed", title: "Backend Engineer — Platform APIs", company: "Notion", location: "Remote", remote: true, employmentType: "FULL_TIME", salaryMin: 150000, salaryMax: 190000, description: "Design and scale the core document collaboration APIs. Strong Node.js and data-modeling skills required.", tags: ["Node.js", "TypeScript", "PostgreSQL", "Redis"], easyApply: true, matchScore: 89, postedDaysAgo: 2 },
  { externalId: "indeed-c9d1f7b3e5a2", platform: "indeed", title: "Staff Software Engineer", company: "Datadog", location: "New York, NY", remote: false, employmentType: "FULL_TIME", salaryMin: 190000, salaryMax: 240000, description: "Own observability ingestion pipelines processing trillions of events. Go/Python, Kafka, and Kubernetes expertise expected.", tags: ["Python", "Kubernetes", "Kafka", "AWS"], easyApply: false, matchScore: 76, postedDaysAgo: 4 },
  { externalId: "indeed-d4a8b2c6e9f3", platform: "indeed", title: "Full Stack Developer (React + Python)", company: "Figma", location: "Remote — US", remote: true, employmentType: "FULL_TIME", salaryMin: 155000, salaryMax: 200000, description: "Build collaborative design tooling features across a React/TypeScript frontend and Python services.", tags: ["React", "TypeScript", "Python", "GraphQL"], easyApply: true, matchScore: 92, postedDaysAgo: 1 },
  { externalId: "indeed-e6c3a9d7b1f4", platform: "indeed", title: "Platform Engineer", company: "Ramp", location: "Remote", remote: true, employmentType: "FULL_TIME", salaryMin: 160000, salaryMax: 205000, description: "Improve developer velocity: CI/CD, infrastructure-as-code, and internal tooling for finance automation.", tags: ["Docker", "AWS", "TypeScript", "Terraform"], easyApply: true, matchScore: 84, postedDaysAgo: 3 },
  { externalId: "indeed-f2d7e4c9a6b8", platform: "indeed", title: "Senior Node.js Engineer", company: "Shopify", location: "Remote — Americas", remote: true, employmentType: "FULL_TIME", salaryMin: 158000, salaryMax: 198000, description: "Scale commerce APIs handling Black-Friday traffic. Deep Node.js performance knowledge a must.", tags: ["Node.js", "TypeScript", "Redis", "GraphQL"], easyApply: true, matchScore: 88, postedDaysAgo: 2 },
  { externalId: "indeed-g8b4f2d9c3e7", platform: "indeed", title: "DevOps Engineer — Infrastructure", company: "Cloudflare", location: "Austin, TX", remote: false, employmentType: "FULL_TIME", salaryMin: 145000, salaryMax: 185000, description: "Automate global edge network deployments across 300+ cities with Terraform and Kubernetes.", tags: ["Kubernetes", "Docker", "AWS", "Terraform"], easyApply: false, matchScore: 71, postedDaysAgo: 6 },
  { externalId: "indeed-h5e9c7a3d8f2", platform: "indeed", title: "Frontend Engineer — Design Systems", company: "Linear", location: "Remote", remote: true, employmentType: "FULL_TIME", salaryMin: 140000, salaryMax: 180000, description: "Craft the interface layer used by thousands of product teams. Pixel-perfect React + Tailwind.", tags: ["React", "TypeScript", "Tailwind"], easyApply: true, matchScore: 90, postedDaysAgo: 1 },
  { externalId: "linkedin-i3f8d6b4c2e9", platform: "linkedin", title: "Senior Backend Engineer (Python)", company: "Airbnb", location: "San Francisco, CA", remote: false, employmentType: "FULL_TIME", salaryMin: 185000, salaryMax: 230000, description: "Own trust & safety service backends in Python, serving high-scale fraud detection.", tags: ["Python", "FastAPI", "PostgreSQL", "AWS"], easyApply: false, matchScore: 82, postedDaysAgo: 3 },
  { externalId: "linkedin-j7a2e8c5d4f1", platform: "linkedin", title: "Full Stack Engineer — Growth", company: "Uber", location: "Remote — US", remote: true, employmentType: "FULL_TIME", salaryMin: 168000, salaryMax: 215000, description: "Experiment platform for driver growth funnels. React, TypeScript, and heavy A/B testing.", tags: ["React", "TypeScript", "Node.js", "AWS"], easyApply: false, matchScore: 86, postedDaysAgo: 2 },
  { externalId: "linkedin-k4c9b7d3e6a8", platform: "linkedin", title: "API Platform Engineer", company: "Plaid", location: "Remote", remote: true, employmentType: "FULL_TIME", salaryMin: 172000, salaryMax: 220000, description: "Build the financial data APIs used by 8000+ fintech apps. Python, GraphQL, and postgres at scale.", tags: ["Python", "GraphQL", "PostgreSQL", "Docker"], easyApply: false, matchScore: 87, postedDaysAgo: 5 },
  { externalId: "linkedin-l8d3f9a6c7b2", platform: "linkedin", title: "Senior Full Stack Engineer", company: "Vercel", location: "Remote — Global", remote: true, employmentType: "FULL_TIME", salaryMin: 175000, salaryMax: 225000, description: "Ship the next generation of Next.js-powered developer experience. You live and breathe TypeScript.", tags: ["Next.js", "TypeScript", "React", "AWS"], easyApply: false, matchScore: 96, postedDaysAgo: 1 },
  { externalId: "linkedin-m6b8c4d9e2f5", platform: "linkedin", title: "Machine Learning Engineer", company: "Anthropic", location: "San Francisco, CA", remote: false, employmentType: "FULL_TIME", salaryMin: 250000, salaryMax: 355000, description: "Train and evaluate frontier models. Strong Python and distributed systems background.", tags: ["Python", "PyTorch", "Kubernetes"], easyApply: false, matchScore: 68, postedDaysAgo: 7 },
  { externalId: "linkedin-n2e5a8f3c9d6", platform: "linkedin", title: "Product Engineer — AI Features", company: "Perplexity", location: "Remote", remote: true, employmentType: "FULL_TIME", salaryMin: 180000, salaryMax: 240000, description: "Build AI-native search experiences. Full stack: Next.js frontends with Python/FastAPI services.", tags: ["Next.js", "Python", "FastAPI", "TypeScript"], easyApply: false, matchScore: 93, postedDaysAgo: 2 },
  { externalId: "glassdoor-o9f4b6a3d7c2", platform: "glassdoor", title: "Software Engineer II", company: "Spotify", location: "Remote — US", remote: true, employmentType: "FULL_TIME", salaryMin: 150000, salaryMax: 195000, description: "Backend services powering playlist intelligence. Java/Python microservices with event streaming.", tags: ["Python", "Kafka", "PostgreSQL"], easyApply: false, matchScore: 78, postedDaysAgo: 4 },
  { externalId: "glassdoor-p5a7c9d2e4b8", platform: "glassdoor", title: "Senior Software Engineer", company: "Netflix", location: "Los Gatos, CA", remote: false, employmentType: "FULL_TIME", salaryMin: 220000, salaryMax: 320000, description: "Studio-scale media pipeline engineering. Polyglot, distributed systems, AWS.", tags: ["Python", "AWS", "Kubernetes"], easyApply: false, matchScore: 74, postedDaysAgo: 8 },
  { externalId: "glassdoor-q3c8e5b7d9a4", platform: "glassdoor", title: "Full Stack Developer", company: "Twilio", location: "Remote", remote: true, employmentType: "FULL_TIME", salaryMin: 145000, salaryMax: 185000, description: "Communications APIs developer experience team. Node.js and TypeScript across the stack.", tags: ["Node.js", "TypeScript", "React", "PostgreSQL"], easyApply: true, matchScore: 85, postedDaysAgo: 3 },
  { externalId: "glassdoor-r7d9a4c6e8b3", platform: "glassdoor", title: "Backend Engineer — Data Platform", company: "Fivetran", location: "Remote — US", remote: true, employmentType: "FULL_TIME", salaryMin: 155000, salaryMax: 200000, description: "Build connectors moving petabytes monthly. Python, high-throughput systems, cloud-native.", tags: ["Python", "AWS", "PostgreSQL", "Docker"], easyApply: false, matchScore: 83, postedDaysAgo: 5 },
  { externalId: "ziprecruiter-s4e6b8c9d7a2", platform: "ziprecruiter", title: "React Developer", company: "Webflow", location: "Remote", remote: true, employmentType: "FULL_TIME", salaryMin: 135000, salaryMax: 170000, description: "Visual development platform. Advanced React patterns, performance, and accessibility.", tags: ["React", "TypeScript", "Tailwind", "GraphQL"], easyApply: true, matchScore: 88, postedDaysAgo: 1 },
  { externalId: "ziprecruiter-t8b3d7e4c9f6", platform: "ziprecruiter", title: "Full Stack Engineer (Remote)", company: "Zapier", location: "Remote — Global", remote: true, employmentType: "FULL_TIME", salaryMin: 140000, salaryMax: 178000, description: "Automate the world's work. Python backends and React frontends, fully remote-first.", tags: ["Python", "React", "TypeScript", "Redis"], easyApply: true, matchScore: 91, postedDaysAgo: 2 },
  { externalId: "ziprecruiter-u6c5e9b3d8a7", platform: "ziprecruiter", title: "Software Engineer — Integrations", company: "Calendly", location: "Remote — US", remote: true, employmentType: "FULL_TIME", salaryMin: 130000, salaryMax: 165000, description: "Build scheduling integrations ecosystem. Ruby/TypeScript, webhooks at scale.", tags: ["TypeScript", "Node.js", "React"], easyApply: true, matchScore: 80, postedDaysAgo: 4 },
  { externalId: "ziprecruiter-v2d8a6c5e7b9", platform: "ziprecruiter", title: "Junior Full Stack Developer", company: "Gumroad", location: "Remote", remote: true, employmentType: "FULL_TIME", salaryMin: 95000, salaryMax: 120000, description: "Creator commerce platform. Ship features weekly across a Rails/React codebase.", tags: ["React", "TypeScript", "PostgreSQL"], easyApply: true, matchScore: 75, postedDaysAgo: 3 },
  { externalId: "greenhouse-w9a7d4c8e3b6", platform: "greenhouse", title: "Senior Software Engineer, Infrastructure", company: "GitHub", location: "Remote — US", remote: true, employmentType: "FULL_TIME", salaryMin: 175000, salaryMax: 225000, description: "Scale the platform powering 100M+ developers. Ruby/Go, Kubernetes, MySQL at massive scale.", tags: ["Kubernetes", "Docker", "AWS", "Terraform"], easyApply: false, matchScore: 72, postedDaysAgo: 6 },
  { externalId: "greenhouse-x4b8e9d3c7a5", platform: "greenhouse", title: "Full Stack Engineer — Copilot", company: "GitLab", location: "Remote — Global", remote: true, employmentType: "FULL_TIME", salaryMin: 150000, salaryMax: 195000, description: "AI-assisted development features. Ruby on Rails and Vue with AI infrastructure.", tags: ["TypeScript", "Python", "Docker"], easyApply: false, matchScore: 77, postedDaysAgo: 9 },
  { externalId: "greenhouse-y6c9b5e8d4a7", platform: "greenhouse", title: "Staff Engineer — Platform", company: "Doordash", location: "Remote — US", remote: true, employmentType: "FULL_TIME", salaryMin: 195000, salaryMax: 260000, description: "Logistics platform core services. Kotlin/Python, event-driven architecture.", tags: ["Python", "Kafka", "AWS", "Kubernetes"], easyApply: false, matchScore: 79, postedDaysAgo: 4 },
  { externalId: "lever-z3d5a8c7e9b4", platform: "lever", title: "Software Engineer, Full Stack", company: "Mixpanel", location: "Remote — US", remote: true, employmentType: "FULL_TIME", salaryMin: 150000, salaryMax: 190000, description: "Product analytics platform. TypeScript end-to-end with Node.js services.", tags: ["TypeScript", "Node.js", "React", "Redis"], easyApply: false, matchScore: 84, postedDaysAgo: 5 },
  { externalId: "lever-a7b6c9d3e8f5", platform: "lever", title: "Backend Engineer", company: "Superhuman", location: "Remote", remote: true, employmentType: "FULL_TIME", salaryMin: 160000, salaryMax: 200000, description: "The fastest email client. Performance-obsessed backend work in Go/TypeScript.", tags: ["Node.js", "TypeScript", "PostgreSQL"], easyApply: false, matchScore: 81, postedDaysAgo: 7 },
  { externalId: "lever-b9c8d7e5f4a6", platform: "lever", title: "Founding Full Stack Engineer", company: "Retool", location: "San Francisco, CA", remote: false, employmentType: "FULL_TIME", salaryMin: 180000, salaryMax: 240000, description: "Build internal tools platform used by half the Fortune 500. React + Node.js heavy.", tags: ["React", "Node.js", "TypeScript", "PostgreSQL"], easyApply: false, matchScore: 87, postedDaysAgo: 2 },
];

const APPLICATION_PLAN: Array<{ externalId: string; status: string; method: string; daysAgo: number | null; note?: string }> = [
  { externalId: "linkedin-l8d3f9a6c7b2", status: "interview", method: "autopilot", daysAgo: 9, note: "Technical interview scheduled — Vercel SDM round" },
  { externalId: "indeed-a1f3c9e2b4d8", status: "screening", method: "autopilot", daysAgo: 6, note: "Recruiter screen booked" },
  { externalId: "linkedin-n2e5a8f3c9d6", status: "applied", method: "autopilot", daysAgo: 3 },
  { externalId: "indeed-d4a8b2c6e9f3", status: "applied", method: "autopilot", daysAgo: 2 },
  { externalId: "ziprecruiter-t8b3d7e4c9f6", status: "applied", method: "autopilot", daysAgo: 2 },
  { externalId: "indeed-h5e9c7a3d8f2", status: "applied", method: "autopilot", daysAgo: 1 },
  { externalId: "glassdoor-q3c8e5b7d9a4", status: "applied", method: "manual", daysAgo: 4 },
  { externalId: "linkedin-j7a2e8c5d4f1", status: "applied", method: "autopilot", daysAgo: 5 },
  { externalId: "indeed-f2d7e4c9a6b8", status: "screening", method: "autopilot", daysAgo: 8, note: "Online assessment received" },
  { externalId: "linkedin-k4c9b7d3e6a8", status: "offer", method: "autopilot", daysAgo: 14, note: "Verbal offer — negotiating comp" },
  { externalId: "indeed-b7e2d4a8c1f6", status: "applied", method: "autopilot", daysAgo: 7 },
  { externalId: "ziprecruiter-s4e6b8c9d7a2", status: "interview", method: "autopilot", daysAgo: 11, note: "Take-home submitted" },
  { externalId: "glassdoor-r7d9a4c6e8b3", status: "rejected", method: "autopilot", daysAgo: 12, note: "Role frozen" },
  { externalId: "indeed-e6c3a9d7b1f4", status: "rejected", method: "autopilot", daysAgo: 10 },
  { externalId: "linkedin-i3f8d6b4c2e9", status: "rejected", method: "manual", daysAgo: 16, note: "Required on-site in SF" },
  { externalId: "glassdoor-o9f4b6a3d7c2", status: "rejected", method: "autopilot", daysAgo: 18 },
  { externalId: "linkedin-m6b8c4d9e2f5", status: "rejected", method: "autopilot", daysAgo: 13, note: "ML depth insufficient" },
  { externalId: "indeed-c9d1f7b3e5a2", status: "queued", method: "autopilot", daysAgo: null },
  { externalId: "lever-b9c8d7e5f4a6", status: "queued", method: "autopilot", daysAgo: null },
  { externalId: "greenhouse-y6c9b5e8d4a7", status: "queued", method: "autopilot", daysAgo: null },
];

const COVER_LETTER_SNIPPET =
  "I'm excited to apply for this role. With 5+ years shipping production TypeScript and Python systems — including real-time dashboards and event-driven pipelines — I match the stack your team runs. At my current role I cut API p95 latency 38% and led a Next.js migration that lifted conversion 12%. I'd love to bring that bias for measurable impact to your platform.";

const TAILORED_SNIPPET =
  "Highlights tailored to this posting: led microservice migration serving 2M daily requests (Node.js → FastAPI), built CI pipelines reducing deploy time from 40 to 8 minutes, owned a design-system adoption across 4 product squads, implemented Redis caching layer cutting DB load 55%.";

async function main() {
  console.log("🌱 Seeding JobSearch platform...");

  await db.tailoredDoc.deleteMany();
  await db.activityLog.deleteMany();
  await db.application.deleteMany();
  await db.job.deleteMany();
  await db.connector.deleteMany();
  await db.automationConfig.deleteMany();
  await db.profile.deleteMany();

  // ── Profile ────────────────────────────────────────────────────────────
  await db.profile.create({
    data: {
      fullName: "Faisal Khan",
      email: "faisukhan01@gmail.com",
      phone: "+92 300 000 0000",
      location: "Remote",
      headline: "Senior Full Stack Engineer — TypeScript · Python · Next.js · FastAPI",
      summary:
        "Full stack engineer with 5+ years building and shipping production web platforms. I own features end-to-end: React/Next.js frontends, Node/FastAPI services, and the Prisma/Postgres data layer behind them. Currently focused on automation tooling and AI-native products.",
      skills: JSON.stringify(["TypeScript", "Python", "React", "Next.js", "Node.js", "FastAPI", "PostgreSQL", "Prisma", "Docker", "AWS", "GraphQL", "Tailwind"]),
      experienceYears: 5,
      desiredSalary: 160000,
      currency: "USD",
      resumeFileName: "faisal-khan-resume-2025.pdf",
    },
  });

  // ── Connectors ─────────────────────────────────────────────────────────
  const now = new Date();
  const connectorData = [
    { platform: "indeed", status: "connected", accountEmail: "faisukhan01@gmail.com", autoApply: true, syncedJobs: 8, lastSyncMinutes: 24 },
    { platform: "linkedin", status: "connected", accountEmail: "faisukhan01@gmail.com", autoApply: true, syncedJobs: 6, lastSyncMinutes: 41 },
    { platform: "glassdoor", status: "connected", accountEmail: "faisukhan01@gmail.com", autoApply: false, syncedJobs: 4, lastSyncMinutes: 118 },
    { platform: "ziprecruiter", status: "connected", accountEmail: "faisukhan01@gmail.com", autoApply: true, syncedJobs: 4, lastSyncMinutes: 55 },
    { platform: "greenhouse", status: "disconnected", accountEmail: null as string | null, autoApply: false, syncedJobs: 3, lastSyncMinutes: null },
    { platform: "lever", status: "disconnected", accountEmail: null as string | null, autoApply: false, syncedJobs: 3, lastSyncMinutes: null },
  ];
  for (const c of connectorData) {
    await db.connector.create({
      data: {
        platform: c.platform,
        status: c.status,
        accountEmail: c.accountEmail,
        autoApply: c.autoApply,
        syncedJobs: c.syncedJobs,
        lastSyncAt: c.lastSyncMinutes ? new Date(now.getTime() - c.lastSyncMinutes * 60000) : null,
      },
    });
  }

  // ── Jobs ───────────────────────────────────────────────────────────────
  for (const j of JOBS) {
    await db.job.create({
      data: {
        externalId: j.externalId,
        platform: j.platform,
        title: j.title,
        company: j.company,
        companyLogo: j.company.slice(0, 2).toUpperCase(),
        location: j.location,
        remote: j.remote,
        employmentType: j.employmentType,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        currency: "USD",
        description: j.description,
        tags: JSON.stringify(j.tags),
        easyApply: j.easyApply,
        matchScore: j.matchScore,
        status: "discovered",
        postedAt: new Date(now.getTime() - j.postedDaysAgo * 86400000),
      },
    });
  }

  // ── Applications ───────────────────────────────────────────────────────
  const jobs = await db.job.findMany();
  const jobByExternal = new Map(jobs.map((j) => [j.externalId, j]));

  // Historic trend: dedicated ARCHIVE jobs (dismissed from radar) whose
  // applications form the 14-day momentum chart. Curated jobs stay unapplied
  // so the autopilot has real candidates to work with.
  const trendPlan = [
    { d: 13, n: 3 }, { d: 12, n: 5 }, { d: 11, n: 4 }, { d: 10, n: 6 },
    { d: 9, n: 5 }, { d: 8, n: 7 }, { d: 7, n: 6 }, { d: 6, n: 8 },
    { d: 5, n: 7 }, { d: 4, n: 9 }, { d: 3, n: 8 }, { d: 2, n: 10 },
    { d: 1, n: 9 }, { d: 0, n: 4 },
  ];
  const trendCompanies = ["Amazon", "Meta", "Google", "Microsoft", "Salesforce", "Oracle", "IBM", "Adobe", "Atlassian", "Dropbox", "Slack", "Asana", "Square", "Coinbase", "Palantir", "Snowflake", "Databricks", "MongoDB", "Elastic", "Confluent", "HashiCorp", "CircleCI", "Auth0", "Okta", "SendGrid", "Algolia", "HubSpot", "Intercom", "Zendesk", "Mailchimp"];
  const trendTitles = ["Full Stack Engineer", "Backend Engineer", "Frontend Engineer", "Software Engineer", "Platform Engineer", "Senior Developer", "Full Stack Developer", "API Engineer"];
  const trendPlatforms = ["indeed", "linkedin", "glassdoor", "ziprecruiter"];
  const trendLocations = ["Remote", "Remote — US", "New York, NY", "Austin, TX", "San Francisco, CA", "Toronto, CA"];
  const trendTagPool = [["JavaScript", "React"], ["Python", "SQL"], ["Java", "Spring"], ["Go", "Kubernetes"], ["Node.js", "Express"], ["C#", ".NET"], ["Ruby", "Rails"], ["PHP", "Laravel"]];
  let trendIdx = 0;
  let seq = 0;

  for (const t of trendPlan) {
    for (let i = 0; i < t.n; i++) {
      seq++;
      const company = trendCompanies[seq % trendCompanies.length];
      const title = trendTitles[(seq * 3) % trendTitles.length];
      const platform = trendPlatforms[seq % trendPlatforms.length];
      const tags = trendTagPool[seq % trendTagPool.length];
      const appliedAt = new Date(now.getTime() - t.d * 86400000 + i * 1800000);
      const statusRoll = (seq * 7) % 10;
      const status = t.d === 0 ? "queued" : statusRoll < 6 ? "applied" : statusRoll < 9 ? "rejected" : "screening";
      const archive = await db.job.create({
        data: {
          externalId: `archive-${platform}-${String(seq).padStart(4, "0")}`,
          platform,
          title,
          company,
          companyLogo: company.slice(0, 2).toUpperCase(),
          location: trendLocations[seq % trendLocations.length],
          remote: seq % 3 !== 0,
          employmentType: "FULL_TIME",
          salaryMin: 95000 + (seq % 12) * 8000,
          salaryMax: 130000 + (seq % 12) * 9000,
          currency: "USD",
          description: `${title} role at ${company} — applied via autopilot during an earlier sync.`,
          tags: JSON.stringify(tags),
          easyApply: seq % 2 === 0,
          matchScore: 58 + ((seq * 5) % 30),
          status: "dismissed",
          postedAt: new Date(now.getTime() - (t.d + 2) * 86400000),
        },
      });
      await db.application.create({
        data: {
          jobId: archive.id,
          status,
          method: "autopilot",
          matchScore: archive.matchScore,
          tailoredResume: TAILORED_SNIPPET,
          coverLetter: COVER_LETTER_SNIPPET,
          appliedAt,
          createdAt: appliedAt,
        },
      });
      trendIdx++;
    }
  }

  // Named pipeline applications
  for (const p of APPLICATION_PLAN) {
    const job = jobByExternal.get(p.externalId);
    if (!job) continue;
    const appliedAt = p.daysAgo !== null ? new Date(now.getTime() - p.daysAgo * 86400000) : null;
    await db.application.create({
      data: {
        jobId: job.id,
        status: p.status,
        method: p.method,
        matchScore: job.matchScore,
        tailoredResume: TAILORED_SNIPPET,
        coverLetter: COVER_LETTER_SNIPPET,
        appliedAt,
        notes: p.note ?? null,
        createdAt: appliedAt ?? new Date(now.getTime() - 3600000),
      },
    });
    if (p.status === "queued") {
      await db.job.update({ where: { id: job.id }, data: { status: "saved" } });
    }
  }

  // ── Automation config ──────────────────────────────────────────────────
  await db.automationConfig.create({
    data: {
      enabled: false,
      keywords: "Full Stack Engineer, Senior Software Engineer, Backend Engineer",
      locations: "Remote, United States, Canada",
      remoteOnly: true,
      minSalary: 140000,
      employmentTypes: JSON.stringify(["FULL_TIME", "CONTRACT"]),
      dailyLimit: 15,
      minMatchScore: 75,
      autoTailor: true,
      autoCoverLetter: true,
      appliedToday: 4,
      totalApplied: 87,
      lastRunAt: new Date(now.getTime() - 47 * 60000),
    },
  });

  // ── Activity logs ──────────────────────────────────────────────────────
  const activityPlan: Array<{ type: string; platform: string | null; message: string; minutesAgo: number }> = [
    { type: "apply", platform: "indeed", message: "Autopilot applied to Frontend Engineer — Design Systems at Linear · 90% match", minutesAgo: 6 },
    { type: "ai", platform: null, message: "AI tailored resume bullets for Vercel — Senior Full Stack Engineer", minutesAgo: 9 },
    { type: "apply", platform: "linkedin", message: "Autopilot applied to Product Engineer — AI Features at Perplexity · 93% match", minutesAgo: 14 },
    { type: "sync", platform: "indeed", message: "Synced 42 new listings from Indeed (8 relevant)", minutesAgo: 24 },
    { type: "success", platform: "glassdoor", message: "Screening update: Backend Engineer at Stripe moved to Recruiter Screen", minutesAgo: 33 },
    { type: "ai", platform: null, message: "AI generated cover letter for Plaid — API Platform Engineer", minutesAgo: 51 },
    { type: "apply", platform: "ziprecruiter", message: "Autopilot applied to Full Stack Engineer (Remote) at Zapier · 91% match", minutesAgo: 55 },
    { type: "sync", platform: "linkedin", message: "Synced 36 new listings from LinkedIn (6 relevant)", minutesAgo: 41 },
    { type: "warning", platform: "linkedin", message: "LinkedIn rate-limit guard engaged — pausing 5 minutes", minutesAgo: 46 },
    { type: "sync", platform: "ziprecruiter", message: "Synced 28 new listings from ZipRecruiter (4 relevant)", minutesAgo: 55 },
    { type: "info", platform: null, message: "Daily budget check: 4/15 applications used today", minutesAgo: 60 },
    { type: "success", platform: "greenhouse", message: "Offer stage: API Platform Engineer at Plaid — verbal offer received 🎉", minutesAgo: 132 },
    { type: "error", platform: "glassdoor", message: "Glassdoor session expired — re-authentication required", minutesAgo: 178 },
    { type: "apply", platform: "indeed", message: "Autopilot applied to Full Stack Developer (React + Python) at Figma · 92% match", minutesAgo: 190 },
    { type: "sync", platform: "indeed", message: "Initial sync from Indeed — 47 listings imported", minutesAgo: 320 },
  ];
  for (const a of activityPlan) {
    await db.activityLog.create({
      data: { type: a.type, platform: a.platform, message: a.message, createdAt: new Date(now.getTime() - a.minutesAgo * 60000) },
    });
  }

  // ── Tailored docs ──────────────────────────────────────────────────────
  const vercel = jobByExternal.get("linkedin-l8d3f9a6c7b2");
  const plaid = jobByExternal.get("linkedin-k4c9b7d3e6a8");
  if (vercel) {
    await db.tailoredDoc.create({ data: { jobId: vercel.id, kind: "cover_letter", content: COVER_LETTER_SNIPPET, model: "glm-4.5-air" } });
    await db.tailoredDoc.create({ data: { jobId: vercel.id, kind: "resume_bullets", content: TAILORED_SNIPPET, model: "glm-4.5-air" } });
  }
  if (plaid) {
    await db.tailoredDoc.create({ data: { jobId: plaid.id, kind: "cover_letter", content: COVER_LETTER_SNIPPET, model: "glm-4.5-air" } });
  }

  const counts = {
    jobs: await db.job.count(),
    applications: await db.application.count(),
    connectors: await db.connector.count(),
    activity: await db.activityLog.count(),
    docs: await db.tailoredDoc.count(),
  };
  console.log("✅ Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
