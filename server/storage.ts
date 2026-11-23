import fs from 'node:fs';
import path from 'node:path';
import type { BookingRecord, ClientProfile, ReviewItem, SiteContent } from '../src/types.ts';
import { DEFAULT_REVIEWS, DEFAULT_SITE_CONTENT } from '../src/data/defaultContent.ts';

export interface StoredClientAccount extends ClientProfile {
  passwordHash: string;
}

export interface DatabaseState {
  content: SiteContent;
  bookings: BookingRecord[];
  clients: Record<string, StoredClientAccount>; // keyed by normalized phone
  reviews: ReviewItem[];
  claimedAdminHash?: string;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'readyhome-db.json');
// Preview deployments share the Upstash database with production, so they use their own key
// and test bookings never reach the real CRM.
const REDIS_KEY = process.env.VERCEL_ENV === 'preview' ? 'readyhome:preview:state:v1' : 'readyhome:state:v1';

function getUpstashConfig(): { url: string; token: string } | null {
  const url = (process.env.KV_REST_API_URL || '').trim();
  const token = (process.env.KV_REST_API_TOKEN || '').trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}

function createInitialState(): DatabaseState {
  return {
    content: structuredClone(DEFAULT_SITE_CONTENT),
    bookings: [],
    clients: {},
    reviews: structuredClone(DEFAULT_REVIEWS),
  };
}

let memoryCache: DatabaseState | null = null;

async function readUpstash(): Promise<DatabaseState | null> {
  const cfg = getUpstashConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/get/${encodeURIComponent(REDIS_KEY)}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string | null };
    if (!data?.result) return null;
    return JSON.parse(data.result) as DatabaseState;
  } catch {
    return null;
  }
}

async function writeUpstash(state: DatabaseState): Promise<boolean> {
  const cfg = getUpstashConfig();
  if (!cfg) return false;
  try {
    const res = await fetch(`${cfg.url}/set/${encodeURIComponent(REDIS_KEY)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function readLocalFile(): DatabaseState | null {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw) as DatabaseState;
  } catch {
    return null;
  }
}

function writeLocalFile(state: DatabaseState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, DATA_FILE);
  } catch {
    // Best effort in read-only serverless environments
  }
}

export async function getDb(): Promise<DatabaseState> {
  const upstash = await readUpstash();
  if (upstash) {
    memoryCache = normalizeState(upstash);
    return memoryCache;
  }
  if (memoryCache) return memoryCache;
  const local = readLocalFile();
  if (local) {
    memoryCache = normalizeState(local);
    return memoryCache;
  }
  memoryCache = createInitialState();
  writeLocalFile(memoryCache);
  return memoryCache;
}

export async function saveDb(state: DatabaseState): Promise<void> {
  memoryCache = state;
  const wroteRemote = await writeUpstash(state);
  if (!wroteRemote) {
    writeLocalFile(state);
  }
}

function normalizeState(raw: Partial<DatabaseState>): DatabaseState {
  const init = createInitialState();
  return {
    content: raw.content ? { ...init.content, ...raw.content } : init.content,
    bookings: Array.isArray(raw.bookings) ? raw.bookings : [],
    clients: raw.clients && typeof raw.clients === 'object' ? raw.clients : {},
    reviews: Array.isArray(raw.reviews) ? raw.reviews : init.reviews,
    claimedAdminHash: typeof raw.claimedAdminHash === 'string' ? raw.claimedAdminHash : undefined,
  };
}

// ------------------------------------------------------------------
// Anonymous funnel counters (no personal data): one Redis hash per day,
// incremented atomically so they never race with the main state blob.
// ------------------------------------------------------------------
export const STAT_EVENTS = [
  'visit',
  'estimate_view',
  'estimate_edit',
  'layout_pick',
  'finish_pick',
  'pdf',
  'share',
  'save',
  'book_click',
  'booking_created',
  'review_sent',
] as const;
export type StatEvent = (typeof STAT_EVENTS)[number];

const STATS_PREFIX = process.env.VERCEL_ENV === 'preview' ? 'readyhome:preview:stats:' : 'readyhome:stats:';
const memStats: Record<string, Record<string, number>> = {};

function dayKey(offsetDays = 0): string {
  return new Date(Date.now() - offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export async function incrStat(event: StatEvent): Promise<void> {
  const day = dayKey();
  const cfg = getUpstashConfig();
  if (!cfg) {
    memStats[day] = memStats[day] || {};
    memStats[day][event] = (memStats[day][event] || 0) + 1;
    return;
  }
  try {
    await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['HINCRBY', STATS_PREFIX + day, event, '1'],
        ['EXPIRE', STATS_PREFIX + day, String(400 * 86_400)],
      ]),
    });
  } catch {
    // counters are best effort
  }
}

export async function getStats(days: number): Promise<Array<{ day: string; counts: Record<string, number> }>> {
  const list = Array.from({ length: days }, (_, i) => dayKey(i));
  const cfg = getUpstashConfig();
  if (!cfg) return list.map((day) => ({ day, counts: { ...(memStats[day] || {}) } }));
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(list.map((day) => ['HGETALL', STATS_PREFIX + day])),
    });
    const data = (await res.json()) as Array<{ result?: unknown }>;
    return list.map((day, i) => {
      const flat = Array.isArray(data[i]?.result) ? (data[i].result as string[]) : [];
      const counts: Record<string, number> = {};
      for (let k = 0; k + 1 < flat.length; k += 2) counts[flat[k]] = Number(flat[k + 1]) || 0;
      return { day, counts };
    });
  } catch {
    return list.map((day) => ({ day, counts: {} }));
  }
}
