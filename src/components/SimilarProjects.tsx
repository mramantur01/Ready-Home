import type { ApartmentParams, BeforeAfterItem, Lang } from '../types.ts';
import { formatKgs, tLoc } from '../i18n.ts';

const COPY = {
  ru: { title: 'Похожие объекты, которые мы сделали', days: 'дней' },
  ky: { title: 'Биз жасаган окшош объекттер', days: 'күн' },
  en: { title: 'Similar projects we have completed', days: 'days' },
} as const;

// Shows the 2 completed projects closest to the client's apartment (rooms first, then area).
export function SimilarProjects({ items, params, lang }: { items: BeforeAfterItem[]; params: ApartmentParams; lang: Lang }) {
  const copy = COPY[lang];
  const ranked = [...items]
    .filter((i) => i.afterImage)
    .map((i) => ({ i, score: (i.rooms && i.rooms !== params.rooms ? 1000 : 0) + Math.abs(i.areaSqm - params.areaSqm) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((x) => x.i);
  if (ranked.length === 0) return null;
  return (
    <div className="rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 p-4 sm:p-5">
      <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{copy.title}</div>
      <div className="grid grid-cols-2 gap-3">
        {ranked.map((p) => (
          <a key={p.id} href="#portfolio" className="block rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 hover:border-amber-500/60">
            <div className="grid grid-cols-2">
              <img src={p.beforeImage} alt="" loading="lazy" className="w-full h-20 object-cover" />
              <img src={p.afterImage} alt="" loading="lazy" className="w-full h-20 object-cover" />
            </div>
            <div className="p-2 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">{tLoc(p.title, lang)}</div>
              <div className="text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                {p.rooms ? `${p.rooms}-комн · ` : ''}
                {p.areaSqm} м² · {p.durationDays} {copy.days}
              </div>
              <div className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatKgs(p.budgetKgs)}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
