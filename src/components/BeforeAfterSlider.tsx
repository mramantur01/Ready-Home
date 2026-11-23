import { useRef, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';
import type { BeforeAfterItem, Lang } from '../types.ts';
import { formatKgs, tLoc, UI_COPY } from '../i18n.ts';
import { SmartImage } from './SmartImage.tsx';

interface BeforeAfterSliderProps {
  items: BeforeAfterItem[];
  lang: Lang;
}

export function BeforeAfterSlider({ items, lang }: BeforeAfterSliderProps) {
  const copy = UI_COPY[lang].portfolio;
  const [activeIdx, setActiveIdx] = useState(0);
  const [percent, setPercent] = useState(50);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const current = items[activeIdx] || items[0];
  if (!current) return null;

  const updateFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPercent(Math.max(4, Math.min(96, next)));
  };

  return (
    <section id="portfolio" className="py-16 md:py-24 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
              {copy.kicker}
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
              style={{ textWrap: 'balance' }}
            >
              {copy.title}
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">{copy.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveIdx(idx);
                  setPercent(50);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                  idx === activeIdx
                    ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold'
                    : 'bg-white dark:bg-[#192540] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-amber-500/50'
                }`}
              >
                {tLoc(item.title, lang).slice(0, 34)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8">
            <div
              ref={containerRef}
              onPointerDown={(e) => {
                draggingRef.current = true;
                (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                updateFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (draggingRef.current) updateFromClientX(e.clientX);
              }}
              onPointerUp={() => {
                draggingRef.current = false;
              }}
              className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden select-none touch-none cursor-ew-resize border border-slate-200 dark:border-white/10 bg-slate-900"
            >
              {/* After Image (Full background) */}
              <SmartImage
                src={current.afterImage}
                alt={tLoc(current.title, lang)}
                className="w-full h-full object-cover"
              />

              {/* Before Image (Clipped Left) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
              >
                <SmartImage
                  src={current.beforeImage}
                  alt={copy.before}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Labels */}
              <div className="pointer-events-none absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-slate-950/80 text-white text-xs font-medium">
                {copy.before}
              </div>
              <div className="pointer-events-none absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">
                {copy.after}
              </div>

              {/* Divider Line & Handle */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-amber-400"
                style={{ left: `${percent}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-amber-500 text-slate-950 shadow-xl flex items-center justify-center border-2 border-white">
                  <MoveHorizontal className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Project Details Card */}
          <div className="lg:col-span-4 rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {current.location}
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white leading-snug">
                {tLoc(current.title, lang)}
              </h3>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Полный цикл реализации от голой бетонной коробки ПСО до чистовой дизайнерской отделки, скрытого освещения, разводки инженерии и установки сантехники под ключ.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{copy.area}</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {current.areaSqm} м²
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{copy.days}</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {current.durationDays} дн.
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{copy.budget}</div>
                <div className="mt-1 text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatKgs(current.budgetKgs)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
