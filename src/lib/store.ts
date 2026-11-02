"use client";

import { create } from "zustand";
import { toast } from "sonner";
import type {
  Activity, Application, AutomationConfig, Connector, EngineHealth, Job, Profile, Stats, TailoredDocItem,
} from "./types";

export type SectionId = "overview" | "jobs" | "pipeline" | "connections" | "studio" | "activity";

interface BootstrapResponse {
  profile: Profile | null;
  connectors: Connector[];
  config: AutomationConfig | null;
  jobs: Job[];
  applications: Application[];
  activity: Activity[];
  stats: Stats | null;
  engine: EngineHealth;
}

interface PlatformState {
  booted: boolean;
  loading: boolean;
  section: SectionId;
  profile: Profile | null;
  connectors: Connector[];
  config: AutomationConfig | null;
  jobs: Job[];
  applications: Application[];
  activity: Activity[];
  stats: Stats | null;
  engine: EngineHealth;
  realtime: "connecting" | "live" | "offline";
  ticking: boolean;
  // actions
  setSection: (s: SectionId) => void;
  bootstrap: () => Promise<void>;
  toggleAutopilot: () => Promise<void>;
  runAutopilotNow: () => Promise<void>;
  syncPlatform: (platform: string) => Promise<void>;
  syncAll: () => Promise<void>;
  quickApply: (jobId: string) => Promise<boolean>;
  moveApplication: (id: string, status: string) => Promise<void>;
  setJobStatus: (id: string, status: string) => Promise<void>;
  connectPlatform: (platform: string, email: string) => Promise<boolean>;
  disconnectPlatform: (platform: string) => Promise<void>;
  toggleConnectorAutoApply: (platform: string, value: boolean) => Promise<void>;
  updateConfig: (patch: Partial<AutomationConfig>) => Promise<void>;
  saveProfile: (p: Partial<Profile>) => Promise<boolean>;
  importResume: (file: File) => Promise<{ ok: boolean; warnings?: string[] }>;
  generateDoc: (jobId: string, kind: string) => Promise<TailoredDocItem | null>;
  setRealtime: (s: PlatformState["realtime"]) => void;
  pushLiveActivity: (a: Activity) => void;
}

export const usePlatform = create<PlatformState>((set, get) => ({
  booted: false,
  loading: false,
  section: "overview",
  profile: null,
  connectors: [],
  config: null,
  jobs: [],
  applications: [],
  activity: [],
  stats: null,
  engine: { online: false },
  realtime: "connecting",
  ticking: false,

  setSection: (section) => set({ section }),

  bootstrap: async () => {
    try {
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      const data = (await res.json()) as BootstrapResponse;
      set({
        booted: true,
        profile: data.profile,
        connectors: data.connectors,
        config: data.config,
        jobs: data.jobs,
        applications: data.applications,
        activity: data.activity,
        stats: data.stats,
        engine: data.engine,
      });
    } catch {
      toast.error("Failed to load platform data");
    }
  },

  toggleAutopilot: async () => {
    const config = get().config;
    if (!config) return;
    const next = !config.enabled;
    const res = await fetch("/api/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    if (!res.ok) {
      toast.error("Could not toggle autopilot");
      return;
    }
    const data = await res.json();
    set({ config: data.config });
    if (next) {
      toast.success("Autopilot engaged 🚀", { description: "Hunting and applying to matched jobs for you." });
      setTimeout(() => get().runAutopilotNow(), 1200);
    } else {
      toast("Autopilot paused", { description: "No further applications will be sent." });
    }
    get().bootstrap();
  },

  runAutopilotNow: async () => {
    if (get().ticking) return;
    set({ ticking: true });
    try {
      const res = await fetch("/api/automation/tick", { method: "POST" });
      const data = await res.json();
      if (res.status === 409) {
        toast.warning(data.reason ?? "Autopilot is disabled");
        return;
      }
      if (data.ok) {
        if (data.applied > 0) {
          toast.success(`Autopilot sent ${data.applied} application${data.applied > 1 ? "s" : ""}`, {
            description: `Budget today: ${data.appliedToday}/${data.dailyLimit}`,
          });
        } else {
          toast(data.message ?? "No new applications this tick");
        }
        if (data.dailyLimitReached) {
          toast.warning("Daily limit reached", { description: "Autopilot will resume tomorrow." });
        }
      }
    } catch {
      toast.error("Autopilot tick failed — is the engine running?");
    } finally {
      set({ ticking: false });
      await get().bootstrap();
    }
  },

  syncPlatform: async (platform) => {
    const t = toast.loading(`Syncing ${label(platform)}…`);
    try {
      const res = await fetch("/api/jobs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Sync failed", { id: t });
        return;
      }
      toast.success(`${label(platform)} sync complete`, {
        id: t,
        description: `${data.total} listings scanned · ${data.imported} new · ${data.relevant} above your match bar`,
      });
      await get().bootstrap();
    } catch {
      toast.error("Sync failed — engine unreachable", { id: t });
    }
  },

  syncAll: async () => {
    const connected = get().connectors.filter((c) => c.status === "connected");
    if (connected.length === 0) {
      toast.warning("No portals connected yet");
      return;
    }
    for (const c of connected) {
      await get().syncPlatform(c.platform);
    }
  },

  quickApply: async (jobId) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return false;
    const t = toast.loading(`Applying to ${job.title} at ${job.company}…`);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, method: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Application failed", { id: t });
        return false;
      }
      toast.success(`Applied — ${job.company} 🎯`, {
        id: t,
        description: data.application?.steps?.length
          ? `Pipeline: ${data.application.steps.map((s: { step: string }) => s.step).join(" → ")}`
          : "Your application was submitted with tailored documents.",
      });
      await get().bootstrap();
      return true;
    } catch {
      toast.error("Application failed — engine unreachable", { id: t });
      return false;
    }
  },

  moveApplication: async (id, status) => {
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      await get().bootstrap();
    } else {
      toast.error("Could not update application");
    }
  },

  setJobStatus: async (id, status) => {
    const res = await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, status: status as Job["status"] } : j)) }));
      if (status === "saved") toast.success("Saved to shortlist");
      if (status === "dismissed") toast("Dismissed");
    }
  },

  connectPlatform: async (platform, email) => {
    const res = await fetch("/api/connectors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, action: "connect", accountEmail: email }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not connect");
      return false;
    }
    set((s) => ({ connectors: s.connectors.map((c) => (c.platform === platform ? data.connector : c)) }));
    toast.success(`${label(platform)} connected ✅`, { description: "Run a sync to pull fresh listings." });
    await get().bootstrap();
    return true;
  },

  disconnectPlatform: async (platform) => {
    const res = await fetch("/api/connectors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, action: "disconnect" }),
    });
    if (res.ok) {
      const data = await res.json();
      set((s) => ({ connectors: s.connectors.map((c) => (c.platform === platform ? data.connector : c)) }));
      toast(`${label(platform)} disconnected`);
    }
  },

  toggleConnectorAutoApply: async (platform, value) => {
    const res = await fetch("/api/connectors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, action: "autoapply", autoApply: value }),
    });
    if (res.ok) {
      const data = await res.json();
      set((s) => ({ connectors: s.connectors.map((c) => (c.platform === platform ? data.connector : c)) }));
    }
  },

  updateConfig: async (patch) => {
    const res = await fetch("/api/automation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      set({ config: data.config });
    } else {
      toast.error("Could not save preferences");
    }
  },

  saveProfile: async (p) => {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (res.ok) {
      const data = await res.json();
      set({ profile: data.profile });
      toast.success("Profile saved — matching updated");
      return true;
    }
    toast.error("Could not save profile");
    return false;
  },

  importResume: async (file) => {
    const t = toast.loading("Reading your resume…");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/resume/upload", { method: "POST", body });
      const data = await res.json();
      toast.dismiss(t);
      if (res.ok) {
        set({ profile: data.profile });
        const n = data.profile?.skills?.length ?? 0;
        toast.success(`Resume imported — ${n} skills, ${data.profile?.experienceYears ?? 0} yrs experience auto-filled`);
        for (const w of (data.meta?.warnings ?? []).slice(0, 2)) toast.warning(w);
        return { ok: true, warnings: data.meta?.warnings ?? [] };
      }
      toast.error(data.error ?? "Could not parse this resume");
      return { ok: false };
    } catch {
      toast.dismiss(t);
      toast.error("Upload failed — check your connection and try again");
      return { ok: false };
    }
  },

  generateDoc: async (jobId, kind) => {
    const t = toast.loading(kind === "cover_letter" ? "AI writing your cover letter…" : kind === "resume_bullets" ? "AI tailoring your resume…" : "AI drafting outreach…");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, kind }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Generation failed", { id: t });
        return null;
      }
      toast.success("Document ready ✨", { id: t });
      return data.doc as TailoredDocItem;
    } catch {
      toast.error("AI generation failed", { id: t });
      return null;
    }
  },

  setRealtime: (realtime) => set({ realtime }),

  pushLiveActivity: (a) => {
    set((s) => ({ activity: [a, ...s.activity].slice(0, 80) }));
  },
}));

export function label(platform: string): string {
  const labels: Record<string, string> = {
    indeed: "Indeed", linkedin: "LinkedIn", glassdoor: "Glassdoor",
    ziprecruiter: "ZipRecruiter", greenhouse: "Greenhouse", lever: "Lever",
  };
  return labels[platform] ?? platform;
}
