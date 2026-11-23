// Compact, URL-safe encoding of the client's estimate choices, used for
// "share estimate" links (#estimate=CODE) and estimates saved in the cabinet.
import type { ApartmentParams, FinishChoices, MaterialTier } from '../types.ts';
import { clampParams } from './workCatalog.ts';
import { looseFinishes } from './finishCatalog.ts';

export interface EstimateState {
  params: ApartmentParams;
  enabled: Record<string, boolean>; // explicit on/off per job (overrides defaults)
  qty: Record<string, number>; // hand-edited quantities
  finishes: FinishChoices;
}

const TIERS: MaterialTier[] = ['standard', 'comfort', 'premium'];

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeEstimate(state: EstimateState): string {
  const p = state.params;
  const compact = {
    v: 1,
    p: [p.rooms, p.areaSqm, p.ceilingHeight, p.bathrooms, p.propertyType === 'secondary' ? 1 : 0, TIERS.indexOf(p.tier)],
    e: Object.fromEntries(Object.entries(state.enabled).map(([k, v]) => [k, v ? 1 : 0])),
    q: state.qty,
    f: state.finishes,
  };
  return toBase64Url(JSON.stringify(compact));
}

export function decodeEstimate(code: string): EstimateState | null {
  try {
    if (!/^[A-Za-z0-9_-]{4,6000}$/.test(code)) return null;
    const raw = JSON.parse(fromBase64Url(code)) as {
      p?: unknown[];
      e?: Record<string, unknown>;
      q?: Record<string, unknown>;
      f?: unknown;
    };
    const p = Array.isArray(raw.p) ? raw.p : [];
    const params = clampParams({
      rooms: Number(p[0]),
      areaSqm: Number(p[1]),
      ceilingHeight: Number(p[2]),
      bathrooms: Number(p[3]),
      propertyType: p[4] === 1 ? 'secondary' : 'newbuild',
      tier: TIERS[Number(p[5])] || 'comfort',
    });
    const idOk = (k: string) => /^[A-Za-z0-9_-]{1,40}$/.test(k);
    const enabled: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(raw.e || {})) if (idOk(k)) enabled[k] = v === 1 || v === true;
    const qty: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw.q || {})) {
      const n = Number(v);
      if (idOk(k) && Number.isFinite(n) && n >= 0 && n <= 5000) qty[k] = n;
    }
    return { params, enabled, qty, finishes: looseFinishes(raw.f) };
  } catch {
    return null;
  }
}

export function estimateShareUrl(code: string): string {
  return `${window.location.origin}/#estimate=${code}`;
}
