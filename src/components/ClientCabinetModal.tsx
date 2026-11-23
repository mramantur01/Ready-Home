import { useState } from 'react';
import {
  Building2,
  Download,
  FileCheck,
  Layers,
  Link2,
  LogOut,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  X,
} from 'lucide-react';
import type { BookingRecord, ClientProfile, Lang, SiteContent } from '../types.ts';
import { formatKgs, PROPERTY_LABELS, STATUS_LABELS, TIER_LABELS } from '../i18n.ts';
import { apiFetch, setClientToken } from '../apiClient.ts';
import { ProjectTimeline } from './ProjectTimeline.tsx';

interface ClientCabinetModalProps {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  content: SiteContent;
  profile: ClientProfile | null;
  bookings: BookingRecord[];
  authPromptNotice?: string;
  onAuthChange: (profile: ClientProfile | null, bookings: BookingRecord[]) => void;
  onRefresh: () => Promise<void>;
  onStartNewBooking: () => void;
}

function exportBookingsCsv(bookings: BookingRecord[]) {
  const headers = [
    'Номер',
    'Дата создания',
    'Объект',
    'Площадь м2',
    'Услуга',
    'Класс материалов',
    'Специалист',
    'Дата замера',
    'Сумма KGS',
    'Статус',
  ];
  const rows = bookings.map((b) => [
    b.id,
    b.createdAt.slice(0, 10),
    `"${b.complexOrDistrict.replace(/"/g, '""')}"`,
    b.areaSqm,
    `"${b.serviceName.replace(/"/g, '""')}"`,
    b.materialTier,
    `"${b.masterName.replace(/"/g, '""')}"`,
    `${b.date} ${b.time}`,
    b.totalPriceKgs,
    b.status,
  ]);
  const csv = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ready-home-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ClientCabinetModal({
  open,
  onClose,
  lang,
  content,
  profile,
  bookings,
  authPromptNotice,
  onAuthChange,
  onRefresh,
  onStartNewBooking,
}: ClientCabinetModalProps) {
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [cabinetTab, setCabinetTab] = useState<'bookings' | 'properties'>('bookings');

  // Auth form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+996 ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [existingBookingCode, setExistingBookingCode] = useState('');
  const [needBookingProof, setNeedBookingProof] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Link booking by code
  const [linkCode, setLinkCode] = useState('');
  const [linkMessage, setLinkMessage] = useState('');

  // Warranty print target
  const [certificateBooking, setCertificateBooking] = useState<BookingRecord | null>(null);

  if (!open) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await apiFetch<{
      ok?: boolean;
      token?: string;
      profile?: ClientProfile;
      bookings?: BookingRecord[];
      error?: string;
    }>('/api/account', {
      method: 'POST',
      body: JSON.stringify({ action: 'login', phone, password }),
    });
    setLoading(false);
    if (!res.ok || !res.data.profile) {
      setError(res.data.error || 'Ошибка входа.');
      return;
    }
    if (res.data.token) setClientToken(res.data.token);
    setPassword('');
    onAuthChange(res.data.profile, res.data.bookings || []);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await apiFetch<{
      ok?: boolean;
      token?: string;
      profile?: ClientProfile;
      bookings?: BookingRecord[];
      requireBookingCode?: boolean;
      error?: string;
    }>('/api/account', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        name,
        phone,
        password,
        confirmPassword,
        existingBookingCode: existingBookingCode.trim(),
      }),
    });
    setLoading(false);
    if (!res.ok || !res.data.profile) {
      if (res.data.requireBookingCode) setNeedBookingProof(true);
      setError(res.data.error || 'Ошибка регистрации.');
      return;
    }
    if (res.data.token) setClientToken(res.data.token);
    setPassword('');
    setConfirmPassword('');
    setNeedBookingProof(false);
    onAuthChange(res.data.profile, res.data.bookings || []);
  };

  const handleLogout = async () => {
    await apiFetch('/api/account', {
      method: 'POST',
      auth: 'client',
      body: JSON.stringify({ action: 'logout' }),
    });
    setClientToken(null);
    onAuthChange(null, []);
  };

  const handleLinkBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkMessage('');
    const res = await apiFetch<{ ok?: boolean; error?: string }>('/api/account', {
      method: 'POST',
      auth: 'client',
      body: JSON.stringify({ action: 'link-booking', bookingCode: linkCode.trim() }),
    });
    if (!res.ok) {
      setLinkMessage(res.data.error || 'Не удалось привязать заявку.');
      return;
    }
    setLinkCode('');
    setLinkMessage('Заявка успешно привязана к вашему кабинету.');
    await onRefresh();
  };

  // Deduplicate client properties from bookings
  const clientProperties = Array.from(
    bookings.reduce((acc, b) => {
      const key = `${b.complexOrDistrict}-${b.areaSqm}-${b.propertyType}`;
      const existing = acc.get(key);
      if (existing) {
        existing.works.push(b);
      } else {
        acc.set(key, {
          complex: b.complexOrDistrict,
          address: b.addressDetails,
          type: b.propertyType,
          areaSqm: b.areaSqm,
          roomsCount: b.roomsCount,
          works: [b],
        });
      }
      return acc;
    }, new Map<string, { complex: string; address: string; type: BookingRecord['propertyType']; areaSqm: number; roomsCount: string; works: BookingRecord[] }>()).values(),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Личный кабинет клиента READY HOME
            </h3>
            {profile && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {profile.name} · <span className="tabular-nums">{profile.phone}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {!profile ? (
            <div className="max-w-md mx-auto space-y-5">
              {authPromptNotice && (
                <div className="p-3.5 rounded-2xl bg-amber-500/12 border border-amber-500/35 text-sm text-amber-800 dark:text-amber-200">
                  {authPromptNotice}
                </div>
              )}

              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setError('');
                  }}
                  className={`py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    authTab === 'login'
                      ? 'bg-white dark:bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setError('');
                  }}
                  className={`py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    authTab === 'register'
                      ? 'bg-white dark:bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Регистрация
                </button>
              </div>

              {authTab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Номер телефона
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+996 555 123 456"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Пароль
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    {loading ? 'Проверка...' : 'Войти в кабинет'}
                  </button>
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    Забыли пароль? Позвоните нам:{' '}
                    <a href={`tel:${content.contacts.phone}`} className="text-amber-600 dark:text-amber-400 font-medium">
                      {content.contacts.phone}
                    </a>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Ваше имя
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Азамат"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Номер телефона (Кыргызстан)
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+996 555 123 456"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Пароль (от 6 симв.)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Повтор пароля
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {needBookingProof && (
                    <div>
                      <label className="block text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                        Номер существующей заявки для подтверждения (RH-XXXXXX)
                      </label>
                      <input
                        type="text"
                        required
                        value={existingBookingCode}
                        onChange={(e) => setExistingBookingCode(e.target.value.toUpperCase())}
                        placeholder="RH-123456"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-amber-500/50 text-sm text-slate-900 dark:text-white uppercase"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    {loading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Logged-in Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setCabinetTab('bookings')}
                    className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      cabinetTab === 'bookings'
                        ? 'bg-white dark:bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Мои заявки ({bookings.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCabinetTab('properties')}
                    className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      cabinetTab === 'properties'
                        ? 'bg-white dark:bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Мои объекты и 3D ({clientProperties.length + (profile.savedPresets?.length || 0)})
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onStartNewBooking}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Новая запись
                  </button>
                  <button
                    type="button"
                    onClick={() => void onRefresh()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Обновить
                  </button>
                  {bookings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => exportBookingsCsv(bookings)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      CSV
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/30 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Выйти
                  </button>
                </div>
              </div>

              {cabinetTab === 'bookings' ? (
                <div className="space-y-4">
                  {bookings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/15 p-8 text-center">
                      <Building2 className="w-9 h-9 text-amber-500 mx-auto mb-2.5" />
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        У вас пока нет активных заявок на ремонт
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Создайте 3D-визуализацию квартиры или запишитесь на бесплатный выезд инженера-замерщика в Бишкеке.
                      </p>
                      <button
                        type="button"
                        onClick={onStartNewBooking}
                        className="mt-4 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm cursor-pointer"
                      >
                        Оформить первую заявку
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map((b) => (
                        <div
                          key={b.id}
                          className="rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 p-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                {b.id}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {STATUS_LABELS[b.status][lang]}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">
                                {b.date ? `${b.date} в ${b.time}` : 'Ждёт звонка студии'}
                              </span>
                            </div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {b.serviceName} — {b.complexOrDistrict} ({b.areaSqm} м²)
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Специалист: {b.masterName} · Материалы: {TIER_LABELS[b.materialTier][lang]} · Оплата: {b.paymentMethod}
                            </div>
                            {b.visual3D && (
                              <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-0.5">
                                <Layers className="w-3.5 h-3.5" />
                                Приложен 3D-проект ({b.visual3D.roomType}, {b.visual3D.stylePreset})
                              </div>
                            )}
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                            <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                              {formatKgs(b.totalPriceKgs)}
                            </div>
                            {b.status === 'completed' && (
                              <button
                                type="button"
                                onClick={() => setCertificateBooking(b)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 cursor-pointer"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                                Гарантийный сертификат
                              </button>
                            )}
                          </div>
                          </div>
                          <ProjectTimeline
                            booking={b}
                            onUpdated={(nb) => onAuthChange(profile, bookings.map((x) => (x.id === nb.id ? nb : x)))}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Link booking by code form */}
                  <form
                    onSubmit={handleLinkBooking}
                    className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
                      <Link2 className="w-4 h-4 text-amber-500" />
                      Добавить заявку по номеру:
                    </div>
                    <input
                      type="text"
                      value={linkCode}
                      onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                      placeholder="RH-123456"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white uppercase"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white/10 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white/20 cursor-pointer"
                    >
                      Привязать
                    </button>
                  </form>
                  {linkMessage && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">{linkMessage}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                      Ваши квартиры и дома
                    </h4>
                    {clientProperties.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Здесь появятся ваши объекты недвижимости и история выполненных ремонтных работ.
                      </p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {clientProperties.map((prop, i) => (
                          <div
                            key={i}
                            className="rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 p-4"
                          >
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {prop.complex}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {PROPERTY_LABELS[prop.type][lang]} · {prop.areaSqm} м² · {prop.roomsCount}
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-white/10 space-y-1">
                              {prop.works.map((w) => (
                                <div key={w.id} className="text-xs flex justify-between text-slate-600 dark:text-slate-300">
                                  <span>{w.serviceName}</span>
                                  <span className="text-amber-600 dark:text-amber-400">{STATUS_LABELS[w.status][lang]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {profile.savedEstimates && profile.savedEstimates.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                        Сохранённые сметы
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {profile.savedEstimates.map((est) => (
                          <div
                            key={est.id}
                            className="rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 p-4"
                          >
                            <div className="font-semibold text-sm text-slate-900 dark:text-white">{est.label}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {new Date(est.createdAt).toLocaleDateString('ru-RU')}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                {formatKgs(est.totalKgs)}
                              </span>
                              <a
                                href={`#estimate=${est.code}`}
                                onClick={onClose}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950"
                              >
                                Открыть смету
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.savedPresets && profile.savedPresets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                        Сохранённые 3D-визуализации ремонта
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {profile.savedPresets.map((pr) => (
                          <div
                            key={pr.id}
                            className="rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 p-4"
                          >
                            <div className="font-semibold text-sm text-slate-900 dark:text-white">
                              {pr.label}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Комната: {pr.config.roomType} · Стены: {pr.config.wallFinish} · Пол: {pr.config.floorFinish}
                            </div>
                            <div className="mt-2 text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                              {formatKgs(pr.config.estimatedPriceKgs)} ({pr.config.areaSqm} м²)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Printable Official Warranty Certificate Modal */}
      {certificateBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80">
          <div className="w-full max-w-xl rounded-3xl bg-white text-slate-900 p-8 shadow-2xl space-y-6">
            <div id="warranty-print-area" className="space-y-5">
              <div className="flex items-center justify-between border-b-2 border-amber-500 pb-4">
                <div>
                  <div className="font-display text-2xl font-extrabold tracking-tight text-[#131d33]">
                    READY HOME
                  </div>
                  <div className="text-xs text-slate-500">Студия ремонта квартир и домов · Бишкек</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-amber-600 font-bold">
                    Гарантийный сертификат
                  </div>
                  <div className="text-sm font-bold tabular-nums">{certificateBooking.id}</div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  Настоящий сертификат подтверждает официальную гарантию студии <strong>READY HOME</strong> сроком{' '}
                  <strong>{certificateBooking.warrantyYears} лет</strong> на выполненные ремонтно-отделочные и инженерные работы.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Заказчик</span>
                    <strong className="text-sm">{certificateBooking.clientName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Телефон</span>
                    <strong className="text-sm tabular-nums">{certificateBooking.phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Объект</span>
                    <strong className="text-sm">
                      {certificateBooking.complexOrDistrict}, {certificateBooking.areaSqm} м²
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Пакет работ</span>
                    <strong className="text-sm">{certificateBooking.serviceName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Ответственный инженер</span>
                    <strong className="text-sm">{certificateBooking.masterName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Дата сдачи</span>
                    <strong className="text-sm tabular-nums">{certificateBooking.date}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {content.contacts.phone}
                </span>
                <span>{content.contacts.address.ru}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCertificateBooking(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 cursor-pointer"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Распечатать сертификат
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
