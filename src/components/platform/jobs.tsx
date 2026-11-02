"use client";

import { useMemo, useState } from "react";
import { usePlatform, label } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CompanyAvatar, EasyApplyBadge, MatchRing, PlatformBadge, formatMoney, timeAgo } from "./shared";
import { cn } from "@/lib/utils";
import { Bookmark, BookmarkCheck, Copy, Check, Loader2, RefreshCw, Search, Sparkles, X, Zap } from "lucide-react";
import type { Job } from "@/lib/types";

export function JobRadar() {
  const { jobs, connectors, config, syncAll, syncPlatform, quickApply, setJobStatus, generateDoc } = usePlatform();
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [detail, setDetail] = useState<Job | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [doc, setDoc] = useState<{ kind: string; content: string } | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const connected = connectors.filter((c) => c.status === "connected");

  const filtered = useMemo(() => {
    return jobs
      .filter((j) => j.status !== "dismissed")
      .filter((j) => (platform === "all" ? true : j.platform === platform))
      .filter((j) => (remoteOnly ? j.remote : true))
      .filter((j) => j.matchScore >= minScore)
      .filter((j) => {
        if (!q.trim()) return true;
        const t = q.toLowerCase();
        return j.title.toLowerCase().includes(t) || j.company.toLowerCase().includes(t) || j.tags.some((tag) => tag.toLowerCase().includes(t));
      });
  }, [jobs, q, platform, remoteOnly, minScore]);

  const handleSyncAll = async () => {
    setSyncing(true);
    await syncAll();
    setSyncing(false);
  };

  const handleApply = async (jobId: string) => {
    setApplying(jobId);
    await quickApply(jobId);
    setApplying(null);
  };

  const openDetail = (job: Job) => {
    setDetail(job);
    setDoc(null);
    setCopied(false);
  };

  const handleGenerate = async (kind: string) => {
    if (!detail) return;
    setDocLoading(true);
    const d = await generateDoc(detail.id, kind);
    if (d) setDoc({ kind, content: d.content });
    setDocLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Sync bar */}
      <Card className="border-white/5 bg-black/20">
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <Button size="sm" onClick={handleSyncAll} disabled={syncing || connected.length === 0}
            className="h-8 gap-1.5 bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync all portals"}
          </Button>
          {connected.map((c) => (
            <Button key={c.platform} size="sm" variant="outline" className="h-8 border-white/10 text-xs text-zinc-300 hover:bg-white/5"
              onClick={() => syncPlatform(c.platform)}>
              <RefreshCw className="h-3 w-3" /> {label(c.platform)}
            </Button>
          ))}
          <span className="ml-auto text-xs text-zinc-500">
            {jobs.filter((j) => j.status !== "dismissed").length} listings · {filtered.length} shown · min bar {config?.minMatchScore ?? 0}%
          </span>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, company, skill…" className="h-9 bg-black/30 pl-9 text-sm" />
        </div>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="h-9 w-40 bg-black/30 text-sm" aria-label="Filter by platform">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {["indeed", "linkedin", "glassdoor", "ziprecruiter", "greenhouse", "lever"].map((p) => (
              <SelectItem key={p} value={p}>{label(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3">
          <span className="text-xs text-zinc-400">Remote</span>
          <Switch checked={remoteOnly} onCheckedChange={setRemoteOnly} aria-label="Remote only" />
        </div>
        <div className="flex h-9 min-w-44 items-center gap-2.5 rounded-md border border-white/10 bg-black/30 px-3">
          <span className="text-xs text-zinc-400">≥ {minScore}%</span>
          <Slider value={[minScore]} onValueChange={(v) => setMinScore(v[0])} max={95} step={5} className="w-24" aria-label="Minimum match score" />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-zinc-500">
          No listings match your filters. Try syncing a portal or relaxing the filters.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              applying={applying === job.id}
              onApply={() => handleApply(job.id)}
              onSave={() => setJobStatus(job.id, job.status === "saved" ? "discovered" : "saved")}
              onOpen={() => openDetail(job)}
            />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg border-white/10 bg-zinc-950">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <CompanyAvatar name={detail.company} logo={detail.companyLogo} size="lg" />
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-left leading-snug">{detail.title}</DialogTitle>
                    <DialogDescription className="text-left">
                      {detail.company} · {detail.location} · posted {timeAgo(detail.postedAt)}
                    </DialogDescription>
                  </div>
                  <MatchRing score={detail.matchScore} size={52} />
                </div>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2">
                <PlatformBadge platform={detail.platform} />
                {detail.remote && <span className="text-xs text-zinc-400">🌐 Remote</span>}
                {detail.easyApply && <EasyApplyBadge />}
                <span className="text-xs font-medium text-emerald-300">{formatMoney(detail.salaryMin, detail.salaryMax, detail.currency)}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {detail.tags.map((t) => (
                  <Badge key={t} variant="outline" className="border-white/10 bg-white/5 text-[10px] text-zinc-300">{t}</Badge>
                ))}
              </div>

              <p className="text-sm leading-relaxed text-zinc-400">{detail.description}</p>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" /> AI Documents
                </p>
                {doc ? (
                  <div className="space-y-2">
                    <div className="max-h-48 overflow-y-auto firefox-scroll whitespace-pre-wrap rounded-md bg-black/40 p-3 text-xs leading-relaxed text-zinc-300">
                      {doc.content}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => { navigator.clipboard.writeText(doc.content); setCopied(true); }}>
                        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />} Copy
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => setDoc(null)}><X className="h-3 w-3" /> Close</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px] border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                      disabled={docLoading} onClick={() => handleGenerate("cover_letter")}>
                      {docLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Cover letter
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px] border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                      disabled={docLoading} onClick={() => handleGenerate("resume_bullets")}>
                      Resume highlights
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px] border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                      disabled={docLoading} onClick={() => handleGenerate("outreach_message")}>
                      Outreach DM
                    </Button>
                  </div>
                )}
              </div>

              <Button
                className="w-full gap-1.5 bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                disabled={applying || detail.hasApplication}
                onClick={() => handleApply(detail.id)}
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {detail.hasApplication ? "Already applied" : `Apply now · ${detail.matchScore}% match`}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobCard({ job, applying, onApply, onSave, onOpen }: {
  job: Job; applying: boolean; onApply: () => void; onSave: () => void; onOpen: () => void;
}) {
  const saved = job.status === "saved";
  return (
    <Card className="group cursor-pointer border-white/5 bg-black/20 transition-all hover:-translate-y-0.5 hover:border-emerald-500/25 hover:shadow-[0_8px_30px_-12px_oklch(0.84_0.16_160/25%)]" onClick={onOpen}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <CompanyAvatar name={job.company} logo={job.companyLogo} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight group-hover:text-emerald-200">{job.title}</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{job.company}</p>
          </div>
          <MatchRing score={job.matchScore} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400">
          <PlatformBadge platform={job.platform} />
          <span>{job.location}</span>
          {job.remote && <span className="text-emerald-400/80">🌐</span>}
          <span className="ml-auto font-medium text-emerald-300/90">{formatMoney(job.salaryMin, job.salaryMax, job.currency)}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {job.tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded border border-white/5 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{t}</span>
          ))}
          {job.easyApply && <span className="ml-auto"><EasyApplyBadge /></span>}
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
          <span className="text-[10px] text-zinc-600">{timeAgo(job.postedAt)}</span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-500 hover:text-amber-300"
              onClick={(e) => { e.stopPropagation(); onSave(); }} aria-label={saved ? "Unsave job" : "Save job"}>
              {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-amber-300" /> : <Bookmark className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" disabled={applying || job.hasApplication}
              className="h-7 gap-1 bg-emerald-500/90 px-2.5 text-[11px] text-zinc-950 hover:bg-emerald-400"
              onClick={(e) => { e.stopPropagation(); onApply(); }}>
              {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              {job.hasApplication ? "Applied" : "Apply"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
