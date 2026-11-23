import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Lock,
  LogOut,
  Plus,
  Save,
  Send,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BookingRecord,
  BookingStatus,
  ReviewItem,
  SiteContent,
} from '../types.ts';
import { formatKgs, STATUS_LABELS } from '../i18n.ts';
import { apiFetch, setAdminToken } from '../apiClient.ts';
import { PriceListEditor } from './PriceListEditor.tsx';
import { findFinish } from '../data/finishCatalog.ts';
import { FinishCatalogEditor } from './FinishCatalogEditor.tsx';
import { LayoutsEditor } from './LayoutsEditor.tsx';
import { StatsPanel } from './StatsPanel.tsx';
import { ScheduleEditor } from './ScheduleEditor.tsx';
import { openContract } from '../data/contractPrint.ts';
import { buyLabel, computeShoppingList } from '../data/materialsCatalog.ts';
import { ASSET_IMAGES } from '../data/defaultContent.ts';

interface AdminPanelModalProps {
  open: boolean;
  onClose: () => void;
  content: SiteContent;
  reviews: ReviewItem[];
  onContentSaved: (next: SiteContent) => void;
  onReviewsChanged: () => Promise<void>;
}

type AdminTab =
  | 'crm'
  | 'site'
  | 'promos'
  | 'masters'
  | 'services'
  | 'pricelist'
  | 'finishes'
  | 'layouts'
  | 'stats'
  | 'portfolio'
  | 'reviews'
  | 'contacts'
  | 'telegram';

export function AdminPanelModal({
  open,
  onClose,
  content,
  reviews,
  onContentSaved,
  onReviewsChanged,
}: AdminPanelModalProps) {
  const [statusLoading, setStatusLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [upstashConfigured, setUpstashConfigured] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('crm');
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');

  const [draft, setDraft] = useState<SiteContent>(content);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setDraft(content);
  }, [content]);

  const loadAdminState = async () => {
    setStatusLoading(true);
    const res = await apiFetch<{
      authenticated: boolean;
      needsSetup: boolean;
      telegramConfigured: boolean;
      upstashConfigured: boolean;
    }>('/api/admin-status', { auth: 'admin' });
    setStatusLoading(false);
    if (res.ok) {
      setAuthenticated(res.data.authenticated);
      setNeedsSetup(res.data.needsSetup);
      setTelegramConfigured(res.data.telegramConfigured);
      setUpstashConfigured(res.data.upstashConfigured);
      if (res.data.authenticated) {
        await fetchBookings();
      }
    }
  };

  const [adminReviews, setAdminReviews] = useState<ReviewItem[]>(reviews);

  const fetchAdminReviews = async () => {
    const res = await apiFetch<{ reviews?: ReviewItem[] }>('/api/reviews?all=1', { auth: 'admin' });
    if (res.ok && Array.isArray(res.data.reviews)) setAdminReviews(res.data.reviews);
  };

  const fetchBookings = async () => {
    void fetchAdminReviews();
    const res = await apiFetch<{ bookings?: BookingRecord[] }>('/api/bookings', { auth: 'admin' });
    if (res.ok && Array.isArray(res.data.bookings)) {
      setBookings(res.data.bookings);
    }
  };

  useEffect(() => {
    if (open) {
      void loadAdminState();
    }
  }, [open]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (password.length < 6) {
      setAuthError('Минимум 6 символов.');
      return;
    }
    if (password !== confirmPass) {
      setAuthError('Пароли не совпадают.');
      return;
    }
    setAuthBusy(true);
    const res = await apiFetch<{ ok?: boolean; token?: string; error?: string }>('/api/admin-setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    setAuthBusy(false);
    if (!res.ok) {
      setAuthError(res.data.error || 'Не удалось создать пароль.');
      return;
    }
    if (res.data.token) setAdminToken(res.data.token);
    setAuthenticated(true);
    setNeedsSetup(false);
    setPassword('');
    setConfirmPass('');
    await fetchBookings();
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    const res = await apiFetch<{ ok?: boolean; token?: string; error?: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    setAuthBusy(false);
    if (!res.ok) {
      setAuthError(res.data.error || 'Неверный пароль.');
      return;
    }
    if (res.data.token) setAdminToken(res.data.token);
    setAuthenticated(true);
    setPassword('');
    await fetchBookings();
  };

  const handleLogout = async () => {
    await apiFetch('/api/login', {
      method: 'POST',
      auth: 'admin',
      body: JSON.stringify({ action: 'logout' }),
    });
    setAdminToken(null);
    setAuthenticated(false);
  };

  const handleSaveContent = async () => {
    setSaving(true);
    const res = await apiFetch<SiteContent & { error?: string }>('/api/content', {
      method: 'PUT',
      auth: 'admin',
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (!res.ok) {
      showToast(res.data.error || 'Ошибка сохранения.');
      return;
    }
    onContentSaved(res.data);
    showToast('Изменения сохранены и сразу видны на сайте.');
  };

  const handleBookingPatch = async (id: string, change: { masterId?: string; note?: string }, okMsg: string) => {
    const res = await apiFetch<{ ok?: boolean; booking?: BookingRecord }>('/api/bookings', {
      method: 'PATCH',
      auth: 'admin',
      body: JSON.stringify({ id, ...change }),
    });
    if (res.ok && res.data.booking) {
      const updated = res.data.booking;
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
      showToast(okMsg);
    }
  };

  const handleStatusUpdate = async (id: string, status: BookingStatus) => {
    const res = await apiFetch<{ ok?: boolean }>('/api/bookings', {
      method: 'PATCH',
      auth: 'admin',
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
      showToast(`Статус заявки ${id} обновлён.`);
    }
  };

  const handleDeleteReview = async (id: string) => {
    const res = await apiFetch('/api/reviews?id=' + encodeURIComponent(id), {
      method: 'DELETE',
      auth: 'admin',
    });
    if (res.ok) {
      await Promise.all([onReviewsChanged(), fetchAdminReviews()]);
      showToast('Отзыв удалён.');
    }
  };

  const handleApproveReview = async (id: string) => {
    const res = await apiFetch('/api/reviews', {
      method: 'PATCH',
      auth: 'admin',
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      await Promise.all([onReviewsChanged(), fetchAdminReviews()]);
      showToast('Отзыв опубликован на сайте.');
    }
  };

  const pendingReviews = adminReviews.filter((r) => r.status === 'pending');

  const handleTelegramTest = async () => {
    const res = await apiFetch<{ sent?: boolean; reason?: string }>('/api/telegram-test', {
      method: 'POST',
      auth: 'admin',
    });
    if (res.data.sent) showToast('Тестовое сообщение отправлено в Telegram!');
    else showToast('Telegram не настроен в переменных окружения (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).');
  };

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.id.toLowerCase().includes(q) ||
        b.clientName.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.complexOrDistrict.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q)
      );
    });
  }, [bookings, search, statusFilter]);

  const kpis = useMemo(() => {
    const valid = bookings.filter((b) => b.status !== 'cancelled');
    const revenue = valid.reduce((sum, b) => sum + b.totalPriceKgs, 0);
    const avg = valid.length > 0 ? Math.round(revenue / valid.length) : 0;
    return { total: bookings.length, active: valid.length, revenue, avg };
  }, [bookings]);

  const exportAllCsv = () => {
    const headers = ['ID', 'Клиент', 'Телефон', 'Объект', 'м2', 'Услуга', 'Дата', 'Сумма KGS', 'Статус'];
    const rows = filteredBookings.map((b) => [
      b.id,
      `"${b.clientName.replace(/"/g, '""')}"`,
      b.phone,
      `"${b.complexOrDistrict.replace(/"/g, '""')}"`,
      b.areaSqm,
      `"${b.serviceName.replace(/"/g, '""')}"`,
      `${b.date} ${b.time}`,
      b.totalPriceKgs,
      b.status,
    ]);
    const csv = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `readyhome-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-3xl bg-white dark:bg-[#131d33] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Админ-панель READY HOME
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Хранилище: {upstashConfigured ? 'Upstash Redis' : 'Локальная БД (авто-переключение на Redis при KV_REST_API_URL)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {authenticated && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveContent}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Сохранение...' : 'Сохранить сайт'}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-500/10 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Выйти
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {toast && (
          <div className="px-6 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
            {toast}
          </div>
        )}

        {statusLoading ? (
          <div className="p-12 text-center text-sm text-slate-500">Загрузка панели...</div>
        ) : !authenticated ? (
          <div className="p-8 max-w-md mx-auto w-full space-y-5">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                {needsSetup ? 'Первичная настройка пароля администратора' : 'Вход в панель управления'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {needsSetup
                  ? 'Переменная ADMIN_PASSWORD не задана. Задайте пароль владельца сейчас — он сохранится в хэшированном виде (scrypt) на сервере.'
                  : 'Введите пароль администратора (сессия 12 часов).'}
              </p>
            </div>

            <form onSubmit={needsSetup ? handleSetupAdmin : handleAdminLogin} className="space-y-3.5">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={needsSetup ? 'Придумайте пароль (от 6 символов)' : 'Пароль администратора'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
              />
              {needsSetup && (
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Повторите пароль"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                />
              )}
              {authError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
                  {authError}
                </div>
              )}
              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm cursor-pointer"
              >
                {authBusy ? 'Проверка...' : needsSetup ? 'Сохранить пароль и войти' : 'Войти'}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row flex-1 min-h-0">
            {/* Sidebar Navigation */}
            <aside className="md:w-56 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 p-3 flex md:flex-col gap-1 overflow-x-auto shrink-0">
              {(
                [
                  ['crm', 'Заказы (CRM)'],
                  ['stats', 'Аналитика'],
                  ['site', 'Баннер и строка'],
                  ['services', 'Цены и услуги'],
                  ['pricelist', 'Прайс-лист работ'],
                  ['finishes', 'Каталог отделки'],
                  ['layouts', 'Планировки ЖК'],
                  ['promos', 'Акции и скидки'],
                  ['masters', 'Мастера'],
                  ['portfolio', 'До/После и IG'],
                  ['reviews', pendingReviews.length ? `Отзывы (${pendingReviews.length} новых)` : 'Отзывы'],
                  ['contacts', 'График и контакты'],
                  ['telegram', 'Telegram'],
                ] as Array<[AdminTab, string]>
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </aside>

            {/* Main Workspace */}
            <div className="flex-1 p-5 overflow-y-auto space-y-5">
              {/* 1. CRM TAB */}
              {activeTab === 'crm' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10">
                      <div className="text-xs text-slate-500">Всего заявок</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
                        {kpis.total}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10">
                      <div className="text-xs text-slate-500">Активных / сдан.</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
                        {kpis.active}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10">
                      <div className="text-xs text-slate-500">Объём смет</div>
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1">
                        {formatKgs(kpis.revenue)}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10">
                      <div className="text-xs text-slate-500">Средний чек</div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
                        {formatKgs(kpis.avg)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Поиск по номеру, клиенту, ЖК..."
                      className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | BookingStatus)}
                      className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="all">Все статусы</option>
                      {(['pending', 'in_progress', 'handover', 'completed', 'cancelled'] as BookingStatus[]).map(
                        (st) => (
                          <option key={st} value={st}>
                            {STATUS_LABELS[st].ru}
                          </option>
                        ),
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={exportAllCsv}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      CSV
                    </button>
                  </div>

                  {filteredBookings.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
                      Заявок пока нет. Новые заявки от клиентов сразу появятся здесь.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredBookings.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 text-sm">
                            <div className="font-bold text-slate-900 dark:text-white">
                              <span className="text-amber-500 tabular-nums mr-2">{b.id}</span>
                              {b.clientName} · <span className="tabular-nums">{b.phone}</span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">
                              {b.source === 'quick' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 mr-1">
                                  Перезвонить ({b.contactMethod === 'whatsapp' ? 'WhatsApp' : b.contactMethod === 'telegram' ? 'Telegram' : 'звонок'})
                                  {b.contactMethod === 'whatsapp' && (
                                    <a href={`https://wa.me/${b.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="underline">
                                      открыть
                                    </a>
                                  )}
                                  ·
                                </span>
                              ) : null}
                              {b.complexOrDistrict}
                              {b.areaSqm ? ` (${b.areaSqm} м²)` : ''} · {b.serviceName}
                              {b.date ? ` · Замер: ${b.date} ${b.time}` : ''}
                              {b.comment ? ` · «${b.comment}»` : ''}
                            </div>
                            {b.visual3D && (
                              <div className="text-xs text-amber-600 dark:text-amber-400">
                                3D-проект: {b.visual3D.roomType} / {b.visual3D.wallFinish} / {b.visual3D.floorFinish}
                              </div>
                            )}
                            <textarea
                              defaultValue={b.adminNote || ''}
                              placeholder="Заметка для команды (клиент её не видит)"
                              rows={1}
                              onBlur={(e) => {
                                if (e.target.value !== (b.adminNote || '')) {
                                  void handleBookingPatch(b.id, { note: e.target.value }, 'Заметка сохранена.');
                                }
                              }}
                              className="mt-1.5 w-full max-w-xl px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/15 text-xs text-slate-900 dark:text-white"
                            />
                            {b.workEstimate && (
                              <details className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                                <summary className="cursor-pointer text-amber-600 dark:text-amber-400 font-medium">
                                  Смета по работам: {b.workEstimate.params.rooms}-комн, {b.workEstimate.params.areaSqm} м² ·{' '}
                                  {formatKgs(b.workEstimate.totalKgs)}
                                </summary>
                                <ul className="mt-1.5 space-y-0.5 tabular-nums">
                                  {b.workEstimate.lines.map((l) => (
                                    <li key={l.id}>
                                      {l.name}: {l.qty} {l.unit === 'm2' ? 'м²' : l.unit === 'm' ? 'м' : 'шт'} —{' '}
                                      {formatKgs(l.workKgs + l.materialsKgs)}
                                    </li>
                                  ))}
                                </ul>
                                <div className="mt-1.5">
                                  <span className="font-semibold">Закупка: </span>
                                  {computeShoppingList(b.workEstimate)
                                    .map((i) => `${i.name} — ${buyLabel(i)}`)
                                    .join('; ')}
                                </div>
                                {b.workEstimate.finishes && Object.keys(b.workEstimate.finishes).length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                                    {content.finishCatalog.filter((g) => b.workEstimate?.finishes?.[g.id]).map((g) => {
                                      const op = findFinish(g.id, b.workEstimate?.finishes?.[g.id], content.finishCatalog);
                                      return (
                                        <span key={g.id} className="inline-flex items-center gap-1">
                                          <span className="w-3 h-3 rounded-full border border-slate-300" style={{ background: op.color }} />
                                          {g.label.ru}: <strong>{op.name.ru}</strong>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </details>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0 lg:max-w-md lg:justify-end">
                            <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                              {formatKgs(b.totalPriceKgs)}
                            </span>
                            <select
                              value={b.masterId}
                              onChange={(e) => void handleBookingPatch(b.id, { masterId: e.target.value }, 'Прораб назначен.')}
                              aria-label="Прораб"
                              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/15 text-xs text-slate-900 dark:text-white max-w-40"
                            >
                              {!content.masters.some((m) => m.id === b.masterId) && <option value={b.masterId}>{b.masterName}</option>}
                              {content.masters.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => openContract(b, content)}
                              className="px-2.5 py-1.5 rounded-lg border border-amber-500/50 text-amber-600 dark:text-amber-400 text-xs font-semibold cursor-pointer"
                            >
                              Договор
                            </button>
                            <select
                              value={b.status}
                              onChange={(e) => void handleStatusUpdate(b.id, e.target.value as BookingStatus)}
                              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/15 text-xs font-medium text-slate-900 dark:text-white"
                            >
                              {(['pending', 'in_progress', 'handover', 'completed', 'cancelled'] as BookingStatus[]).map(
                                (st) => (
                                  <option key={st} value={st}>
                                    {STATUS_LABELS[st].ru}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. SITE / BANNER / TICKER */}
              {activeTab === 'site' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">
                      Бегущая строка над шапкой (RU)
                    </label>
                    <input
                      type="text"
                      value={draft.tickerText.ru}
                      onChange={(e) =>
                        setDraft({ ...draft, tickerText: { ...draft.tickerText, ru: e.target.value } })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">
                      Скорость смены слайдов (мс): <span className="tabular-nums text-amber-500">{draft.heroSpeedMs}</span>
                    </label>
                    <input
                      type="range"
                      min={3000}
                      max={15000}
                      step={500}
                      value={draft.heroSpeedMs}
                      onChange={(e) => setDraft({ ...draft, heroSpeedMs: Number(e.target.value) })}
                      className="w-full max-w-sm accent-amber-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Слайды главного баннера</h4>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            heroSlides: [
                              ...draft.heroSlides,
                              {
                                id: `slide-${Date.now()}`,
                                title: { ru: 'Новый слайд READY HOME', ky: 'Жаңы слайд', en: 'New Slide' },
                                subtitle: { ru: 'Описание ремонта под ключ', ky: 'Сүрөттөмө', en: 'Description' },
                                image: ASSET_IMAGES.heroLiving,
                                textAlign: 'left',
                              },
                            ],
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Добавить слайд
                      </button>
                    </div>
                    {draft.heroSlides.map((slide, idx) => (
                      <div
                        key={slide.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-amber-500">Слайд #{idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={slide.textAlign}
                              onChange={(e) => {
                                const slides = [...draft.heroSlides];
                                slides[idx] = { ...slide, textAlign: e.target.value as 'left' | 'right' };
                                setDraft({ ...draft, heroSlides: slides });
                              }}
                              className="px-2 py-1 rounded-lg text-xs bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10"
                            >
                              <option value="left">Текст слева</option>
                              <option value="right">Текст справа</option>
                            </select>
                            {draft.heroSlides.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDraft({
                                    ...draft,
                                    heroSlides: draft.heroSlides.filter((s) => s.id !== slide.id),
                                  })
                                }
                                className="text-rose-500 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={slide.title.ru}
                          onChange={(e) => {
                            const slides = [...draft.heroSlides];
                            slides[idx] = { ...slide, title: { ...slide.title, ru: e.target.value } };
                            setDraft({ ...draft, heroSlides: slides });
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
                          placeholder="Заголовок слайда"
                        />
                        <input
                          type="text"
                          value={slide.subtitle.ru}
                          onChange={(e) => {
                            const slides = [...draft.heroSlides];
                            slides[idx] = { ...slide, subtitle: { ...slide.subtitle, ru: e.target.value } };
                            setDraft({ ...draft, heroSlides: slides });
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-xs"
                          placeholder="Подзаголовок"
                        />
                        <input
                          type="text"
                          value={slide.image}
                          onChange={(e) => {
                            const slides = [...draft.heroSlides];
                            slides[idx] = { ...slide, image: e.target.value };
                            setDraft({ ...draft, heroSlides: slides });
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-xs"
                          placeholder="URL изображения"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. SERVICES */}
              {activeTab === 'services' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Услуги и цены за м²</h4>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          services: [
                            ...draft.services,
                            {
                              id: `srv-${Date.now()}`,
                              category: 'turnkey',
                              name: { ru: 'Новая услуга ремонта', ky: 'Жаңы кызмат', en: 'New Service' },
                              description: { ru: 'Описание работ под ключ', ky: 'Сүрөттөмө', en: 'Description' },
                              pricePerSqm: 11000,
                              warrantyYears: 3,
                              durationDays: '30–45 дней',
                              materials: 'Knauf, Ceresit',
                              image: ASSET_IMAGES.afterApt,
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Добавить услугу
                    </button>
                  </div>
                  {draft.services.map((srv, idx) => (
                    <div
                      key={srv.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 grid sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <input
                        type="text"
                        value={srv.name.ru}
                        onChange={(e) => {
                          const list = [...draft.services];
                          list[idx] = { ...srv, name: { ...srv.name, ru: e.target.value } };
                          setDraft({ ...draft, services: list });
                        }}
                        className="sm:col-span-5 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
                      />
                      <input
                        type="number"
                        value={srv.pricePerSqm}
                        onChange={(e) => {
                          const list = [...draft.services];
                          list[idx] = { ...srv, pricePerSqm: Number(e.target.value) || 1000 };
                          setDraft({ ...draft, services: list });
                        }}
                        className="sm:col-span-3 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm tabular-nums"
                        placeholder="Цена KGS/м²"
                      />
                      <input
                        type="number"
                        value={srv.warrantyYears}
                        onChange={(e) => {
                          const list = [...draft.services];
                          list[idx] = { ...srv, warrantyYears: Number(e.target.value) || 3 };
                          setDraft({ ...draft, services: list });
                        }}
                        className="sm:col-span-2 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm tabular-nums"
                        placeholder="Гарантия"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({ ...draft, services: draft.services.filter((s) => s.id !== srv.id) })
                        }
                        className="sm:col-span-2 text-rose-500 text-xs font-medium inline-flex items-center justify-end gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'stats' && <StatsPanel />}

              {activeTab === 'layouts' && (
                <LayoutsEditor layouts={draft.layouts} onChange={(layouts) => setDraft({ ...draft, layouts })} />
              )}

              {activeTab === 'finishes' && (
                <FinishCatalogEditor
                  groups={draft.finishCatalog}
                  onChange={(finishCatalog) => setDraft({ ...draft, finishCatalog })}
                />
              )}

              {activeTab === 'pricelist' && (
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 mb-4 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.installment.enabled}
                      onChange={(e) => setDraft({ ...draft, installment: { ...draft.installment, enabled: e.target.checked } })}
                      className="w-4 h-4 accent-amber-500"
                    />
                    Показывать рассрочку в смете
                  </label>
                  <div className="grid sm:grid-cols-4 gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="space-y-1 sm:col-span-4">
                      <span>Сроки рассрочки, мес.</span>
                      <div className="flex flex-wrap gap-3">
                        {[3, 6, 9, 12, 18, 24].map((m) => (
                          <label key={m} className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draft.installment.months.includes(m)}
                              onChange={(e) => {
                                const set = new Set(draft.installment.months);
                                if (e.target.checked) set.add(m);
                                else set.delete(m);
                                setDraft({
                                  ...draft,
                                  installment: { ...draft.installment, months: [...set].sort((a, b) => a - b) },
                                });
                              }}
                              className="w-4 h-4 accent-amber-500"
                            />
                            {m}
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="space-y-1">
                      <span>Первый взнос, %</span>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        value={draft.installment.downPaymentPercent}
                        onChange={(e) =>
                          setDraft({ ...draft, installment: { ...draft.installment, downPaymentPercent: Number(e.target.value) || 0 } })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span>Переплата за весь срок, %</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={draft.installment.markupPercent}
                        onChange={(e) =>
                          setDraft({ ...draft, installment: { ...draft.installment, markupPercent: Number(e.target.value) || 0 } })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span>Подпись (банк, условия)</span>
                      <input
                        type="text"
                        value={draft.installment.note}
                        placeholder="Рассрочка через банк-партнёр"
                        onChange={(e) => setDraft({ ...draft, installment: { ...draft.installment, note: e.target.value } })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
                      />
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'pricelist' && (
                <PriceListEditor
                  items={draft.priceList}
                  onChange={(priceList) => setDraft({ ...draft, priceList })}
                />
              )}

              {/* 4. PROMOS */}
              {activeTab === 'promos' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Акции и промокоды</h4>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          promos: [
                            ...draft.promos,
                            {
                              id: `promo-${Date.now()}`,
                              badge: { ru: 'Спецпредложение', ky: 'Акция', en: 'Offer' },
                              title: { ru: 'Новая скидка на ремонт', ky: 'Жаңы арзандатуу', en: 'New Discount' },
                              description: { ru: 'Условия акции', ky: 'Шарттары', en: 'Terms' },
                              code: 'HOME10',
                              discountPercent: 10,
                              expiresAt: '31.12.2026',
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Добавить акцию
                    </button>
                  </div>
                  {draft.promos.map((p, idx) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 grid sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <input
                        type="text"
                        value={p.title.ru}
                        onChange={(e) => {
                          const list = [...draft.promos];
                          list[idx] = { ...p, title: { ...p.title, ru: e.target.value } };
                          setDraft({ ...draft, promos: list });
                        }}
                        className="sm:col-span-5 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
                      />
                      <input
                        type="text"
                        value={p.code}
                        onChange={(e) => {
                          const list = [...draft.promos];
                          list[idx] = { ...p, code: e.target.value.toUpperCase() };
                          setDraft({ ...draft, promos: list });
                        }}
                        className="sm:col-span-3 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm uppercase"
                      />
                      <input
                        type="number"
                        value={p.discountPercent}
                        onChange={(e) => {
                          const list = [...draft.promos];
                          list[idx] = { ...p, discountPercent: Number(e.target.value) || 5 };
                          setDraft({ ...draft, promos: list });
                        }}
                        className="sm:col-span-2 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({ ...draft, promos: draft.promos.filter((x) => x.id !== p.id) })
                        }
                        className="sm:col-span-2 text-rose-500 text-xs font-medium inline-flex items-center justify-end gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 5. MASTERS */}
              {activeTab === 'masters' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Команда и прорабы</h4>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          masters: [
                            ...draft.masters,
                            {
                              id: `m-${Date.now()}`,
                              name: 'Новый специалист',
                              role: { ru: 'Инженер-прораб', ky: 'Прораб', en: 'Site Engineer' },
                              experienceYears: 7,
                              specialization: { ru: 'Отделка и инженерия', ky: 'Жасалгалоо', en: 'Finishing' },
                              projectsCount: 60,
                              photo: ASSET_IMAGES.masterArch,
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Добавить мастера
                    </button>
                  </div>
                  {draft.masters.map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 grid sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => {
                          const list = [...draft.masters];
                          list[idx] = { ...m, name: e.target.value };
                          setDraft({ ...draft, masters: list });
                        }}
                        className="sm:col-span-4 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
                      />
                      <input
                        type="text"
                        value={m.role.ru}
                        onChange={(e) => {
                          const list = [...draft.masters];
                          list[idx] = { ...m, role: { ...m.role, ru: e.target.value } };
                          setDraft({ ...draft, masters: list });
                        }}
                        className="sm:col-span-4 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
                      />
                      <input
                        type="number"
                        value={m.experienceYears}
                        onChange={(e) => {
                          const list = [...draft.masters];
                          list[idx] = { ...m, experienceYears: Number(e.target.value) || 5 };
                          setDraft({ ...draft, masters: list });
                        }}
                        className="sm:col-span-2 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({ ...draft, masters: draft.masters.filter((x) => x.id !== m.id) })
                        }
                        className="sm:col-span-2 text-rose-500 text-xs font-medium inline-flex items-center justify-end gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 6. PORTFOLIO BEFORE/AFTER */}
              {activeTab === 'portfolio' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Портфолио «До / После»</h4>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          beforeAfter: [
                            ...draft.beforeAfter,
                            {
                              id: `ba-${Date.now()}`,
                              title: { ru: 'Новый объект в Бишкеке', ky: 'Жаңы объект', en: 'New Project' },
                              location: 'Бишкек',
                              areaSqm: 90,
                              durationDays: 70,
                              budgetKgs: 1550000,
                              beforeImage: ASSET_IMAGES.beforeApt,
                              afterImage: ASSET_IMAGES.afterApt,
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Добавить объект
                    </button>
                  </div>
                  {draft.beforeAfter.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 grid sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <input
                        type="text"
                        value={item.title.ru}
                        onChange={(e) => {
                          const list = [...draft.beforeAfter];
                          list[idx] = { ...item, title: { ...item.title, ru: e.target.value } };
                          setDraft({ ...draft, beforeAfter: list });
                        }}
                        className="sm:col-span-5 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
                      />
                      <input
                        type="number"
                        value={item.areaSqm}
                        onChange={(e) => {
                          const list = [...draft.beforeAfter];
                          list[idx] = { ...item, areaSqm: Number(e.target.value) || 80 };
                          setDraft({ ...draft, beforeAfter: list });
                        }}
                        className="sm:col-span-2 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm tabular-nums"
                      />
                      <input
                        type="number"
                        value={item.budgetKgs}
                        onChange={(e) => {
                          const list = [...draft.beforeAfter];
                          list[idx] = { ...item, budgetKgs: Number(e.target.value) || 1000000 };
                          setDraft({ ...draft, beforeAfter: list });
                        }}
                        className="sm:col-span-3 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            beforeAfter: draft.beforeAfter.filter((x) => x.id !== item.id),
                          })
                        }
                        className="sm:col-span-2 text-rose-500 text-xs font-medium inline-flex items-center justify-end gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 7. REVIEWS */}
              {activeTab === 'reviews' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Отзывы клиентов ({adminReviews.length}
                    {pendingReviews.length > 0 && `, ждут проверки: ${pendingReviews.length}`})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Новые отзывы видны на сайте только после того, как вы нажмёте «Опубликовать».
                  </p>
                  {[...pendingReviews, ...adminReviews.filter((r) => r.status !== 'pending')].map((rev) => (
                    <div
                      key={rev.id}
                      className={`p-4 rounded-2xl border flex items-start justify-between gap-4 ${
                        rev.status === 'pending'
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-white">
                          {rev.author} · {rev.rating} ★
                          {rev.status === 'pending' && (
                            <span className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                              на проверке
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{rev.projectInfo}</div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{rev.text}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                      {rev.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => void handleApproveReview(rev.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold cursor-pointer"
                        >
                          Опубликовать
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDeleteReview(rev.id)}
                        className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg cursor-pointer"
                        title="Удалить отзыв"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 8. CONTACTS */}
              {activeTab === 'contacts' && (
                <ScheduleEditor schedule={draft.schedule} onChange={(schedule) => setDraft({ ...draft, schedule })} />
              )}
              {activeTab === 'contacts' && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-500 block mb-1">Адрес шоурума (RU)</label>
                    <input
                      type="text"
                      value={draft.contacts.address.ru}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          contacts: {
                            ...draft.contacts,
                            address: { ...draft.contacts.address, ru: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Телефон</label>
                    <input
                      type="text"
                      value={draft.contacts.phone}
                      onChange={(e) =>
                        setDraft({ ...draft, contacts: { ...draft.contacts, phone: e.target.value } })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">WhatsApp (только цифры)</label>
                    <input
                      type="text"
                      value={draft.contacts.whatsapp}
                      onChange={(e) =>
                        setDraft({ ...draft, contacts: { ...draft.contacts, whatsapp: e.target.value } })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Instagram username</label>
                    <input
                      type="text"
                      value={draft.contacts.instagram}
                      onChange={(e) =>
                        setDraft({ ...draft, contacts: { ...draft.contacts, instagram: e.target.value } })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Telegram username</label>
                    <input
                      type="text"
                      value={draft.contacts.telegram}
                      onChange={(e) =>
                        setDraft({ ...draft, contacts: { ...draft.contacts, telegram: e.target.value } })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Ссылка 2ГИС</label>
                    <input
                      type="url"
                      value={draft.contacts.twoGisUrl}
                      onChange={(e) =>
                        setDraft({ ...draft, contacts: { ...draft.contacts, twoGisUrl: e.target.value } })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Ссылка Яндекс Карт</label>
                    <input
                      type="url"
                      value={draft.contacts.yandexMapsUrl}
                      onChange={(e) =>
                        setDraft({ ...draft, contacts: { ...draft.contacts, yandexMapsUrl: e.target.value } })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* 9. TELEGRAM */}
              {activeTab === 'telegram' && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 space-y-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    Уведомления о заявках в Telegram
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Статус переменных окружения:{' '}
                    <strong className={telegramConfigured ? 'text-emerald-500' : 'text-amber-500'}>
                      {telegramConfigured
                        ? 'Подключено (TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID заданы)'
                        : 'Не настроено — задайте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в настройках сервера / Vercel'}
                    </strong>
                  </p>
                  <button
                    type="button"
                    onClick={handleTelegramTest}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Отправить тестовое уведомление
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
