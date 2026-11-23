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
  adminNotes?: Record<string, string>; // booking id → internal note (admin only)
}

// ------------------------------------------------------------------
// Upstash layout: every booking, client, review and note is its own field in a
// Redis hash, so two visitors writing at the same moment never overwrite each
// other (the old single-blob layout could lose a booking under load).
// saveDb() writes only the records that changed since getDb().
// ------------------------------------------------------------------

// Preview deployments share the Upstash database with production, so they use their own keys
// and test bookings never reach the real CRM.
const P = process.env.VERCEL_ENV === 'preview' ? 'readyhome:preview:' : 'readyhome:';
const K = {
  marker: `${P}layout`,
  content: `${P}content`,
  bookings: `${P}bookings`,
  clients: `${P}clients`,
  reviews: `${P}reviews`,
  notes: `${P}notes`,
  admin: `${P}admin`,
  legacy: `${P}state:v1`,
  backup: (day: string) => `${P}backup:${day}`,
};
const LAYOUT_VERSION = 'v2';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'readyhome-db.json');

export function getUpstashConfig(): { url: string; token: string } | null {
  const url = (process.env.KV_REST_API_URL || '').trim();
  const token = (process.env.KV_REST_API_TOKEN || '').trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}

async function redis(cmds: Array<Array<string>>): Promise<unknown[]> {
  const cfg = getUpstashConfig();
  if (!cfg) throw new Error('upstash not configured');
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const data = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  const failed = data.find((d) => d.error);
  if (failed) throw new Error(`upstash: ${failed.error}`);
  return data.map((d) => d.result);
}

function createInitialState(): DatabaseState {
  return {
    content: structuredClone(DEFAULT_SITE_CONTENT),
    bookings: [],
    clients: {},
    reviews: structuredClone(DEFAULT_REVIEWS),
    adminNotes: {},
  };
}

function normalizeState(raw: Partial<DatabaseState>): DatabaseState {
  const init = createInitialState();
  return {
    content: raw.content ? { ...init.content, ...raw.content } : init.content,
    bookings: Array.isArray(raw.bookings) ? raw.bookings : [],
    clients: raw.clients && typeof raw.clients === 'object' ? raw.clients : {},
    reviews: Array.isArray(raw.reviews) ? raw.reviews : init.reviews,
    claimedAdminHash: typeof raw.claimedAdminHash === 'string' ? raw.claimedAdminHash : undefined,
    adminNotes: raw.adminNotes && typeof raw.adminNotes === 'object' ? raw.adminNotes : {},
  };
}

// What was read, per record, so saveDb can write only the differences.
interface Snapshot {
  content: string;
  bookings: Map<string, string>;
  clients: Map<string, string>;
  reviews: Map<string, string>;
  notes: Map<string, string>;
  admin: string;
}
const snapshots = new WeakMap<DatabaseState, Snapshot>();

function takeSnapshot(state: DatabaseState): Snapshot {
  return {
    content: JSON.stringify(state.content),
    bookings: new Map(state.bookings.map((b) => [b.id, JSON.stringify(b)])),
    clients: new Map(Object.entries(state.clients).map(([k, v]) => [k, JSON.stringify(v)])),
    reviews: new Map(state.reviews.map((r) => [r.id, JSON.stringify(r)])),
    notes: new Map(Object.entries(state.adminNotes || {})),
    admin: state.claimedAdminHash || '',
  };
}

function hashToMap(result: unknown): Map<string, string> {
  const flat = Array.isArray(result) ? (result as string[]) : [];
  const m = new Map<string, string>();
  for (let i = 0; i + 1 < flat.length; i += 2) m.set(flat[i], flat[i + 1]);
  return m;
}

function parseAll<T>(m: Map<string, string>): T[] {
  const out: T[] = [];
  for (const v of m.values()) {
    try {
      out.push(JSON.parse(v) as T);
    } catch {
      // skip a corrupt record instead of failing the whole site
    }
  }
  return out;
}

function fullWriteCommands(state: DatabaseState): string[][] {
  const cmds: string[][] = [['SET', K.content, JSON.stringify(state.content)]];
  for (const b of state.bookings) cmds.push(['HSET', K.bookings, b.id, JSON.stringify(b)]);
  for (const [phone, c] of Object.entries(state.clients)) cmds.push(['HSET', K.clients, phone, JSON.stringify(c)]);
  for (const r of state.reviews) cmds.push(['HSET', K.reviews, r.id, JSON.stringify(r)]);
  for (const [id, note] of Object.entries(state.adminNotes || {})) cmds.push(['HSET', K.notes, id, note]);
  if (state.claimedAdminHash) cmds.push(['SET', K.admin, state.claimedAdminHash]);
  cmds.push(['SET', K.marker, LAYOUT_VERSION]);
  return cmds;
}

async function readUpstash(): Promise<DatabaseState | null> {
  if (!getUpstashConfig()) return null;
  const [marker, content, bookings, clients, reviews, notes, admin] = await redis([
    ['GET', K.marker],
    ['GET', K.content],
    ['HGETALL', K.bookings],
    ['HGETALL', K.clients],
    ['HGETALL', K.reviews],
    ['HGETALL', K.notes],
    ['GET', K.admin],
  ]);

  if (marker !== LAYOUT_VERSION) {
    // First run on the new layout: migrate the old single blob (kept untouched as a backup), or start fresh.
    const [legacy] = await redis([['GET', K.legacy]]);
    const state = normalizeState(typeof legacy === 'string' ? (JSON.parse(legacy) as DatabaseState) : {});
    await redis(fullWriteCommands(state));
    snapshots.set(state, takeSnapshot(state));
    return state;
  }

  const bookingList = parseAll<BookingRecord>(hashToMap(bookings)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const reviewList = parseAll<ReviewItem>(hashToMap(reviews)).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
  const clientMap = Object.fromEntries(
    [...hashToMap(clients).entries()].flatMap(([k, v]) => {
      try {
        return [[k, JSON.parse(v) as StoredClientAccount]];
      } catch {
        return [];
      }
    }),
  );
  const state = normalizeState({
    content: typeof content === 'string' ? (JSON.parse(content) as SiteContent) : undefined,
    bookings: bookingList,
    clients: clientMap,
    reviews: reviewList,
    claimedAdminHash: typeof admin === 'string' ? admin : undefined,
    adminNotes: Object.fromEntries(hashToMap(notes)),
  });
  snapshots.set(state, takeSnapshot(state));
  return state;
}

function diffCommands(key: string, before: Map<string, string>, after: Map<string, string>): string[][] {
  const cmds: string[][] = [];
  for (const [id, json] of after) if (before.get(id) !== json) cmds.push(['HSET', key, id, json]);
  for (const id of before.keys()) if (!after.has(id)) cmds.push(['HDEL', key, id]);
  return cmds;
}

async function writeUpstash(state: DatabaseState): Promise<boolean> {
  if (!getUpstashConfig()) return false;
  const before = snapshots.get(state);
  const after = takeSnapshot(state);
  const cmds = before
    ? [
        ...(before.content !== after.content ? [['SET', K.content, after.content]] : []),
        ...diffCommands(K.bookings, before.bookings, after.bookings),
        ...diffCommands(K.clients, before.clients, after.clients),
        ...diffCommands(K.reviews, before.reviews, after.reviews),
        ...diffCommands(K.notes, before.notes, after.notes),
        ...(before.admin !== after.admin ? [after.admin ? ['SET', K.admin, after.admin] : ['DEL', K.admin]] : []),
      ]
    : fullWriteCommands(state);
  if (cmds.length) await redis(cmds);
  snapshots.set(state, after);
  return true;
}

// ---------------- local development fallback (single process, JSON file) ----------------

let memoryCache: DatabaseState | null = null;

function readLocalFile(): DatabaseState | null {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as DatabaseState;
  } catch {
    return null;
  }
}

function writeLocalFile(state: DatabaseState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, DATA_FILE);
  } catch {
    // Best effort in read-only environments
  }
}

export async function getDb(): Promise<DatabaseState> {
  if (getUpstashConfig()) {
    const state = await readUpstash();
    if (state) return state;
  }
  if (memoryCache) return memoryCache;
  const local = readLocalFile();
  memoryCache = local ? normalizeState(local) : createInitialState();
  if (!local) writeLocalFile(memoryCache);
  return memoryCache;
}

export async function saveDb(state: DatabaseState): Promise<void> {
  if (getUpstashConfig()) {
    await writeUpstash(state);
    return;
  }
  memoryCache = state;
  writeLocalFile(state);
}

// ---------------- backups ----------------

export async function exportBackup(): Promise<DatabaseState> {
  return getDb();
}

// Daily copy kept for 30 days; returns the key it wrote.
export async function storeDailyBackup(): Promise<string> {
  const state = await getDb();
  const day = new Date().toISOString().slice(0, 10);
  if (!getUpstashConfig()) return 'local (no Upstash)';
  await redis([['SET', K.backup(day), JSON.stringify(state), 'EX', String(30 * 86_400)]]);
  return K.backup(day);
}

export async function listBackups(): Promise<string[]> {
  if (!getUpstashConfig()) return [];
  const [keys] = await redis([['KEYS', `${P}backup:*`]]);
  return (Array.isArray(keys) ? (keys as string[]) : []).map((k) => k.slice(`${P}backup:`.length)).sort().reverse();
}

export async function readBackup(day: string): Promise<string | null> {
  if (!getUpstashConfig() || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [v] = await redis([['GET', K.backup(day)]]);
  return typeof v === 'string' ? v : null;
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

// ------------------------------------------------------------------
// Photo reports: compressed JPEG/PNG/WebP stored as base64 under an
// unguessable id (served by /api/photo/<id>).
// ------------------------------------------------------------------
const PHOTO_PREFIX = `${P}photo:`;
const memPhotos = new Map<string, string>();

export async function putPhoto(id: string, dataUrl: string): Promise<void> {
  if (!getUpstashConfig()) {
    memPhotos.set(id, dataUrl);
    return;
  }
  await redis([['SET', PHOTO_PREFIX + id, dataUrl]]);
}

export async function getPhoto(id: string): Promise<string | null> {
  if (!getUpstashConfig()) return memPhotos.get(id) || null;
  const [v] = await redis([['GET', PHOTO_PREFIX + id]]);
  return typeof v === 'string' ? v : null;
}

export async function deletePhoto(id: string): Promise<void> {
  if (!getUpstashConfig()) {
    memPhotos.delete(id);
    return;
  }
  await redis([['DEL', PHOTO_PREFIX + id]]);
}

// ------------------------------------------------------------------
// Simple fixed-window rate limits (AI endpoints), keyed by a hashed client id.
// ------------------------------------------------------------------
const memHits = new Map<string, { n: number; until: number }>();

export async function hitLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const k = `${P}rl:${key}`;
  if (!getUpstashConfig()) {
    const now = Date.now();
    const cur = memHits.get(k);
    const entry = cur && cur.until > now ? cur : { n: 0, until: now + windowSec * 1000 };
    entry.n += 1;
    memHits.set(k, entry);
    return entry.n > limit;
  }
  try {
    const [n] = await redis([
      ['INCR', k],
      ['EXPIRE', k, String(windowSec), 'NX'],
    ]);
    return Number(n) > limit;
  } catch {
    return false; // never block visitors because the limiter is down
  }
}

// ------------------------------------------------------------------
// Server-only secrets entered in the admin (e.g. the Gemini API key).
// Never included in /api/content or backups' public parts.
// ------------------------------------------------------------------
const memSecrets = new Map<string, string>();

export async function getSecret(name: string): Promise<string> {
  if (!getUpstashConfig()) return memSecrets.get(name) || '';
  try {
    const [v] = await redis([['GET', `${P}secret:${name}`]]);
    return typeof v === 'string' ? v : '';
  } catch {
    return '';
  }
}

export async function setSecret(name: string, value: string): Promise<void> {
  if (!getUpstashConfig()) {
    if (value) memSecrets.set(name, value);
    else memSecrets.delete(name);
    return;
  }
  await redis([value ? ['SET', `${P}secret:${name}`, value] : ['DEL', `${P}secret:${name}`]]);
}
