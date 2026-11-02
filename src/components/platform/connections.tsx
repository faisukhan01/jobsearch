"use client";

import { useState } from "react";
import { usePlatform, label } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CompanyAvatar, timeAgo } from "./shared";
import { cn } from "@/lib/utils";
import { Bot, Info, Loader2, Mail, RefreshCw } from "lucide-react";

const PLATFORM_META: Record<string, { desc: string; caps: string[] }> = {
  indeed: { desc: "World's largest job site — highest Easy Apply coverage", caps: ["Easy Apply", "Search", "Autopilot"] },
  linkedin: { desc: "Professional network — best for tech & product roles", caps: ["Search", "Profile apply"] },
  glassdoor: { desc: "Salary intel + listings — great for comp benchmarks", caps: ["Search", "Salary data"] },
  ziprecruiter: { desc: "Fast-growing board with 1-tap apply", caps: ["Easy Apply", "Search", "Autopilot"] },
  greenhouse: { desc: "ATS used by top startups — direct pipeline jobs", caps: ["ATS apply", "Search"] },
  lever: { desc: "ATS favored by scale-ups — fresh postings daily", caps: ["ATS apply", "Search"] },
};

export function Connections() {
  const { connectors, syncPlatform, connectPlatform, disconnectPlatform, toggleConnectorAutoApply } = usePlatform();
  const [connectTarget, setConnectTarget] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!connectTarget) return;
    setConnecting(true);
    const ok = await connectPlatform(connectTarget, email.trim());
    setConnecting(false);
    if (ok) {
      const platform = connectTarget;
      setConnectTarget(null);
      setEmail("");
      setTimeout(() => syncPlatform(platform), 600);
    }
  };

  const handleDisconnect = async (platform: string) => {
    setBusy(platform);
    await disconnectPlatform(platform);
    setBusy(null);
  };

  const handleSync = async (platform: string) => {
    setBusy(platform);
    await syncPlatform(platform);
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <Card className="border-violet-500/15 bg-violet-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
          <div className="text-xs leading-relaxed text-violet-200/80">
            <p className="font-semibold text-violet-200">How connections work</p>
            <p className="mt-1">
              Each connector is an adapter in the <span className="font-mono text-[11px] text-violet-300">FastAPI engine</span>.
              In this deployment they run in <span className="font-semibold">simulation mode</span> — the full pipeline (sync → match → tailor → apply → confirm)
              executes end-to-end with realistic listings. In production, adapters delegate to a Playwright browser-automation worker that
              applies through your real sessions. Portal ToS govern what&apos;s permitted — always review before going live.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {connectors.map((c) => {
          const meta = PLATFORM_META[c.platform];
          const isOn = c.status === "connected";
          return (
            <Card key={c.platform} className={cn("transition-all", isOn ? "border-emerald-500/20 bg-black/20" : "border-white/5 bg-black/10")}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-sm">
                  <CompanyAvatar name={label(c.platform)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{label(c.platform)}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full", isOn ? "pulse-dot bg-emerald-400 text-emerald-400" : "bg-zinc-600")} />
                      <span className={cn("text-[10px] font-medium uppercase tracking-wider", isOn ? "text-emerald-400" : "text-zinc-500")}>
                        {isOn ? "Connected" : "Not connected"}
                      </span>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs leading-relaxed text-zinc-500">{meta.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {meta.caps.map((cap) => (
                    <Badge key={cap} variant="outline" className="border-white/10 bg-white/5 text-[9px] text-zinc-400">{cap}</Badge>
                  ))}
                </div>

                {isOn ? (
                  <>
                    <div className="space-y-1.5 rounded-lg border border-white/5 bg-black/30 p-2.5 text-[11px]">
                      <p className="flex items-center gap-1.5 text-zinc-300"><Mail className="h-3 w-3 text-zinc-500" /> {c.accountEmail}</p>
                      <div className="flex justify-between text-zinc-500">
                        <span>Synced</span><span className="text-zinc-300">{c.syncedJobs} jobs</span>
                      </div>
                      <div className="flex justify-between text-zinc-500">
                        <span>Last sync</span><span className="text-zinc-300">{timeAgo(c.lastSyncAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 px-2.5 py-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300">
                        <Bot className="h-3.5 w-3.5 text-emerald-400" /> Auto-apply from this portal
                      </span>
                      <Switch checked={c.autoApply} onCheckedChange={(v) => toggleConnectorAutoApply(c.platform, v)} aria-label={`Auto apply ${label(c.platform)}`} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 flex-1 gap-1.5 bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                        disabled={busy === c.platform} onClick={() => handleSync(c.platform)}>
                        <RefreshCw className={cn("h-3.5 w-3.5", busy === c.platform && "animate-spin")} /> Sync now
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 border-rose-500/25 text-rose-300 hover:bg-rose-500/10"
                        disabled={busy === c.platform} onClick={() => handleDisconnect(c.platform)}>
                        Disconnect
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button size="sm" className="h-8 w-full gap-1.5 bg-white/10 text-zinc-200 hover:bg-white/15"
                    onClick={() => { setConnectTarget(c.platform); setEmail(""); }}>
                    Connect {label(c.platform)} account
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connect dialog */}
      <Dialog open={!!connectTarget} onOpenChange={(o) => !o && setConnectTarget(null)}>
        <DialogContent className="max-w-sm border-white/10 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Connect {connectTarget ? label(connectTarget) : ""}</DialogTitle>
            <DialogDescription>
              Link the account the autopilot should apply through. Credentials stay on your machine.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              autoFocus
            />
            <p className="text-[11px] text-zinc-500">A sync will run automatically after connecting.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setConnectTarget(null)}>Cancel</Button>
            <Button size="sm" className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400" disabled={connecting || !email.includes("@")} onClick={handleConnect}>
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Connect & sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
