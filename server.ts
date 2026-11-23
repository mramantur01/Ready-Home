import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import {
  authDelay,
  clampStr,
  clearAuthCookie,
  extractSession,
  hashPassword,
  normalizePhone,
  sanitizeUrl,
  setAuthCookie,
  signSessionToken,
  timingSafeStringCompare,
  verifyPassword,
} from './server/auth.ts';
import { getDb, saveDb } from './server/storage.ts';
import type {
  BookingRecord,
  BookingStatus,
  LocalizedText,
  MaterialTier,
  PropertyType,
  SiteContent,
  Visual3DConfig,
} from './src/types.ts';
import type { ReviewItem, WorkBasis, WorkEstimate, WorkItem, WorkSelection, WorkStageId, WorkUnit } from './src/types.ts';
import { calculateRenovationEstimate } from './src/data/defaultContent.ts';
import {
  clampParams,
  computeWorkEstimate,
  formatWorkEstimateText,
  WORK_BASIS_LABELS,
  WORK_STAGES,
} from './src/data/workCatalog.ts';
import { FINISH_GROUPS, sanitizeFinishes } from './src/data/finishCatalog.ts';

const CLIENT_COOKIE = 'rh_client_session';
const ADMIN_COOKIE = 'rh_admin_session';
const CLIENT_TTL_SEC = 30 * 24 * 60 * 60; // 30 days
const ADMIN_TTL_SEC = 12 * 60 * 60; // 12 hours

const VALID_STATUSES: BookingStatus[] = ['pending', 'in_progress', 'handover', 'completed', 'cancelled'];
const VALID_PROPERTIES: PropertyType[] = ['newbuild', 'secondary', 'house', 'commercial'];
const VALID_TIERS: MaterialTier[] = ['standard', 'comfort', 'premium'];

function sanitizeLoc(input: unknown, fallback: LocalizedText, maxLen = 400): LocalizedText {
  if (!input || typeof input !== 'object') return fallback;
  const obj = input as Record<string, unknown>;
  return {
    ru: clampStr(obj.ru, maxLen) || fallback.ru,
    ky: clampStr(obj.ky, maxLen) || fallback.ky,
    en: clampStr(obj.en, maxLen) || fallback.en,
  };
}

async function sendTelegramNotification(text: string): Promise<{ sent: boolean; reason?: string }> {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!token || !chatId) {
    return { sent: false, reason: 'not_configured' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return { sent: res.ok, reason: res.ok ? undefined : `http_${res.status}` };
  } catch {
    return { sent: false, reason: 'network_error' };
  }
}

const STAGE_IDS = new Set<WorkStageId>(WORK_STAGES.map((s) => s.id));
const BASIS_IDS = new Set<WorkBasis>(Object.keys(WORK_BASIS_LABELS) as WorkBasis[]);
const UNIT_IDS = new Set<WorkUnit>(['m2', 'm', 'pcs']);

function sanitizePrice(v: unknown): number {
  return Math.max(0, Math.min(1_000_000, Math.round(Number(v) || 0)));
}

function sanitizePriceList(input: unknown[]): WorkItem[] {
  const seen = new Set<string>();
  const out: WorkItem[] = [];
  for (const [idx, raw] of input.slice(0, 120).entries()) {
    if (!raw || typeof raw !== 'object') continue;
    const it = raw as Partial<WorkItem>;
    const id = clampStr(it.id, 40) || `w-${Date.now()}-${idx}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const mat = (it.materialPrice || {}) as Partial<Record<MaterialTier, unknown>>;
    out.push({
      id,
      stage: STAGE_IDS.has(it.stage as WorkStageId) ? (it.stage as WorkStageId) : 'walls_finish',
      name: sanitizeLoc(it.name, { ru: 'Работа', ky: 'Иш', en: 'Work item' }, 160),
      unit: UNIT_IDS.has(it.unit as WorkUnit) ? (it.unit as WorkUnit) : 'm2',
      basis: BASIS_IDS.has(it.basis as WorkBasis) ? (it.basis as WorkBasis) : 'floor',
      workPrice: sanitizePrice(it.workPrice),
      materialPrice: {
        standard: sanitizePrice(mat.standard),
        comfort: sanitizePrice(mat.comfort),
        premium: sanitizePrice(mat.premium),
      },
      enabledByDefault: Boolean(it.enabledByDefault),
      secondaryOnly: Boolean(it.secondaryOnly) || undefined,
    });
  }
  return out;
}

function generateBookingCode(existingIds: Set<string>): string {
  for (let i = 0; i < 20; i++) {
    const num = crypto.randomInt(100000, 999999);
    const code = `RH-${num}`;
    if (!existingIds.has(code)) return code;
  }
  return `RH-${Date.now().toString().slice(-6)}`;
}

// Builds the Express app with all /api routes. Used by the local/AI Studio
// server below and by the Vercel serverless function in api/index.ts.
export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // ------------------------------------------------------------------
  // ADMIN STATUS, FIRST-RUN CLAIM & LOGIN (/api/login)
  // ------------------------------------------------------------------
  app.get('/api/admin-status', async (req, res) => {
    const db = await getDb();
    const envConfigured = Boolean((process.env.ADMIN_PASSWORD || '').trim());
    const needsSetup = !envConfigured && !db.claimedAdminHash;
    const session = extractSession(req, ADMIN_COOKIE, 'admin');
    const telegramConfigured = Boolean(
      (process.env.TELEGRAM_BOT_TOKEN || '').trim() && (process.env.TELEGRAM_CHAT_ID || '').trim(),
    );
    const upstashConfigured = Boolean(
      (process.env.KV_REST_API_URL || '').trim() && (process.env.KV_REST_API_TOKEN || '').trim(),
    );
    res.json({
      authenticated: Boolean(session),
      needsSetup,
      envConfigured,
      telegramConfigured,
      upstashConfigured,
    });
  });

  app.post('/api/admin-setup', async (req, res) => {
    const db = await getDb();
    const envPass = (process.env.ADMIN_PASSWORD || '').trim();
    if (envPass || db.claimedAdminHash) {
      res.status(409).json({ error: 'Пароль администратора уже настроен.' });
      return;
    }
    const password = clampStr(req.body?.password, 128);
    if (password.length < 6) {
      res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов.' });
      return;
    }
    db.claimedAdminHash = hashPassword(password);
    await saveDb(db);
    const token = signSessionToken({
      role: 'admin',
      exp: Date.now() + ADMIN_TTL_SEC * 1000,
    });
    setAuthCookie(res, ADMIN_COOKIE, token, ADMIN_TTL_SEC);
    res.json({ ok: true, token });
  });

  app.post('/api/login', async (req, res) => {
    if (req.body?.action === 'logout') {
      clearAuthCookie(res, ADMIN_COOKIE);
      res.json({ ok: true });
      return;
    }
    const password = clampStr(req.body?.password, 128);
    if (!password) {
      await authDelay();
      res.status(401).json({ error: 'Введите пароль администратора.' });
      return;
    }
    const db = await getDb();
    const envPass = (process.env.ADMIN_PASSWORD || '').trim();
    let valid = false;
    if (envPass) {
      valid = timingSafeStringCompare(password, envPass);
    } else if (db.claimedAdminHash) {
      valid = verifyPassword(password, db.claimedAdminHash);
    }
    if (!valid) {
      await authDelay();
      res.status(401).json({ error: 'Неверный пароль администратора.' });
      return;
    }
    const token = signSessionToken({
      role: 'admin',
      exp: Date.now() + ADMIN_TTL_SEC * 1000,
    });
    setAuthCookie(res, ADMIN_COOKIE, token, ADMIN_TTL_SEC);
    res.json({ ok: true, token });
  });

  // ------------------------------------------------------------------
  // SITE CONTENT (/api/content)
  // ------------------------------------------------------------------
  app.get('/api/content', async (_req, res) => {
    const db = await getDb();
    res.json(db.content);
  });

  app.put('/api/content', async (req, res) => {
    const admin = extractSession(req, ADMIN_COOKIE, 'admin');
    if (!admin) {
      res.status(401).json({ error: 'Требуется авторизация администратора.' });
      return;
    }
    const body = req.body as Partial<SiteContent> | undefined;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Некорректные данные контента.' });
      return;
    }
    const db = await getDb();
    const cur = db.content;

    const next: SiteContent = {
      tickerText: sanitizeLoc(body.tickerText, cur.tickerText, 240),
      heroSpeedMs:
        typeof body.heroSpeedMs === 'number' && Number.isFinite(body.heroSpeedMs)
          ? Math.max(2500, Math.min(20000, Math.round(body.heroSpeedMs)))
          : cur.heroSpeedMs,
      heroSlides: Array.isArray(body.heroSlides) && body.heroSlides.length > 0
        ? body.heroSlides.slice(0, 8).map((s, idx) => ({
            id: clampStr(s.id, 40) || `slide-${idx + 1}`,
            title: sanitizeLoc(s.title, cur.heroSlides[0].title, 180),
            subtitle: sanitizeLoc(s.subtitle, cur.heroSlides[0].subtitle, 320),
            image: sanitizeUrl(s.image, cur.heroSlides[0].image),
            textAlign: s.textAlign === 'right' ? 'right' : 'left',
          }))
        : cur.heroSlides,
      services: Array.isArray(body.services) && body.services.length > 0
        ? body.services.slice(0, 24).map((srv, idx) => ({
            id: clampStr(srv.id, 40) || `srv-${idx + 1}`,
            category: ['turnkey', 'rough', 'design3d', 'wetrooms', 'engineering'].includes(srv.category)
              ? srv.category
              : 'turnkey',
            name: sanitizeLoc(srv.name, cur.services[0].name, 140),
            description: sanitizeLoc(srv.description, cur.services[0].description, 360),
            pricePerSqm: Math.max(500, Math.min(500000, Math.round(Number(srv.pricePerSqm) || 10000))),
            warrantyYears: Math.max(1, Math.min(15, Math.round(Number(srv.warrantyYears) || 3))),
            durationDays: clampStr(srv.durationDays, 40) || '30–60 дней',
            materials: clampStr(srv.materials, 180) || 'Knauf, Ceresit',
            image: sanitizeUrl(srv.image, cur.services[0].image),
          }))
        : cur.services,
      promos: Array.isArray(body.promos)
        ? body.promos.slice(0, 12).map((p, idx) => ({
            id: clampStr(p.id, 40) || `promo-${idx + 1}`,
            badge: sanitizeLoc(p.badge, { ru: 'Акция', ky: 'Акция', en: 'Offer' }, 50),
            title: sanitizeLoc(p.title, { ru: 'Спецпредложение', ky: 'Сунуш', en: 'Special Offer' }, 140),
            description: sanitizeLoc(p.description, { ru: '', ky: '', en: '' }, 280),
            code: clampStr(p.code, 24).toUpperCase() || 'READY10',
            discountPercent: Math.max(0, Math.min(40, Math.round(Number(p.discountPercent) || 10))),
            expiresAt: clampStr(p.expiresAt, 30) || '31.12.2026',
          }))
        : cur.promos,
      masters: Array.isArray(body.masters)
        ? body.masters.slice(0, 16).map((m, idx) => ({
            id: clampStr(m.id, 40) || `m-${idx + 1}`,
            name: clampStr(m.name, 80) || 'Специалист READY HOME',
            role: sanitizeLoc(m.role, { ru: 'Прораб', ky: 'Прораб', en: 'Engineer' }, 100),
            experienceYears: Math.max(1, Math.min(45, Math.round(Number(m.experienceYears) || 5))),
            specialization: sanitizeLoc(m.specialization, { ru: 'Ремонт под ключ', ky: 'Оңдоо', en: 'Renovation' }, 200),
            projectsCount: Math.max(1, Math.min(2000, Math.round(Number(m.projectsCount) || 50))),
            photo: sanitizeUrl(m.photo, cur.masters[0]?.photo || ''),
          }))
        : cur.masters,
      beforeAfter: Array.isArray(body.beforeAfter)
        ? body.beforeAfter.slice(0, 16).map((b, idx) => ({
            id: clampStr(b.id, 40) || `ba-${idx + 1}`,
            title: sanitizeLoc(b.title, { ru: 'Объект в Бишкеке', ky: 'Бишкек объекти', en: 'Bishkek Project' }, 140),
            location: clampStr(b.location, 100) || 'Бишкек',
            areaSqm: Math.max(15, Math.min(2000, Math.round(Number(b.areaSqm) || 80))),
            durationDays: Math.max(7, Math.min(500, Math.round(Number(b.durationDays) || 60))),
            budgetKgs: Math.max(50000, Math.min(90000000, Math.round(Number(b.budgetKgs) || 1200000))),
            beforeImage: sanitizeUrl(b.beforeImage, cur.beforeAfter[0]?.beforeImage || ''),
            afterImage: sanitizeUrl(b.afterImage, cur.beforeAfter[0]?.afterImage || ''),
          }))
        : cur.beforeAfter,
      instagramPosts: Array.isArray(body.instagramPosts)
        ? body.instagramPosts.slice(0, 12).map((ig, idx) => ({
            id: clampStr(ig.id, 40) || `ig-${idx + 1}`,
            image: sanitizeUrl(ig.image, cur.instagramPosts[0]?.image || ''),
            caption: sanitizeLoc(ig.caption, { ru: '', ky: '', en: '' }, 260),
            date: clampStr(ig.date, 24) || '2026',
            likes: Math.max(0, Math.min(99999, Math.round(Number(ig.likes) || 100))),
            url: sanitizeUrl(ig.url, 'https://instagram.com/readyhome.kg'),
          }))
        : cur.instagramPosts,
      faqs: Array.isArray(body.faqs)
        ? body.faqs.slice(0, 20).map((f, idx) => ({
            id: clampStr(f.id, 40) || `faq-${idx + 1}`,
            question: sanitizeLoc(f.question, { ru: 'Вопрос', ky: 'Суроо', en: 'Question' }, 200),
            answer: sanitizeLoc(f.answer, { ru: 'Ответ', ky: 'Жооп', en: 'Answer' }, 600),
          }))
        : cur.faqs,
      contacts: body.contacts
        ? {
            address: sanitizeLoc(body.contacts.address, cur.contacts.address, 200),
            phone: clampStr(body.contacts.phone, 32) || cur.contacts.phone,
            whatsapp: clampStr(body.contacts.whatsapp, 24).replace(/\D/g, '') || cur.contacts.whatsapp,
            telegram: clampStr(body.contacts.telegram, 64).replace(/^@/, '') || cur.contacts.telegram,
            instagram: clampStr(body.contacts.instagram, 64).replace(/^@/, '') || cur.contacts.instagram,
            workHours: sanitizeLoc(body.contacts.workHours, cur.contacts.workHours, 140),
            twoGisUrl: sanitizeUrl(body.contacts.twoGisUrl, cur.contacts.twoGisUrl),
            yandexMapsUrl: sanitizeUrl(body.contacts.yandexMapsUrl, cur.contacts.yandexMapsUrl),
          }
        : cur.contacts,
      priceList: Array.isArray(body.priceList) && body.priceList.length > 0
        ? sanitizePriceList(body.priceList)
        : cur.priceList,
    };

    db.content = next;
    await saveDb(db);
    res.json(next);
  });

  // ------------------------------------------------------------------
  // CLIENT ACCOUNT (/api/account)
  // ------------------------------------------------------------------
  app.get('/api/account', async (req, res) => {
    const session = extractSession(req, CLIENT_COOKIE, 'client');
    if (!session || !session.phone) {
      res.status(401).json({ authenticated: false });
      return;
    }
    const db = await getDb();
    const account = db.clients[session.phone];
    if (!account) {
      res.status(401).json({ authenticated: false });
      return;
    }
    const bookings = db.bookings
      .filter((b) => b.phone === session.phone)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({
      authenticated: true,
      profile: {
        name: account.name,
        phone: account.phone,
        createdAt: account.createdAt,
        savedPresets: account.savedPresets || [],
        savedEstimates: account.savedEstimates || [],
      },
      bookings,
    });
  });

  app.post('/api/account', async (req, res) => {
    const action = clampStr(req.body?.action, 32);
    const db = await getDb();

    if (action === 'logout') {
      clearAuthCookie(res, CLIENT_COOKIE);
      res.json({ ok: true });
      return;
    }

    if (action === 'register') {
      const name = clampStr(req.body?.name, 80);
      const phone = normalizePhone(req.body?.phone);
      const password = clampStr(req.body?.password, 128);
      const confirmPassword = clampStr(req.body?.confirmPassword, 128);
      const existingBookingCode = clampStr(req.body?.existingBookingCode, 20).toUpperCase();

      if (name.length < 2) {
        res.status(400).json({ error: 'Введите ваше имя (минимум 2 символа).' });
        return;
      }
      if (!phone) {
        res.status(400).json({ error: 'Введите корректный номер телефона (например, +996 555 123 456).' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Пароль должен быть не короче 6 символов.' });
        return;
      }
      if (password !== confirmPassword) {
        res.status(400).json({ error: 'Пароли не совпадают.' });
        return;
      }
      if (db.clients[phone]) {
        res.status(409).json({ error: 'Аккаунт с этим номером уже зарегистрирован. Выполните вход.' });
        return;
      }

      // If bookings already exist for this phone, require one booking code for ownership proof
      const existingBookings = db.bookings.filter((b) => b.phone === phone);
      if (existingBookings.length > 0) {
        const matched = existingBookings.some((b) => b.id.toUpperCase() === existingBookingCode);
        if (!matched) {
          res.status(400).json({
            requireBookingCode: true,
            error: 'На этот номер уже есть заявки. Для подтверждения введите номер одной из них (например, RH-123456).',
          });
          return;
        }
      }

      const now = new Date().toISOString();
      db.clients[phone] = {
        name,
        phone,
        createdAt: now,
        passwordHash: hashPassword(password),
        savedPresets: [],
      };
      await saveDb(db);

      const token = signSessionToken({
        role: 'client',
        phone,
        name,
        exp: Date.now() + CLIENT_TTL_SEC * 1000,
      });
      setAuthCookie(res, CLIENT_COOKIE, token, CLIENT_TTL_SEC);
      res.status(201).json({
        ok: true,
        token,
        profile: { name, phone, createdAt: now, savedPresets: [] },
        bookings: existingBookings,
      });
      return;
    }

    if (action === 'login') {
      const phone = normalizePhone(req.body?.phone);
      const password = clampStr(req.body?.password, 128);
      if (!phone || !password) {
        await authDelay();
        res.status(401).json({ error: 'Введите телефон и пароль.' });
        return;
      }
      const account = db.clients[phone];
      if (!account || !verifyPassword(password, account.passwordHash)) {
        await authDelay();
        res.status(401).json({ error: 'Неверный номер телефона или пароль.' });
        return;
      }
      const token = signSessionToken({
        role: 'client',
        phone: account.phone,
        name: account.name,
        exp: Date.now() + CLIENT_TTL_SEC * 1000,
      });
      setAuthCookie(res, CLIENT_COOKIE, token, CLIENT_TTL_SEC);
      const bookings = db.bookings
        .filter((b) => b.phone === account.phone)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      res.json({
        ok: true,
        token,
        profile: {
          name: account.name,
          phone: account.phone,
          createdAt: account.createdAt,
          savedPresets: account.savedPresets || [],
          savedEstimates: account.savedEstimates || [],
        },
        bookings,
      });
      return;
    }

    if (action === 'link-booking') {
      const session = extractSession(req, CLIENT_COOKIE, 'client');
      if (!session || !session.phone) {
        res.status(401).json({ error: 'Требуется вход в личный кабинет.' });
        return;
      }
      const code = clampStr(req.body?.bookingCode, 20).toUpperCase();
      const target = db.bookings.find((b) => b.id.toUpperCase() === code);
      if (!target) {
        res.status(404).json({ error: 'Заявка с таким номером не найдена.' });
        return;
      }
      if (target.phone && target.phone !== session.phone && db.clients[target.phone]) {
        res.status(403).json({ error: 'Эта заявка уже привязана к другому аккаунту.' });
        return;
      }
      target.phone = session.phone;
      await saveDb(db);
      res.json({ ok: true, booking: target });
      return;
    }

    if (action === 'save-preset') {
      const session = extractSession(req, CLIENT_COOKIE, 'client');
      if (!session || !session.phone) {
        res.status(401).json({ error: 'Войдите в кабинет, чтобы сохранить 3D-проект.' });
        return;
      }
      const account = db.clients[session.phone];
      if (!account) {
        res.status(401).json({ error: 'Аккаунт не найден.' });
        return;
      }
      const label = clampStr(req.body?.label, 80) || 'Мой 3D-проект';
      const config = req.body?.config as Visual3DConfig | undefined;
      if (!config || typeof config !== 'object') {
        res.status(400).json({ error: 'Некорректные данные 3D-проекта.' });
        return;
      }
      const preset = {
        id: `pr-${Date.now()}`,
        label,
        createdAt: new Date().toISOString(),
        config,
      };
      account.savedPresets = [preset, ...(account.savedPresets || [])].slice(0, 12);
      await saveDb(db);
      res.json({ ok: true, savedPresets: account.savedPresets });
      return;
    }

    if (action === 'save-estimate' || action === 'delete-estimate') {
      const session = extractSession(req, CLIENT_COOKIE, 'client');
      const account = session?.phone ? db.clients[session.phone] : undefined;
      if (!account) {
        res.status(401).json({ error: 'Войдите в кабинет, чтобы сохранить смету.' });
        return;
      }
      if (action === 'delete-estimate') {
        const id = clampStr(req.body?.id, 40);
        account.savedEstimates = (account.savedEstimates || []).filter((e) => e.id !== id);
      } else {
        const code = clampStr(req.body?.code, 6000);
        if (!/^[A-Za-z0-9_-]{4,6000}$/.test(code)) {
          res.status(400).json({ error: 'Некорректные данные сметы.' });
          return;
        }
        const saved = {
          id: `est-${Date.now()}`,
          label: clampStr(req.body?.label, 100) || 'Моя смета',
          createdAt: new Date().toISOString(),
          code,
          totalKgs: Math.max(0, Math.min(1_000_000_000, Math.round(Number(req.body?.totalKgs) || 0))),
        };
        account.savedEstimates = [saved, ...(account.savedEstimates || [])].slice(0, 12);
      }
      await saveDb(db);
      res.json({ ok: true, savedEstimates: account.savedEstimates });
      return;
    }

    res.status(400).json({ error: 'Неизвестное действие.' });
  });

  // ------------------------------------------------------------------
  // BOOKINGS (/api/bookings)
  // ------------------------------------------------------------------
  app.get('/api/bookings', async (req, res) => {
    const admin = extractSession(req, ADMIN_COOKIE, 'admin');
    if (!admin) {
      res.status(401).json({ error: 'Доступ только для администратора.' });
      return;
    }
    const db = await getDb();
    const sorted = [...db.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ bookings: sorted });
  });

  app.post('/api/bookings', async (req, res) => {
    const clientSession = extractSession(req, CLIENT_COOKIE, 'client');
    const adminSession = extractSession(req, ADMIN_COOKIE, 'admin');
    if (!clientSession && !adminSession) {
      res.status(401).json({ error: 'Чтобы создать заявку, войдите или зарегистрируйтесь.' });
      return;
    }

    const db = await getDb();
    const phone = clientSession?.phone || normalizePhone(req.body?.phone);
    if (!phone) {
      res.status(400).json({ error: 'Некорректный номер телефона.' });
      return;
    }
    const clientAccount = db.clients[phone];
    const clientName = clampStr(req.body?.clientName, 80) || clientAccount?.name || 'Клиент READY HOME';

    const propertyType: PropertyType = VALID_PROPERTIES.includes(req.body?.propertyType)
      ? req.body.propertyType
      : 'newbuild';
    const materialTier: MaterialTier = VALID_TIERS.includes(req.body?.materialTier)
      ? req.body.materialTier
      : 'comfort';
    const areaSqm = Math.max(15, Math.min(1500, Math.round(Number(req.body?.areaSqm) || 65)));
    const roomsCount = clampStr(req.body?.roomsCount, 30) || '2-комн';
    const complexOrDistrict = clampStr(req.body?.complexOrDistrict, 120) || 'Бишкек';
    const addressDetails = clampStr(req.body?.addressDetails, 160);

    const serviceId = clampStr(req.body?.serviceId, 50);
    const service = db.content.services.find((s) => s.id === serviceId) || db.content.services[0];
    const masterId = clampStr(req.body?.masterId, 50);
    const master = db.content.masters.find((m) => m.id === masterId) || db.content.masters[0];

    const date = clampStr(req.body?.date, 24);
    const time = clampStr(req.body?.time, 16);
    if (!date || !time) {
      res.status(400).json({ error: 'Выберите дату и время выезда замерщика.' });
      return;
    }

    const paymentMethod = clampStr(req.body?.paymentMethod, 60) || 'MBank';
    const needLayoutApproval = Boolean(req.body?.needLayoutApproval);
    const comment = clampStr(req.body?.comment, 500);
    const promoCode = clampStr(req.body?.promoCode, 24).toUpperCase();

    const matchedPromo = promoCode
      ? db.content.promos.find((p) => p.code.toUpperCase() === promoCode)
      : undefined;
    const discountPercent = matchedPromo?.discountPercent || 0;

    const estimate = calculateRenovationEstimate(
      service.pricePerSqm,
      areaSqm,
      propertyType,
      materialTier,
      discountPercent,
    );

    let visual3D: Visual3DConfig | undefined;
    if (req.body?.visual3D && typeof req.body.visual3D === 'object') {
      const v = req.body.visual3D as Partial<Visual3DConfig>;
      if (v.roomType && v.wallFinish && v.floorFinish && v.ceilingType) {
        visual3D = {
          roomType: v.roomType,
          stylePreset: v.stylePreset || 'minimal',
          wallFinish: v.wallFinish,
          floorFinish: v.floorFinish,
          ceilingType: v.ceilingType,
          accentTone: v.accentTone || 'graphite',
          lightingMode: v.lightingMode === 'evening' ? 'evening' : 'day',
          renovationStage: 'after',
          areaSqm: Math.max(12, Math.min(500, Math.round(Number(v.areaSqm) || areaSqm))),
          tier: VALID_TIERS.includes(v.tier as MaterialTier) ? (v.tier as MaterialTier) : materialTier,
          estimatedPriceKgs: Math.max(0, Math.round(Number(v.estimatedPriceKgs) || estimate.totalKgs)),
        };
      }
    }

    // Itemized estimate: recompute from the studio's own price list so the client
    // cannot send arbitrary totals.
    let workEstimate: WorkEstimate | undefined;
    const rawWork = req.body?.workEstimate as { params?: unknown; selections?: unknown } | undefined;
    if (rawWork && typeof rawWork === 'object' && Array.isArray(rawWork.selections)) {
      const params = clampParams((rawWork.params || {}) as Record<string, never>);
      const selections: WorkSelection[] = (rawWork.selections as unknown[])
        .slice(0, 120)
        .filter((s): s is { id: unknown; qty: unknown } => Boolean(s) && typeof s === 'object')
        .map((s) => ({ id: clampStr(s.id, 40), qty: Number(s.qty) || 0 }))
        .filter((s) => s.id);
      const computed = computeWorkEstimate(db.content.priceList, params, selections);
      if (computed.lines.length > 0) {
        // Keep colour choices only for jobs that are actually in the estimate.
        const finishes = sanitizeFinishes((rawWork as { finishes?: unknown }).finishes);
        const lineIds = new Set(computed.lines.map((l) => l.id));
        for (const g of FINISH_GROUPS) {
          if (!g.workItemIds.some((id) => lineIds.has(id))) delete finishes[g.id];
        }
        workEstimate = { ...computed, finishes };
      }
    }

    const existingIds = new Set(db.bookings.map((b) => b.id));
    const id = generateBookingCode(existingIds);

    const record: BookingRecord = {
      id,
      phone,
      clientName,
      propertyType,
      complexOrDistrict,
      addressDetails,
      areaSqm,
      roomsCount,
      serviceId: service.id,
      serviceName: service.name.ru,
      warrantyYears: service.warrantyYears,
      materialTier,
      masterId: master?.id || '',
      masterName: master?.name || 'Назначит студия',
      date,
      time,
      paymentMethod,
      needLayoutApproval,
      promoCode: matchedPromo ? matchedPromo.code : undefined,
      comment,
      totalPriceKgs: workEstimate
        ? Math.round((workEstimate.totalKgs * (100 - discountPercent)) / 100)
        : visual3D
          ? Math.max(estimate.totalKgs, visual3D.estimatedPriceKgs)
          : estimate.totalKgs,
      status: 'pending',
      createdAt: new Date().toISOString(),
      visual3D,
      workEstimate,
    };

    db.bookings.unshift(record);
    await saveDb(db);

    const tgMessage = [
      `🏗 Новая заявка READY HOME: ${record.id}`,
      `Клиент: ${record.clientName} (${record.phone})`,
      `Объект: ${record.complexOrDistrict}${record.addressDetails ? ', ' + record.addressDetails : ''} (${record.areaSqm} м², ${record.roomsCount})`,
      `Услуга: ${record.serviceName} [${record.materialTier}]`,
      `Специалист: ${record.masterName}`,
      `Дата замера: ${record.date} в ${record.time}`,
      `Оплата: ${record.paymentMethod}`,
      record.visual3D ? `3D-проект: ${record.visual3D.roomType} / ${record.visual3D.stylePreset}` : '',
      record.workEstimate ? formatWorkEstimateText(record.workEstimate) : '',
      `Оценка: ${record.totalPriceKgs.toLocaleString('ru-RU')} KGS`,
    ]
      .filter(Boolean)
      .join('\n');

    void sendTelegramNotification(tgMessage);

    res.status(201).json({ ok: true, booking: record });
  });

  app.patch('/api/bookings', async (req, res) => {
    const admin = extractSession(req, ADMIN_COOKIE, 'admin');
    if (!admin) {
      res.status(401).json({ error: 'Доступ только для администратора.' });
      return;
    }
    const id = clampStr(req.body?.id, 24);
    const status = req.body?.status as BookingStatus;
    if (!id || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Некорректный ID или статус заявки.' });
      return;
    }
    const db = await getDb();
    const target = db.bookings.find((b) => b.id === id);
    if (!target) {
      res.status(404).json({ error: 'Заявка не найдена.' });
      return;
    }
    target.status = status;
    await saveDb(db);
    res.json({ ok: true, booking: target });
  });

  // ------------------------------------------------------------------
  // REVIEWS (/api/reviews)
  // ------------------------------------------------------------------
  app.get('/api/reviews', async (req, res) => {
    const db = await getDb();
    const admin = extractSession(req, ADMIN_COOKIE, 'admin');
    // Admins see the moderation queue; visitors only approved reviews.
    res.json({ reviews: admin && req.query.all === '1' ? db.reviews : db.reviews.filter((r) => r.status !== 'pending') });
  });

  app.post('/api/reviews', async (req, res) => {
    const author = clampStr(req.body?.author, 80);
    const projectInfo = clampStr(req.body?.projectInfo, 120) || 'Ремонт в Бишкеке';
    const text = clampStr(req.body?.text, 600);
    const rating = Math.max(1, Math.min(5, Math.round(Number(req.body?.rating) || 5)));

    if (author.length < 2 || text.length < 10) {
      res.status(400).json({ error: 'Укажите имя (от 2 символов) и отзыв (от 10 символов).' });
      return;
    }

    const db = await getDb();
    // New reviews wait for the admin's approval before they appear on the site.
    const review: ReviewItem = {
      id: `rev-${Date.now()}`,
      author,
      projectInfo,
      rating,
      text,
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'pending',
    };
    const pending = db.reviews.filter((r) => r.status === 'pending');
    const approved = db.reviews.filter((r) => r.status !== 'pending');
    // Cap the moderation queue so spam cannot push real reviews out.
    db.reviews = [review, ...pending].slice(0, 50).concat(approved.slice(0, 80));
    await saveDb(db);
    void sendTelegramNotification(
      `💬 Новый отзыв на модерации от ${author} (${rating}★): ${text.slice(0, 200)}\nОдобрите его в админке → Отзывы.`,
    );
    res.status(201).json({ ok: true, pending: true });
  });

  app.patch('/api/reviews', async (req, res) => {
    const admin = extractSession(req, ADMIN_COOKIE, 'admin');
    if (!admin) {
      res.status(401).json({ error: 'Доступ только для администратора.' });
      return;
    }
    const id = clampStr(req.body?.id, 60);
    const db = await getDb();
    const target = db.reviews.find((r) => r.id === id);
    if (!target) {
      res.status(404).json({ error: 'Отзыв не найден.' });
      return;
    }
    target.status = 'approved';
    await saveDb(db);
    res.json({ ok: true, review: target });
  });

  app.delete('/api/reviews', async (req, res) => {
    const admin = extractSession(req, ADMIN_COOKIE, 'admin');
    if (!admin) {
      res.status(401).json({ error: 'Доступ только для администратора.' });
      return;
    }
    const id = clampStr(req.query?.id || req.body?.id, 60);
    const db = await getDb();
    db.reviews = db.reviews.filter((r) => r.id !== id);
    await saveDb(db);
    res.json({ ok: true });
  });

  app.post('/api/telegram-test', async (req, res) => {
    const admin = extractSession(req, ADMIN_COOKIE, 'admin');
    if (!admin) {
      res.status(401).json({ error: 'Доступ только для администратора.' });
      return;
    }
    const result = await sendTelegramNotification('✅ Тестовое уведомление READY HOME (Бишкек) работает корректно.');
    res.json(result);
  });

  return app;
}

async function startServer() {
  const app = createApp();

  // ------------------------------------------------------------------
  // VITE MIDDLEWARE (DEV) OR STATIC DIST (PROD)
  // ------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`READY HOME server running on http://0.0.0.0:${port}`);
  });
}

// On Vercel the app runs as a serverless function (api/index.ts), not a long-lived server.
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start READY HOME server:', err);
    process.exit(1);
  });
}
