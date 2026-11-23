import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Calculator, ChevronLeft, ChevronRight, Phone, ShieldCheck, Ruler, FileText, Star } from 'lucide-react';
import type { Lang, SiteContent } from '../types.ts';
import { computeWorkEstimate, defaultSelections, DEFAULT_APARTMENT } from '../data/workCatalog.ts';
import { formatKgs, tLoc } from '../i18n.ts';
import { SmartImage } from './SmartImage.tsx';

const COPY = {
  ru: {
    kicker: 'Ремонт квартир и домов в Бишкеке',
    estimate: 'Рассчитать смету',
    call: 'Перезвоните мне',
    chips: ['Бесплатный замер', 'Договор и фиксированная смета', 'Гарантия по договору'],
    badgeTitle: '2-комн, 64 м², «Комфорт»',
    badgeFrom: 'под ключ ≈',
    rating: 'оценка клиентов',
  },
  ky: {
    kicker: 'Бишкекте батир жана үй оңдоо',
    estimate: 'Сметаны эсептөө',
    call: 'Мага чалыңыз',
    chips: ['Акысыз өлчөө', 'Келишим жана бекитилген смета', 'Келишим боюнча кепилдик'],
    badgeTitle: '2-бөлмө, 64 м², «Комфорт»',
    badgeFrom: 'ачкыч менен ≈',
    rating: 'кардарлардын баасы',
  },
  en: {
    kicker: 'Apartment & house renovation in Bishkek',
    estimate: 'Get an estimate',
    call: 'Call me back',
    chips: ['Free measurement', 'Contract with a fixed estimate', 'Warranty in the contract'],
    badgeTitle: '2-room, 64 m², Comfort',
    badgeFrom: 'turnkey ≈',
    rating: 'client rating',
  },
} as const;

const CHIP_ICONS = [Ruler, FileText, ShieldCheck];

interface HeroCompactProps {
  content: SiteContent;
  lang: Lang;
  slideIdx: number;
  setSlideIdx: (fn: (i: number) => number) => void;
  avgRating: string;
  onCallMe: () => void;
}

// Compact first screen: text + two actions on the left, photo card with a live price example on the right.
// On phones: a short photo strip, heading, and full-width buttons — everything fits in one screen.
export function HeroCompact({ content, lang, slideIdx, setSlideIdx, avgRating, onCallMe }: HeroCompactProps) {
  const copy = COPY[lang];
  const slides = content.heroSlides;
  const slide = slides[slideIdx % slides.length] || slides[0];

  // Example price from the studio's own price list, so it always matches the estimate below.
  const example = useMemo(
    () => computeWorkEstimate(content.priceList, DEFAULT_APARTMENT, defaultSelections(content.priceList, DEFAULT_APARTMENT)),
    [content.priceList],
  );

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0c1425] to-[#131d33] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-8 lg:py-14 grid lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* Photo card (first on phones, right on desktop) */}
        <div className="lg:col-span-6 lg:order-2 relative">
          <div className="relative h-44 sm:h-64 lg:h-[420px] rounded-3xl overflow-hidden ring-1 ring-white/10">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide?.id}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.3 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                {slide && <SmartImage src={slide.image} alt={tLoc(slide.title, lang)} className="w-full h-full object-cover" />}
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* live price example */}
            <a
              href="#estimate"
              className="absolute left-3 bottom-3 sm:left-4 sm:bottom-4 rounded-2xl bg-white/95 text-slate-900 px-3.5 py-2.5 shadow-xl hover:bg-white"
            >
              <div className="text-[11px] text-slate-500 leading-tight">{copy.badgeTitle}</div>
              <div className="text-base sm:text-lg font-extrabold tabular-nums leading-tight">
                <span className="text-xs font-medium text-slate-500 mr-1">{copy.badgeFrom}</span>
                {formatKgs(Math.round(example.totalKgs / 1000) * 1000)}
              </div>
            </a>

            {slides.length > 1 && (
              <div className="absolute right-3 bottom-3 sm:right-4 sm:bottom-4 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSlideIdx((i) => (i - 1 + slides.length) % slides.length)}
                  aria-label="Предыдущее фото"
                  className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSlideIdx((i) => (i + 1) % slides.length)}
                  aria-label="Следующее фото"
                  className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Text + actions */}
        <div className="lg:col-span-6 lg:order-1">
          <p className="text-xs sm:text-sm font-semibold text-amber-400 mb-2">{copy.kicker}</p>
          <h1
            className="text-[26px] leading-[1.15] sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-white"
            style={{ textWrap: 'balance' }}
          >
            {slide ? tLoc(slide.title, lang) : 'READY HOME'}
          </h1>
          {slide && (
            <p className="mt-3 text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-xl">
              {tLoc(slide.subtitle, lang)}
            </p>
          )}

          <div className="mt-5 grid grid-cols-1 sm:flex sm:flex-wrap gap-2.5">
            <a
              href="#estimate"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors"
            >
              <Calculator className="w-4 h-4" />
              {copy.estimate}
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onCallMe}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              {copy.call}
            </button>
          </div>

          <ul className="mt-5 flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1">
            {copy.chips.map((c, i) => {
              const Icon = CHIP_ICONS[i];
              return (
                <li
                  key={c}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-200"
                >
                  <Icon className="w-3.5 h-3.5 text-amber-400" />
                  {c}
                </li>
              );
            })}
            <li className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-200">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {avgRating} — {copy.rating}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
