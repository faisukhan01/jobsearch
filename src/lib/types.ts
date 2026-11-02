/** Shared types between API routes and UI */

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string;
  headline: string | null;
  summary: string | null;
  skills: string[];
  experienceYears: number;
  desiredSalary: number | null;
  currency: string;
  resumeFileName: string | null;
}

export interface Connector {
  id: string;
  platform: string;
  status: "connected" | "disconnected" | "error";
  accountEmail: string | null;
  autoApply: boolean;
  lastSyncAt: string | null;
  syncedJobs: number;
}

export interface Job {
  id: string;
  externalId: string;
  platform: string;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string;
  remote: boolean;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  description: string | null;
  tags: string[];
  easyApply: boolean;
  matchScore: number;
  status: "discovered" | "saved" | "dismissed";
  postedAt: string | null;
  createdAt: string;
  hasApplication?: boolean;
}

export interface Application {
  id: string;
  jobId: string;
  job: Job;
  status: "queued" | "applied" | "screening" | "interview" | "offer" | "rejected" | "withdrawn";
  method: "autopilot" | "manual";
  matchScore: number;
  coverLetter: string | null;
  tailoredResume: string | null;
  appliedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AutomationConfig {
  id: string;
  enabled: boolean;
  keywords: string;
  locations: string;
  remoteOnly: boolean;
  minSalary: number;
  employmentTypes: string[];
  dailyLimit: number;
  minMatchScore: number;
  autoTailor: boolean;
  autoCoverLetter: boolean;
  appliedToday: number;
  totalApplied: number;
  lastRunAt: string | null;
}

export interface Activity {
  id: string;
  type: "info" | "success" | "warning" | "error" | "apply" | "sync" | "ai";
  platform: string | null;
  message: string;
  createdAt: string;
}

export interface Stats {
  totalApplications: number;
  appliedToday: number;
  interviews: number;
  offers: number;
  responseRate: number;
  successRate: number;
  avgMatchScore: number;
  byStatus: Record<string, number>;
  byPlatform: Array<{ platform: string; count: number }>;
  trend: Array<{ date: string; label: string; applied: number }>;
  topMatches: Job[];
}

export interface EngineHealth {
  online: boolean;
  status?: string;
  version?: string;
  simulation?: boolean;
  connectors?: number;
  autopilot?: { enabled: boolean; appliedToday: number };
}

export interface TailoredDocItem {
  id: string;
  jobId: string | null;
  kind: string;
  content: string;
  model: string | null;
  createdAt: string;
  jobTitle?: string;
  jobCompany?: string;
}

export interface PlatformEvent {
  event: "activity" | "application" | "autopilot" | "sync" | "ai" | "connection-status";
  payload: Record<string, unknown>;
}
