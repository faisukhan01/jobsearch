"use client";

import { useMemo, useState } from "react";
import { usePlatform } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MatchRing, timeAgo } from "./shared";
import { BrainCircuit, Check, Copy, FileText, Loader2, Plus, Sparkles, X } from "lucide-react";
import type { TailoredDocItem } from "@/lib/types";

export function Studio() {
  const { profile, saveProfile, jobs, generateDoc } = usePlatform();

  const [form, setForm] = useState({
    fullName: profile?.fullName ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
    location: profile?.location ?? "Remote",
    headline: profile?.headline ?? "",
    summary: profile?.summary ?? "",
    experienceYears: profile?.experienceYears ?? 3,
    desiredSalary: profile?.desiredSalary ?? 150000,
  });
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [jobId, setJobId] = useState<string>("");
  const [doc, setDoc] = useState<TailoredDocItem | null>(null);
  const [docLoading, setDocLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pendingJobs = useMemo(() => jobs.filter((j) => j.status !== "dismissed").slice(0, 40), [jobs]);
  const selectedJob = pendingJobs.find((j) => j.id === jobId);

  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !skills.some((k) => k.toLowerCase() === s.toLowerCase())) {
      setSkills([...skills, s]);
    }
    setNewSkill("");
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveProfile({ ...form, skills });
    setSaving(false);
    if (ok) setSavedAt(Date.now());
  };

  const handleGenerate = async (kind: string) => {
    if (!jobId) return;
    setDocLoading(kind);
    const d = await generateDoc(jobId, kind);
    if (d) {
      setDoc(d);
      setCopied(false);
    }
    setDocLoading(null);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* ── Profile editor ─────────────────────────────────────────── */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-emerald-400" /> Career Profile
            <span className="ml-auto text-[10px] font-normal text-zinc-500">drives matching + tailoring</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name">
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="h-9 bg-black/30 text-sm" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 bg-black/30 text-sm" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9 bg-black/30 text-sm" />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="h-9 bg-black/30 text-sm" />
            </Field>
          </div>
          <Field label="Headline">
            <Input value={form.headline ?? ""} onChange={(e) => setForm({ ...form, headline: e.target.value })} className="h-9 bg-black/30 text-sm" />
          </Field>
          <Field label="Summary">
            <Textarea value={form.summary ?? ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={4} className="bg-black/30 text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Years of experience">
              <Input type="number" min={0} max={40} value={form.experienceYears}
                onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })} className="h-9 bg-black/30 text-sm" />
            </Field>
            <Field label="Desired salary (USD)">
              <Input type="number" min={0} step={5000} value={form.desiredSalary ?? 0}
                onChange={(e) => setForm({ ...form, desiredSalary: Number(e.target.value) })} className="h-9 bg-black/30 text-sm" />
            </Field>
          </div>

          <Field label="Skills">
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <Badge key={s} variant="outline" className="gap-1 border-emerald-500/20 bg-emerald-500/5 text-[11px] text-emerald-200">
                  {s}
                  <button onClick={() => setSkills(skills.filter((k) => k !== s))} aria-label={`Remove ${s}`}>
                    <X className="h-3 w-3 hover:text-rose-400" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSkill()}
                placeholder="Add a skill…" className="h-8 bg-black/30 text-xs" />
              <Button size="sm" variant="outline" className="h-8 border-white/10" onClick={addSkill}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Field>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : savedAt ? <Check className="h-4 w-4" /> : null}
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      {/* ── Generation studio ──────────────────────────────────────── */}
      <div className="space-y-5 lg:col-span-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BrainCircuit className="h-4 w-4 text-violet-400" /> AI Document Studio
              <Badge variant="outline" className="ml-auto border-violet-500/25 bg-violet-500/10 text-[9px] text-violet-300">GLM-4.5-AIR</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Target job</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger className="h-10 bg-black/30" aria-label="Select job">
                  <SelectValue placeholder="Choose a job to tailor for…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {pendingJobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title} · {j.company} ({j.matchScore}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedJob && (
              <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 p-3">
                <MatchRing score={selectedJob.matchScore} size={40} />
                <div className="min-w-0 text-xs">
                  <p className="truncate font-medium">{selectedJob.title}</p>
                  <p className="truncate text-zinc-500">{selectedJob.company} · {selectedJob.location}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={!jobId || !!docLoading} onClick={() => handleGenerate("cover_letter")}
                className="gap-1.5 border border-violet-500/30 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25">
                {docLoading === "cover_letter" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Cover letter
              </Button>
              <Button size="sm" disabled={!jobId || !!docLoading} onClick={() => handleGenerate("resume_bullets")}
                className="gap-1.5 border border-violet-500/30 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25">
                {docLoading === "resume_bullets" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Resume highlights
              </Button>
              <Button size="sm" disabled={!jobId || !!docLoading} onClick={() => handleGenerate("outreach_message")}
                className="gap-1.5 border border-violet-500/30 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25">
                {docLoading === "outreach_message" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Recruiter outreach
              </Button>
            </div>

            {doc ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-violet-500/25 bg-violet-500/10 text-[10px] text-violet-300">
                    {doc.kind.replace("_", " ")} · {doc.model}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => { navigator.clipboard.writeText(doc.content); setCopied(true); }}>
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />} Copy
                  </Button>
                </div>
                <div className="whitespace-pre-wrap rounded-lg border border-violet-500/15 bg-violet-500/5 p-4 text-sm leading-relaxed text-zinc-200">
                  {doc.content}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-zinc-600">
                Pick a job and generate — the AI writes using your live profile data.
              </div>
            )}
          </CardContent>
        </Card>

        <DocHistory onSelect={(d) => { setDoc(d); setCopied(false); }} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">{label}</Label>
      {children}
    </div>
  );
}

function DocHistory({ onSelect }: { onSelect: (d: TailoredDocItem) => void }) {
  const [docs, setDocs] = useState<TailoredDocItem[] | null>(null);

  useMemo(() => {
    fetch("/api/ai")
      .then((r) => r.json())
      .then((d) => setDocs(d.docs ?? []))
      .catch(() => setDocs([]));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Generated Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {!docs ? (
          <p className="py-4 text-center text-xs text-zinc-600"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> loading…</p>
        ) : docs.length === 0 ? (
          <p className="py-4 text-center text-xs text-zinc-600">Nothing generated yet.</p>
        ) : (
          <ScrollArea className="max-h-56 firefox-scroll pr-2">
            <div className="space-y-2">
              {docs.map((d) => (
                <button key={d.id} className="w-full rounded-lg border border-white/5 bg-black/20 p-3 text-left transition-colors hover:border-violet-500/25"
                  onClick={() => onSelect(d)}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-[9px] uppercase text-zinc-400">{d.kind.replace("_", " ")}</Badge>
                    <span className="truncate text-xs font-medium">{d.jobTitle ?? "General"}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-zinc-600">{timeAgo(d.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">{d.content}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
