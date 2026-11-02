"use client";

import { useState } from "react";
import { usePlatform, label } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformBadge, timeAgo, ACTIVITY_ICONS } from "./shared";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "apply", label: "Applications" },
  { id: "sync", label: "Syncs" },
  { id: "ai", label: "AI" },
  { id: "success", label: "Success" },
  { id: "warning", label: "Warnings" },
  { id: "error", label: "Errors" },
  { id: "info", label: "Info" },
] as const;

export function ActivityFeed() {
  const { activity, bootstrap } = usePlatform();
  const [filter, setFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = filter === "all" ? activity : activity.filter((a) => a.type === filter);

  const handleRefresh = async () => {
    setRefreshing(true);
    await bootstrap();
    setRefreshing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-all",
              filter === f.id
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200"
            )}>
            {f.label}
          </button>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1.5 text-xs text-zinc-400" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-zinc-600">No {filter !== "all" ? filter + " " : ""}events logged yet.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {filtered.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[2%]">
                  <span className="mt-0.5 text-base leading-none">{ACTIVITY_ICONS[a.type] ?? "•"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-zinc-200">{a.message}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {a.platform && <PlatformBadge platform={a.platform} />}
                      <span className="text-[10px] text-zinc-600">{timeAgo(a.createdAt)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(
                    "shrink-0 border-white/10 text-[9px] uppercase tracking-wider",
                    a.type === "apply" ? "text-emerald-400/80" :
                    a.type === "ai" ? "text-violet-400/80" :
                    a.type === "sync" ? "text-sky-400/80" :
                    a.type === "warning" ? "text-amber-400/80" :
                    a.type === "error" ? "text-rose-400/80" :
                    a.type === "success" ? "text-emerald-400/80" : "text-zinc-500"
                  )}>
                    {a.type}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-zinc-600">
        Showing {filtered.length} of {activity.length} events · new events stream in live via Socket.IO
      </p>
    </div>
  );
}
