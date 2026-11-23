import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Bell,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Phone,
  ShieldCheck,
  Star,
  Sun,
  User,
  X,
} from 'lucide-react';
import type {
  BookingDraft,
  BookingRecord,
  ClientProfile,
  Lang,
  ReviewItem,
  ServiceCategory,
  SiteContent,
  Visual3DConfig,
} from './types.ts';
import { DEFAULT_REVIEWS, DEFAULT_SITE_CONTENT } from './data/defaultContent.ts';
import { CATEGORY_LABELS, formatKgs, STATUS_LABELS, tLoc, UI_COPY } from './i18n.ts';
import { apiFetch } from './apiClient.ts';
import { SmartImage } from './components/SmartImage.tsx';
import { LazyStudio3D } from './components/LazyStudio3D.tsx';
import { CalculatorSection } from './components/CalculatorSection.tsx';
import { EstimateSection } from './components/EstimateSection.tsx';
import { BeforeAfterSlider } from './components/BeforeAfterSlider.tsx';
import { BookingModal } from './components/BookingModal.tsx';
import { ClientCabinetModal } from './components/ClientCabinetModal.tsx';
import { AdminPanelModal } from './components/AdminPanelModal.tsx';
import { FloatingWhatsApp } from './components/FloatingWhatsApp.tsx';

export default function App() {
  const [lang, setLang] = useState<Lang>('ru');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [reviews, setReviews] = useState<ReviewItem[]>(DEFAULT_REVIEWS);

  // Header UI state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Hero slider state
  const [slideIdx, setSlideIdx] = useState(0);

  // Services category filter
  const [serviceCat, setServiceCat] = useState<'all' | ServiceCategory>('all');

  // Promo copy feedback
  const [copiedCode, setCopiedCode] = useState<string>('');

  // FAQ open index
  const [openFaqId, setOpenFaqId] = useState<string | null>(DEFAULT_SITE_CONTENT.faqs[0]?.id || null);

  // Reviews form state
  const [revAuthor, setRevAuthor] = useState('');
  const [revProject, setRevProject] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revText, setRevText] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);
  const [revMessage, setRevMessage] = useState('');

  // Client auth & bookings state
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [clientBookings, setClientBookings] = useState<BookingRecord[]>([]);

  // Modals & intent handoff (opening booking after login)
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const [authPromptNotice, setAuthPromptNotice] = useState('');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>({});
  const [pendingBookingAfterLogin, setPendingBookingAfterLogin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const copy = UI_COPY[lang];

  // Sync Tailwind v4 dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  // Load initial site content, reviews, and existing client session
  const loadAccount = useCallback(async () => {
    const res = await apiFetch<{
      authenticated?: boolean;
      profile?: ClientProfile;
      bookings?: BookingRecord[];
    }>('/api/account', { auth: 'client' });
    if (res.ok && res.data.authenticated && res.data.profile) {
      setProfile(res.data.profile);
      setClientBookings(res.data.bookings || []);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    const res = await apiFetch<{ reviews?: ReviewItem[] }>('/api/reviews');
    if (res.ok && Array.isArray(res.data.reviews)) {
      setReviews(res.data.reviews);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const cRes = await apiFetch<SiteContent>('/api/content');
      if (cRes.ok && cRes.data?.heroSlides) {
        setContent(cRes.data);
      }
    })();
    void loadReviews();
    void loadAccount();
  }, [loadAccount, loadReviews]);

  // Admin panel triggers: #admin hash OR Alt+A
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin') {
        setAdminOpen(true);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key.toLowerCase() === 'a' || e.code === 'KeyA')) {
        e.preventDefault();
        setAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('hashchange', checkHash);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Hero slider auto-advance
  useEffect(() => {
    if (content.heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlideIdx((i) => (i + 1) % content.heroSlides.length);
    }, Math.max(2500, content.heroSpeedMs || 6500));
    return () => clearInterval(timer);
  }, [content.heroSlides.length, content.heroSpeedMs]);

  const currentSlide = content.heroSlides[slideIdx % content.heroSlides.length] || content.heroSlides[0];

  // Unified Booking Entry: enforces login first, then immediately launches booking wizard
  const requestBooking = (draft: BookingDraft = {}) => {
    setBookingDraft(draft);
    if (!profile) {
      setAuthPromptNotice(copy.authNotice);
      setPendingBookingAfterLogin(true);
      setCabinetOpen(true);
      return;
    }
    setBookingOpen(true);
  };

  const handleClientAuthChange = (nextProfile: ClientProfile | null, nextBookings: BookingRecord[]) => {
    setProfile(nextProfile);
    setClientBookings(nextBookings);
    if (nextProfile && pendingBookingAfterLogin) {
      setPendingBookingAfterLogin(false);
      setAuthPromptNotice('');
      setCabinetOpen(false);
      setBookingOpen(true);
    }
  };

  const handleSaveEstimate = async (data: { code: string; label: string; totalKgs: number }): Promise<boolean> => {
    if (!profile) {
      setAuthPromptNotice('Войдите или зарегистрируйтесь, чтобы сохранить смету в личный кабинет.');
      setPendingBookingAfterLogin(false);
      setCabinetOpen(true);
      return false;
    }
    const res = await apiFetch<{ ok?: boolean; savedEstimates?: ClientProfile['savedEstimates'] }>('/api/account', {
      method: 'POST',
      auth: 'client',
      body: JSON.stringify({ action: 'save-estimate', ...data }),
    });
    if (res.ok && res.data.savedEstimates) {
      setProfile((prev) => (prev ? { ...prev, savedEstimates: res.data.savedEstimates } : prev));
      return true;
    }
    return false;
  };

  const handleSave3DPreset = async (cfg: Visual3DConfig): Promise<boolean> => {
    if (!profile) {
      setAuthPromptNotice('Войдите или зарегистрируйтесь, чтобы сохранить 3D-проект в личный кабинет.');
      setPendingBookingAfterLogin(false);
      setCabinetOpen(true);
      return false;
    }
    const res = await apiFetch<{ ok?: boolean; savedPresets?: ClientProfile['savedPresets'] }>(
      '/api/account',
      {
        method: 'POST',
        auth: 'client',
        body: JSON.stringify({
          action: 'save-preset',
          label: `3D: ${cfg.roomType} · ${cfg.areaSqm} м²`,
          config: cfg,
        }),
      },
    );
    if (res.ok && res.data.savedPresets) {
      setProfile((prev) => (prev ? { ...prev, savedPresets: res.data.savedPresets! } : prev));
      return true;
    }
    return false;
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevMessage('');
    setRevSubmitting(true);
    const res = await apiFetch<{ ok?: boolean; error?: string }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        author: revAuthor,
        projectInfo: revProject,
        rating: revRating,
        text: revText,
      }),
    });
    setRevSubmitting(false);
    if (!res.ok) {
      setRevMessage(res.data.error || 'Не удалось опубликовать отзыв.');
      return;
    }
    setRevAuthor('');
    setRevProject('');
    setRevText('');
    setRevRating(5);
    setRevMessage(copy.reviews.thanks);
    await loadReviews();
  };

  const filteredServices = useMemo(() => {
    if (serviceCat === 'all') return content.services;
    return content.services.filter((s) => s.category === serviceCat);
  }, [content.services, serviceCat]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return '4.9';
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const tickerText = tLoc(content.tickerText, lang);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#131d33] dark:text-slate-100 transition-colors duration-200">
      {/* 1. ANNOUNCEMENT TICKER BAR */}
      <div className="bg-amber-500 text-slate-950 text-xs font-semibold py-2 overflow-hidden">
        <div className="animate-marquee">
          {[0, 1, 2, 3].map((idx) => (
            <span key={idx} className="mx-8 whitespace-nowrap">
              {tickerText}
            </span>
          ))}
        </div>
      </div>

      {/* 2. STICKY HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#131d33]/95 border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#"
            className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-slate-950 dark:text-white whitespace-nowrap shrink-0"
          >
            READY <span className="text-amber-500">HOME</span>
          </a>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#studio3d" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">
              {copy.nav.studio3d}
            </a>
            <a href="#services" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">
              {copy.nav.services}
            </a>
            <a href="#calculator" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">
              {copy.nav.calculator}
            </a>
            <a href="#estimate" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">
              {copy.nav.estimate}
            </a>
            <a href="#portfolio" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">
              {copy.nav.portfolio}
            </a>
            <a href="#contacts" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">
              {copy.nav.contacts}
            </a>
          </nav>

          {/* Zone 3: Controls & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language switcher */}
            <div className="hidden sm:inline-flex items-center rounded-lg border border-slate-200 dark:border-white/10 p-0.5 text-xs font-semibold">
              {(['ru', 'ky', 'en'] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 rounded-md uppercase transition-colors cursor-pointer ${
                    lang === l
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label="Переключить тему"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Уведомления и акции"
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/15 shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Уведомления READY HOME
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {profile && clientBookings.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs">
                      <div className="font-semibold text-amber-700 dark:text-amber-300">
                        Заявка {clientBookings[0].id}: {STATUS_LABELS[clientBookings[0].status][lang]}
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                        Замер {clientBookings[0].date} в {clientBookings[0].time}
                      </div>
                    </div>
                  )}
                  {content.promos.slice(0, 2).map((p) => (
                    <div key={p.id} className="text-xs border-t border-slate-200 dark:border-white/10 pt-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{tLoc(p.title, lang)}</div>
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                        Промокод: <strong className="text-amber-600 dark:text-amber-400">{p.code}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Client Cabinet Button */}
            <button
              type="button"
              onClick={() => {
                setAuthPromptNotice('');
                setPendingBookingAfterLogin(false);
                setCabinetOpen(true);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-amber-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-amber-500" />
              <span>{profile ? profile.name.split(' ')[0] : copy.nav.cabinet}</span>
            </button>

            {/* Primary CTA Button */}
            <button
              type="button"
              onClick={() => requestBooking({})}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copy.nav.book}
            </button>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Меню"
              className="lg:hidden p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#131d33] px-4 py-4 space-y-3">
            <div className="flex flex-col gap-2 text-sm font-medium">
              <a href="#studio3d" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                {copy.nav.studio3d}
              </a>
              <a href="#services" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                {copy.nav.services}
              </a>
              <a href="#calculator" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                {copy.nav.calculator}
              </a>
              <a href="#estimate" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                {copy.nav.estimate}
              </a>
              <a href="#portfolio" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                {copy.nav.portfolio}
              </a>
              <a href="#contacts" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                {copy.nav.contacts}
              </a>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10">
              <div className="inline-flex gap-1">
                {(['ru', 'ky', 'en'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase ${
                      lang === l ? 'bg-amber-500 text-slate-950' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCabinetOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 text-xs font-semibold"
              >
                <User className="w-3.5 h-3.5 text-amber-500" />
                {profile ? profile.name : copy.nav.cabinet}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 3. FULL-WIDTH HERO SLIDER */}
      <section className="relative overflow-hidden bg-[#0e172a] text-white">
        <div className="relative min-h-[600px] lg:min-h-[660px] flex items-center">
          {/* Background Slide Image + Measured Contrast Scrim */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0.25 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.25 }}
              transition={{ duration: 0.55 }}
              className="absolute inset-0"
            >
              <SmartImage
                src={currentSlide.image}
                alt={tLoc(currentSlide.title, lang)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0c1425]/92 via-[#0c1425]/72 to-[#0c1425]/40" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#131d33] via-transparent to-black/20" />
            </motion.div>
          </AnimatePresence>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
            <div
              className={`max-w-2xl ${
                currentSlide.textAlign === 'right' ? 'ml-auto text-right' : ''
              }`}
            >
              <p className="text-sm font-medium text-amber-400 mb-3">
                READY HOME · Бишкек, Кыргызстан
              </p>
              <h1
                className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.08] text-white"
                style={{ textWrap: 'balance' }}
              >
                {tLoc(currentSlide.title, lang)}
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl">
                {tLoc(currentSlide.subtitle, lang)}
              </p>

              {/* 4 Advantages */}
              <div className="mt-7 grid sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-slate-200">
                {[copy.hero.adv1, copy.hero.adv2, copy.hero.adv3, copy.hero.adv4].map((adv) => (
                  <div key={adv} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{adv}</span>
                  </div>
                ))}
              </div>

              {/* Hero CTAs */}
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  href="#studio3d"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap"
                >
                  <Box className="w-4 h-4" />
                  {copy.hero.cta3d}
                </a>
                <button
                  type="button"
                  onClick={() => requestBooking({})}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/12 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm transition-colors whitespace-nowrap cursor-pointer"
                >
                  {copy.hero.ctaBook}
                </button>
                <a
                  href="#calculator"
                  className="px-4 py-3.5 rounded-xl border border-white/15 hover:border-amber-400 text-slate-100 text-sm font-medium transition-colors whitespace-nowrap"
                >
                  {copy.hero.ctaCalc}
                </a>
                <a
                  href={`https://wa.me/${content.contacts.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="p-3.5 rounded-xl bg-white/10 hover:bg-emerald-600 text-white transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href={`https://instagram.com/${content.contacts.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="p-3.5 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-white transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Slider Controls */}
            {content.heroSlides.length > 1 && (
              <div className="mt-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {content.heroSlides.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSlideIdx(idx)}
                      aria-label={`Слайд ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === slideIdx ? 'w-10 bg-amber-500' : 'w-4 bg-white/30 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSlideIdx((i) => (i - 1 + content.heroSlides.length) % content.heroSlides.length)
                    }
                    aria-label="Предыдущий слайд"
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlideIdx((i) => (i + 1) % content.heroSlides.length)}
                    aria-label="Следующий слайд"
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full-Width 4-Column KPI Strip Below Hero */}
        <div className="border-t border-white/10 bg-[#0e172a]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              [copy.hero.stat1Val, copy.hero.stat1Lbl],
              [copy.hero.stat2Val, copy.hero.stat2Lbl],
              [copy.hero.stat3Val, copy.hero.stat3Lbl],
              [avgRating + ' ★', copy.hero.stat4Lbl],
            ].map(([val, lbl]) => (
              <div key={lbl}>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 tabular-nums">
                  {val}
                </div>
                <div className="text-xs sm:text-sm text-slate-300 mt-0.5">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE 3D VISUAL RENOVATION STUDIO */}
      <LazyStudio3D
        lang={lang}
        isLoggedIn={Boolean(profile)}
        onSavePreset={handleSave3DPreset}
        onBookWith3D={(visual3D) =>
          requestBooking({
            areaSqm: visual3D.areaSqm,
            materialTier: visual3D.tier,
            serviceId: content.services[0]?.id,
            visual3D,
          })
        }
      />

      {/* 5. SERVICES WITH CATEGORY FILTERS */}
      <section id="services" className="py-16 md:py-24 scroll-mt-20 border-t border-slate-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                {copy.services.kicker}
              </p>
              <h2
                className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
                style={{ textWrap: 'balance' }}
              >
                {copy.services.title}
              </h2>
              <p className="mt-3 text-slate-600 dark:text-slate-300">{copy.services.subtitle}</p>
            </div>

            {/* Functional Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-[#0e172a] border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setServiceCat('all')}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  serviceCat === 'all'
                    ? 'bg-white dark:bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {copy.services.all}
              </button>
              {(['turnkey', 'design3d', 'wetrooms', 'engineering'] as ServiceCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setServiceCat(cat)}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    serviceCat === cat
                      ? 'bg-white dark:bg-amber-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {CATEGORY_LABELS[cat][lang]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((srv) => (
              <article
                key={srv.id}
                className="rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div>
                  <div className="aspect-[4/3] overflow-hidden bg-slate-900">
                    <SmartImage
                      src={srv.image}
                      alt={tLoc(srv.name, lang)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span>{CATEGORY_LABELS[srv.category][lang]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {copy.services.warranty} {srv.warrantyYears} {copy.services.years}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{srv.durationDays}</span>
                    </div>
                    <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white leading-snug">
                      {tLoc(srv.name, lang)}
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {tLoc(srv.description, lang)}
                    </p>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      {copy.services.materials}: {srv.materials}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{copy.services.from}</div>
                    <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatKgs(srv.pricePerSqm)}/м²
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestBooking({ serviceId: srv.id })}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>{copy.services.select}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. PRICE CALCULATOR */}
      <CalculatorSection
        services={content.services}
        lang={lang}
        onBookWithParams={(draft) => requestBooking(draft)}
      />

      {/* 6b. ITEMIZED ESTIMATE BY RENOVATION STAGE */}
      <EstimateSection
        priceList={content.priceList}
        finishCatalog={content.finishCatalog}
        installment={content.installment}
        lang={lang}
        contacts={content.contacts}
        onBook={(draft) => requestBooking(draft)}
        onSaveEstimate={handleSaveEstimate}
      />

      {/* 7. BEFORE / AFTER GALLERY */}
      <BeforeAfterSlider items={content.beforeAfter} lang={lang} />

      {/* 8. PROMOTIONS */}
      <section id="promos" className="py-16 md:py-24 scroll-mt-20 border-t border-slate-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
              {copy.promos.kicker}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {copy.promos.title}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {content.promos.map((promo) => (
              <div
                key={promo.id}
                className="rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {tLoc(promo.badge, lang)}
                    </span>
                    <span className="tabular-nums">
                      {copy.promos.until} {promo.expiresAt}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white leading-snug">
                    {tLoc(promo.title, lang)}
                  </h3>
                  <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {tLoc(promo.description, lang)}
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 px-3.5 py-2">
                    <span className="text-xs text-slate-500">{copy.promos.codeLabel}:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                        {promo.code}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard?.writeText(promo.code);
                          setCopiedCode(promo.code);
                          setTimeout(() => setCopiedCode(''), 2000);
                        }}
                        className="text-slate-500 hover:text-amber-500 cursor-pointer"
                        title={copy.promos.copy}
                      >
                        {copiedCode === promo.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestBooking({ promoCode: promo.code })}
                    className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    {copy.promos.apply}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. INSTAGRAM FEED (Manual CMS posts) */}
      <section id="instagram" className="py-16 md:py-20 border-t border-slate-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1.5">
                {copy.instagram.kicker}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {copy.instagram.title}
              </h2>
            </div>
            <a
              href={`https://instagram.com/${content.contacts.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap"
            >
              <Instagram className="w-4 h-4" />
              {copy.instagram.follow}
              {content.contacts.instagram}
            </a>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {content.instagramPosts.map((post) => (
              <a
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl overflow-hidden bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 flex flex-col"
              >
                <div className="aspect-square overflow-hidden bg-slate-900">
                  <SmartImage
                    src={post.image}
                    alt={tLoc(post.caption, lang)}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {tLoc(post.caption, lang)}
                  </p>
                  <div className="mt-3 text-xs text-slate-400 flex items-center justify-between tabular-nums">
                    <span>{post.date}</span>
                    <span>♥ {post.likes}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 10. MASTERS / TEAM */}
      <section id="masters" className="py-16 md:py-24 border-t border-slate-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
              {copy.masters.kicker}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {copy.masters.title}
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">{copy.masters.subtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {content.masters.map((m) => (
              <div
                key={m.id}
                className="rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-square overflow-hidden bg-slate-900">
                    <SmartImage
                      src={m.photo}
                      alt={m.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {tLoc(m.role, lang)}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      {m.name}
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {tLoc(m.specialization, lang)}
                    </p>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {copy.masters.exp}: <strong className="text-slate-900 dark:text-white">{m.experienceYears} л.</strong> ·{' '}
                    {copy.masters.projects}: <strong className="text-slate-900 dark:text-white">{m.projectsCount}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestBooking({})}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    {copy.masters.bookMaster}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. REVIEWS & SUBMIT REVIEW FORM */}
      <section id="reviews" className="py-16 md:py-24 border-t border-slate-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                {copy.reviews.kicker}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                {copy.reviews.title}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-amber-500 font-bold text-lg tabular-nums">
              <Star className="w-5 h-5 fill-amber-500" />
              <span>{avgRating} / 5.0</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                ({reviews.length})
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 p-6"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{rev.author}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{rev.projectInfo}</div>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="w-4 h-4 fill-amber-500" />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rev.text}
                  </p>
                  <div className="mt-3 text-xs text-slate-400 tabular-nums">{rev.createdAt}</div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleReviewSubmit}
              className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 p-6 sm:p-8 space-y-4"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {copy.reviews.leaveTitle}
              </h3>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRevRating(star)}
                    aria-label={`Оценка ${star}`}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= revRating ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <input
                type="text"
                required
                minLength={2}
                value={revAuthor}
                onChange={(e) => setRevAuthor(e.target.value)}
                placeholder={copy.reviews.namePlaceholder}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={revProject}
                onChange={(e) => setRevProject(e.target.value)}
                placeholder={copy.reviews.projectPlaceholder}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
              />
              <textarea
                rows={4}
                required
                minLength={10}
                value={revText}
                onChange={(e) => setRevText(e.target.value)}
                placeholder={copy.reviews.textPlaceholder}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
              />
              {revMessage && (
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{revMessage}</p>
              )}
              <button
                type="submit"
                disabled={revSubmitting}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
              >
                {revSubmitting ? copy.reviews.submitting : copy.reviews.submit}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 12. FAQ ACCORDION */}
      <section id="faq" className="py-16 md:py-24 border-t border-slate-200/80 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
              {copy.faq.kicker}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {copy.faq.title}
            </h2>
          </div>

          <div className="space-y-3">
            {content.faqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
                      {tLoc(faq.question, lang)}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-amber-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {tLoc(faq.answer, lang)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 13. CONTACTS & BISHKEK MAP */}
      <section id="contacts" className="py-16 md:py-24 scroll-mt-20 border-t border-slate-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
              {copy.contacts.kicker}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {copy.contacts.title}
            </h2>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div className="flex items-start gap-3.5">
                  <MapPin className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{copy.contacts.address}</div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {tLoc(content.contacts.address, lang)}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3.5">
                  <Phone className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{copy.contacts.phone}</div>
                    <a
                      href={`tel:${content.contacts.phone}`}
                      className="font-bold text-lg text-slate-900 dark:text-white hover:text-amber-500 tabular-nums mt-0.5 block"
                    >
                      {content.contacts.phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3.5">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{copy.contacts.hours}</div>
                    <div className="font-medium text-slate-900 dark:text-white mt-0.5">
                      {tLoc(content.contacts.workHours, lang)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <a
                  href={content.contacts.twoGisUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  <span>{copy.contacts.open2gis}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={content.contacts.yandexMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-amber-500 font-semibold text-xs transition-colors"
                >
                  <span>{copy.contacts.openYandex}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Interactive Bishkek Showroom Map Card (Zero broken external map iframe dependency) */}
            <div className="lg:col-span-7 rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-[#0e172a] relative min-h-[320px] flex items-center justify-center p-6">
              <svg
                viewBox="0 0 800 420"
                className="absolute inset-0 w-full h-full opacity-35"
                aria-hidden="true"
              >
                <defs>
                  <pattern id="cityGrid" width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#64748b" strokeWidth="0.7" />
                  </pattern>
                </defs>
                <rect width="800" height="420" fill="url(#cityGrid)" />
                <path d="M 0 210 L 800 210" stroke="#f59e0b" strokeWidth="4" strokeOpacity="0.55" />
                <path d="M 410 0 L 410 420" stroke="#f59e0b" strokeWidth="4" strokeOpacity="0.55" />
                <path d="M 0 115 L 800 135" stroke="#94a3b8" strokeWidth="2" />
                <path d="M 0 320 L 800 300" stroke="#94a3b8" strokeWidth="2" />
                <text x="425" y="40" fill="#cbd5e1" fontSize="13" fontFamily="sans-serif">
                  ул. Байтик Баатыра
                </text>
                <text x="45" y="198" fill="#cbd5e1" fontSize="13" fontFamily="sans-serif">
                  Южная магистраль / ул. А. Токомбаева
                </text>
              </svg>

              <div className="relative z-10 rounded-2xl bg-[#131d33]/95 border border-amber-500/40 px-6 py-5 text-center max-w-md shadow-2xl">
                <div className="w-11 h-11 mx-auto rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center mb-3">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="font-display text-lg font-bold text-white">
                  Шоурум READY HOME · Бишкек
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {tLoc(content.contacts.address, lang)}
                </p>
                <p className="text-xs text-amber-400 mt-2">
                  Образцы керамогранита, паркета, декоративных штукатурок и 3D-разбор вашей планировки
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 14. FOOTER */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0e172a] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="font-display text-xl font-extrabold text-slate-950 dark:text-white">
              READY <span className="text-amber-500">HOME</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Студия ремонта квартир и домов под ключ в Бишкеке · © {new Date().getFullYear()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <a href="#studio3d" className="hover:text-amber-500">3D-Ремонт</a>
            <a href="#services" className="hover:text-amber-500">Услуги</a>
            <a href="#calculator" className="hover:text-amber-500">Калькулятор</a>
            <a href="#portfolio" className="hover:text-amber-500">До / После</a>
            <a href="#contacts" className="hover:text-amber-500">Контакты</a>
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-500 cursor-pointer"
              title="Админ-панель (Alt+A)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>
        </div>
      </footer>

      {/* 15. FLOATING WHATSAPP WIDGET */}
      <FloatingWhatsApp contacts={content.contacts} onOpenBooking={() => requestBooking({})} />

      {/* MODALS */}
      {profile && bookingOpen && (
        <BookingModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          content={content}
          lang={lang}
          profile={profile}
          draft={bookingDraft}
          onSuccess={(newBooking) => setClientBookings((prev) => [newBooking, ...prev])}
          onOpenCabinet={() => setCabinetOpen(true)}
        />
      )}

      <ClientCabinetModal
        open={cabinetOpen}
        onClose={() => {
          setCabinetOpen(false);
          setPendingBookingAfterLogin(false);
        }}
        lang={lang}
        content={content}
        profile={profile}
        bookings={clientBookings}
        authPromptNotice={authPromptNotice}
        onAuthChange={handleClientAuthChange}
        onRefresh={loadAccount}
        onStartNewBooking={() => {
          setCabinetOpen(false);
          requestBooking({});
        }}
      />

      <AdminPanelModal
        open={adminOpen}
        onClose={() => {
          setAdminOpen(false);
          if (window.location.hash === '#admin') {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }}
        content={content}
        reviews={reviews}
        onContentSaved={(next) => setContent(next)}
        onReviewsChanged={loadReviews}
      />
    </div>
  );
}
