"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { usePlatform } from "@/lib/store";
import { toast } from "sonner";
import { Shell } from "@/components/platform/shell";
import { Overview } from "@/components/platform/overview";
import { JobRadar } from "@/components/platform/jobs";
import { Pipeline } from "@/components/platform/board";
import { Connections } from "@/components/platform/connections";
import { Studio } from "@/components/platform/studio";
import { ActivityFeed } from "@/components/platform/activity-feed";
import { Loader2, Rocket } from "lucide-react";
import type { Activity } from "@/lib/types";

export default function Page() {
  const { booted, bootstrap, section, engine, realtime, setRealtime, pushLiveActivity } = usePlatform();
  const socketRef = useRef<Socket | null>(null);

  // ── Boot + realtime + heartbeat ───────────────────────────────────────
  useEffect(() => {
    bootstrap();

    // Realtime event bus (Socket.IO via Caddy gateway → port 3003)
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => setRealtime("live"));
    socket.on("disconnect", () => setRealtime("offline"));
    socket.on("connect_error", () => setRealtime("offline"));

    socket.on("activity", (a: Partial<Activity>) => {
      if (!a.message) return;
      pushLiveActivity({
        id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: (a.type as Activity["type"]) ?? "info",
        platform: a.platform ?? null,
        message: a.message,
        createdAt: a.createdAt ?? new Date().toISOString(),
      });
      if (a.type === "apply") toast.success(a.message);
      else if (a.type === "warning") toast.warning(a.message);
      else if (a.type === "error") toast.error(a.message);
      else if (a.type === "sync") toast(a.message);
    });

    socket.on("application", (p: { message?: string }) => {
      if (p?.message) toast.success(p.message);
      setTimeout(() => bootstrap(), 400);
    });

    socket.on("ai", (p: { jobTitle?: string }) => {
      if (p?.jobTitle) toast.success(`AI tailored documents for ${p.jobTitle}`);
    });

    // Heartbeat: refresh engine health + run autopilot ticks while engaged
    const healthTimer = setInterval(async () => {
      try {
        const res = await fetch("/api/engine/health", { cache: "no-store" });
        const data = await res.json();
        if (data.online !== engine.online) bootstrap();
      } catch { /* ignore */ }
    }, 30000);

    const tickTimer = setInterval(() => {
      const { config, runAutopilotNow } = usePlatform.getState();
      if (config?.enabled) runAutopilotNow();
    }, 60000);

    return () => {
      socket.disconnect();
      clearInterval(healthTimer);
      clearInterval(tickTimer);
    };
  }, []);

  if (!booted) {
    return (
      <div className="app-bg flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="grid-overlay pointer-events-none fixed inset-0" aria-hidden />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-2xl shadow-emerald-500/30">
          <Rocket className="h-8 w-8 text-zinc-950" />
        </div>
        <div className="relative text-center">
          <p className="text-lg font-bold tracking-tight">JobPilot</p>
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Waking the automation engine…
          </p>
        </div>
      </div>
    );
  }

  return (
    <Shell>
      {section === "overview" && <Overview />}
      {section === "jobs" && <JobRadar />}
      {section === "pipeline" && <Pipeline />}
      {section === "connections" && <Connections />}
      {section === "studio" && <Studio />}
      {section === "activity" && <ActivityFeed />}
    </Shell>
  );
}
