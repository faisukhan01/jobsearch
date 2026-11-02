import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { Server, type Socket } from 'socket.io'

// ---------------------------------------------------------------------------
// Event name constants — exported so the rest of the platform (automation
// engine, dashboard) imports the exact same names instead of hardcoding them.
// ---------------------------------------------------------------------------
export const ACTIVITY_EVENT = 'activity'
export const APPLICATION_EVENT = 'application'
export const AUTOPILOT_EVENT = 'autopilot'
export const SYNC_EVENT = 'sync'
export const AI_EVENT = 'ai'
export const CONNECTION_STATUS_EVENT = 'connection-status'

export const EVENTS = {
  activity: ACTIVITY_EVENT,
  application: APPLICATION_EVENT,
  autopilot: AUTOPILOT_EVENT,
  sync: SYNC_EVENT,
  ai: AI_EVENT,
  connectionStatus: CONNECTION_STATUS_EVENT,
} as const

export type PlatformEvent = (typeof EVENTS)[keyof typeof EVENTS]

// ---------------------------------------------------------------------------
// HTTP + Socket.IO server (config copied from examples/websocket/server.ts)
// ---------------------------------------------------------------------------
const PORT = 3003

const httpServer = createServer()

const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ---------------------------------------------------------------------------
// HTTP routing.
//
// IMPORTANT: with `path: '/'`, engine.io's internal check() treats EVERY
// http request as its own (any URL starts with '/'), so without the wrapper
// below a plain request like `POST /emit` is swallowed and answered with
// {"code":0,"message":"Transport unknown"}. We wrap the engine's request
// handler to serve the platform's HTTP emit API AND the realtime handshake
// (polling fallback carries an `EIO` query param) on the same port, while
// returning 404 JSON for anything else. WebSocket upgrades bypass this
// entirely (separate 'upgrade' listener inside engine.io).
// ---------------------------------------------------------------------------
const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const readJsonBody = (req: IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8')
      if (!raw.trim()) {
        reject(new Error('empty body'))
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('invalid JSON'))
      }
    })
    req.on('error', reject)
  })

interface EmitBody {
  event: string
  payload?: unknown
}

const isEmitBody = (body: unknown): body is EmitBody =>
  typeof body === 'object' &&
  body !== null &&
  typeof (body as EmitBody).event === 'string' &&
  (body as EmitBody).event.trim().length > 0

// POST /emit — the platform's automation engine pushes live events here.
const handleEmitRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  if (req.method !== 'POST') {
    sendJson(res, 404, { ok: false, error: `Not found: ${req.method} /emit (use POST /emit)` })
    return
  }

  try {
    const body = await readJsonBody(req)

    if (!isEmitBody(body)) {
      sendJson(res, 400, {
        ok: false,
        error: 'Invalid body. Expected JSON: {"event": "activity", "payload": {...}}',
      })
      return
    }

    const { event, payload = {} } = body
    io.emit(event, payload)

    console.log(`Emitted event "${event}" to ${io.engine.clientsCount} client(s)`)
    sendJson(res, 200, { ok: true, event, clients: io.engine.clientsCount })
  } catch {
    sendJson(res, 400, {
      ok: false,
      error: 'Invalid body. Expected JSON: {"event": "activity", "payload": {...}}',
    })
  }
}

const engineHandleRequest = io.engine.handleRequest.bind(io.engine)

io.engine.handleRequest = (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  // Platform HTTP API
  if (url.pathname === '/emit') {
    void handleEmitRequest(req, res)
    return
  }

  // Socket.IO polling handshake (e.g. GET /?EIO=4&transport=polling)
  if (url.searchParams.has('EIO')) {
    engineHandleRequest(req, res)
    return
  }

  // Everything else
  sendJson(res, 404, { ok: false, error: `Not found: ${req.method} ${url.pathname}` })
}

// ---------------------------------------------------------------------------
// Socket.IO realtime events (broadcast bus for the dashboard)
// ---------------------------------------------------------------------------
io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id} (clients: ${io.engine.clientsCount})`)

  socket.emit(CONNECTION_STATUS_EVENT, { connected: true, clients: io.engine.clientsCount })

  // Test event: reply with pong (supports both emit-style and ack-style clients)
  socket.on('ping-pong', (data?: unknown, callback?: (response: unknown) => void) => {
    console.log(`Received ping-pong from ${socket.id}:`, data)
    const response = {
      message: 'pong',
      data: data ?? null,
      timestamp: new Date().toISOString(),
    }
    socket.emit('pong', response)
    if (typeof callback === 'function') callback(response)
  })

  // Reserved for room-based subscriptions (e.g. per-job / per-run channels)
  socket.on('subscribe', (data?: unknown) => {
    console.log(`Client ${socket.id} subscribed (rooms reserved, no-op):`, data ?? {})
  })

  socket.on('disconnect', (reason: string) => {
    console.log(
      `Client disconnected: ${socket.id} (reason: ${reason}, clients: ${io.engine.clientsCount})`,
    )
  })

  socket.on('error', (error: Error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

// ---------------------------------------------------------------------------
// Engine watchdog — the realtime bus is supervised by the platform driver, so
// it is the perfect place to guarantee the FastAPI engine is always alive.
// Every 30s: probe /health on :8000; if down, spawn the engine detached
// (its dev script self-bootstraps the Python venv when missing).
// ---------------------------------------------------------------------------
const ENGINE_URL = 'http://localhost:8000/health'
const ENGINE_DIR = '/home/z/my-project/mini-services/engine'
let engineBootInProgress = false

const ensureEngineAlive = async (): Promise<void> => {
  if (engineBootInProgress) return
  try {
    const res = await fetch(ENGINE_URL, { signal: AbortSignal.timeout(4000) })
    if (res.ok) return
  } catch {
    // engine down — fall through to respawn
  }
  engineBootInProgress = true
  console.log('[watchdog] engine down — spawning detached engine process…')
  try {
    const proc = Bun.spawn(['bash', '-c', 'cd "$1" && bun run dev >> /tmp/engine.log 2>&1', 'watchdog', ENGINE_DIR], {
      cwd: ENGINE_DIR,
      stdin: 'ignore',
      stdout: 'ignore',
      stderr: 'ignore',
    })
    proc.unref()
  } catch (error) {
    console.error('[watchdog] failed to spawn engine:', error)
  } finally {
    setTimeout(() => { engineBootInProgress = false }, 20_000)
  }
}

ensureEngineAlive()
setInterval(() => { void ensureEngineAlive() }, 30_000)

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`Realtime event bus running on port 3003`)
})

// ---------------------------------------------------------------------------
// Graceful shutdown (pattern copied from examples/websocket/server.ts)
// ---------------------------------------------------------------------------
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...')
  io.close()
  httpServer.close(() => {
    console.log('Realtime event bus closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...')
  io.close()
  httpServer.close(() => {
    console.log('Realtime event bus closed')
    process.exit(0)
  })
})
