import crypto from 'node:crypto';
import type { Request, Response } from 'express';

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export interface SessionPayload {
  role: 'client' | 'admin';
  phone?: string;
  name?: string;
  exp: number;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function timingSafeStringCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function signSessionToken(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed || typeof parsed.exp !== 'number' || Date.now() > parsed.exp) {
      return null;
    }
    if (parsed.role !== 'client' && parsed.role !== 'admin') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}

export function extractSession(req: Request, cookieName: string, expectedRole: 'client' | 'admin'): SessionPayload | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const payload = verifySessionToken(token);
    if (payload && payload.role === expectedRole) return payload;
  }
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[cookieName];
  if (cookieToken) {
    // Require custom header on cookie-authenticated mutations to mitigate CSRF
    const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
    if (isMutation && req.headers['x-requested-with'] !== 'ReadyHome') {
      return null;
    }
    const payload = verifySessionToken(cookieToken);
    if (payload && payload.role === expectedRole) return payload;
  }
  return null;
}

export function setAuthCookie(res: Response, name: string, token: string, maxAgeSeconds: number): void {
  const attrs = [
    `${name}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
    `Max-Age=${maxAgeSeconds}`,
  ];
  res.append('Set-Cookie', attrs.join('; '));
}

export function clearAuthCookie(res: Response, name: string): void {
  const attrs = [
    `${name}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
    'Max-Age=0',
  ];
  res.append('Set-Cookie', attrs.join('; '));
}

export async function authDelay(ms = 650): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizePhone(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return '';
  if (digits.startsWith('0') && digits.length === 10) {
    return `+996${digits.slice(1)}`;
  }
  if (digits.startsWith('996') && digits.length === 12) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export function clampStr(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

export function isSafeUrl(url: string): boolean {
  if (!url) return true;
  if (url.startsWith('/')) return !url.startsWith('//');
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function sanitizeUrl(raw: unknown, fallback = ''): string {
  const s = clampStr(raw, 500);
  if (!s) return fallback;
  return isSafeUrl(s) ? s : fallback;
}
