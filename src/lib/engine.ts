/**
 * Server-side bridge to the Python FastAPI automation engine (port 8000)
 * and the Socket.IO realtime event bus (port 3003).
 * These calls run inside Next.js API routes — never from the browser.
 */

export const ENGINE_URL = process.env.ENGINE_URL ?? "http://localhost:8000";
export const REALTIME_URL = process.env.REALTIME_URL ?? "http://localhost:3003";

export async function engineFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ENGINE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Engine ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/** Best-effort realtime emit — never throws, realtime is a nice-to-have. */
export async function emitRealtime(event: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${REALTIME_URL}/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, payload }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // realtime bus offline — ignore
  }
}

/** Broadcast an activity entry to the bus + persist to the log. */
export async function broadcastActivity(
  log: (data: { type: string; platform?: string | null; message: string }) => Promise<unknown>,
  type: string,
  message: string,
  platform?: string | null
) {
  await log({ type, platform: platform ?? null, message });
  await emitRealtime("activity", { type, platform, message, createdAt: new Date().toISOString() });
}
