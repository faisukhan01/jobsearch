"use client";

import { useMemo, useState } from "react";
import { usePlatform } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyAvatar, MatchRing, PlatformBadge, StatusBadge, STATUS_META, formatMoney, timeAgo } from "./shared";
import { cn } from "@/lib/utils";
import { ChevronRight, Loader2 } from "lucide-react";
import type { Application } from "@/lib/types";

const COLUMNS = ["queued", "applied", "screening", "interview", "offer", "rejected"] as const;
const NEXT_STATUS: Record<string, string> = {
  queued: "applied", applied: "screening", screening: "interview", interview: "offer", rejected: "applied",
};

export function Pipeline() {
  const { applications, moveApplication, quickApply } = usePlatform();
  const [detail, setDetail] = useState<Application | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Application[]>();
    for (const col of COLUMNS) map.set(col, []);
    for (const a of applications) {
      if (map.has(a.status)) map.get(a.status)!.push(a);
    }
    return map;
  }, [applications]);

  const advance = async (a: Application) => {
    const next = NEXT_STATUS[a.status];
    if (!next) return;
    setMoving(a.id);
    await moveApplication(a.id, next);
    setMoving(null);
    if (detail?.id === a.id) setDetail({ ...detail, status: next as Application["status"] });
  };

  return (
    <div className="space-y-4">
      <div className="kanban-scroll firefox-scroll -mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
        <div className="flex min-w-max gap-3">
          {COLUMNS.map((col) => {
            const items = grouped.get(col) ?? [];
            const meta = STATUS_META[col];
            return (
              <div key={col} className="w-64 shrink-0 sm:w-72">
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                  <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                  <span className="text-xs font-semibold text-zinc-200">{meta.label}</span>
                  <span className="ml-auto rounded-full bg-white/5 px-1.5 text-[10px] tabular-nums text-zinc-400">{items.length}</span>
                </div>
                <div className="max-h-[62vh] space-y-2 overflow-y-auto firefox-scroll pr-0.5">
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-[11px] text-zinc-600">Empty</div>
                  )}
                  {items.map((a) => (
                    <KanbanCard key={a.id} app={a} onOpen={() => setDetail(a)} onAdvance={() => advance(a)} moving={moving === a.id} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[11px] text-zinc-600">
        Tip: use <ChevronRight className="inline h-3 w-3" /> to advance a candidate. Status changes are logged to the live feed.
      </p>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg border-white/10 bg-zinc-950">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <CompanyAvatar name={detail.job.company} logo={detail.job.companyLogo} size="lg" />
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-left leading-snug">{detail.job.title}</DialogTitle>
                    <DialogDescription className="text-left">{detail.job.company} · {detail.job.location}</DialogDescription>
                  </div>
                  <MatchRing score={detail.matchScore} size={52} />
                </div>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={detail.status} />
                <PlatformBadge platform={detail.job.platform} />
                <Badge variant="outline" className={cn("text-[10px]", detail.method === "autopilot" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-zinc-500/25 bg-zinc-500/10 text-zinc-300")}>
                  {detail.method === "autopilot" ? "🤖 Autopilot" : "👤 Manual"}
                </Badge>
                <span className="text-[11px] text-zinc-500">{detail.appliedAt ? `Applied ${timeAgo(detail.appliedAt)}` : "Not sent yet"}</span>
                <span className="ml-auto text-xs font-medium text-emerald-300">{formatMoney(detail.job.salaryMin, detail.job.salaryMax, detail.job.currency)}</span>
              </div>

              {detail.notes && (
                <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-200">📌 {detail.notes}</div>
              )}

              {detail.tailoredResume && (
                <DocBlock title="Tailored Resume Highlights" content={detail.tailoredResume} />
              )}
              {detail.coverLetter && (
                <DocBlock title="Cover Letter Sent" content={detail.coverLetter} />
              )}

              <div className="flex gap-2">
                <Select value={detail.status} onValueChange={(s) => { moveApplication(detail.id, s); setDetail({ ...detail, status: s as Application["status"] }); }}>
                  <SelectTrigger className="h-8 flex-1 bg-black/30 text-xs" aria-label="Change status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => (
                      <SelectItem key={c} value={c}>{STATUS_META[c].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {NEXT_STATUS[detail.status] && (
                  <Button size="sm" className="h-8 gap-1 bg-emerald-500 text-zinc-950 hover:bg-emerald-400" disabled={moving} onClick={() => advance(detail)}>
                    {moving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    Advance
                  </Button>
                )}
              </div>

              {detail.status === "queued" && (
                <Button size="sm" className="w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                  onClick={() => { quickApply(detail.jobId); setDetail(null); }}>
                  Send application now
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KanbanCard({ app, onOpen, onAdvance, moving }: { app: Application; onOpen: () => void; onAdvance: () => void; moving: boolean }) {
  return (
    <Card className="cursor-pointer border-white/5 bg-black/20 p-0 transition-all hover:border-emerald-500/25" onClick={onOpen}>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">{app.job.title}</p>
            <p className="truncate text-[11px] text-zinc-500">{app.job.company}</p>
          </div>
          <MatchRing score={app.matchScore} size={34} />
        </div>
        <div className="flex items-center justify-between">
          <PlatformBadge platform={app.job.platform} />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600">{app.appliedAt ? timeAgo(app.appliedAt) : "queued"}</span>
            {NEXT_STATUS[app.status] && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-zinc-500 hover:text-emerald-300"
                onClick={(e) => { e.stopPropagation(); onAdvance(); }} disabled={moving} aria-label="Advance status">
                {moving ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DocBlock({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
      <div className="max-h-40 overflow-y-auto firefox-scroll whitespace-pre-wrap rounded-md border border-white/5 bg-black/30 p-3 text-xs leading-relaxed text-zinc-300">
        {content}
      </div>
    </div>
  );
}
