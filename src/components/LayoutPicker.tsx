import type { ApartmentLayout, Lang } from '../types.ts';

const COPY = {
  ru: { title: 'Похожие планировки', hint: 'Выберите похожую на вашу — площадь, потолки и санузлы подставятся сами.', kitchen: 'кухня', bath: 'с/у', hall: 'холл', ceiling: 'потолки' },
  ky: { title: 'Окшош пландар', hint: 'Сиздикине окшошун тандаңыз — аянт, шып жана даараткана өзү коюлат.', kitchen: 'ашкана', bath: 'д/к', hall: 'холл', ceiling: 'шып' },
  en: { title: 'Similar layouts', hint: 'Pick one close to yours — area, ceilings and bathrooms fill in automatically.', kitchen: 'kitchen', bath: 'bath', hall: 'hall', ceiling: 'ceilings' },
} as const;

// Schematic plan: living rooms on top, kitchen / bathrooms / hallway below, sized by area.
export function LayoutPlan({ layout, lang }: { layout: ApartmentLayout; lang: Lang }) {
  const copy = COPY[lang];
  if (layout.planImage) {
    return (
      <img
        src={layout.planImage}
        alt={`${layout.series}, ${layout.rooms}`}
        loading="lazy"
        className="w-full h-24 object-contain rounded-lg bg-white"
      />
    );
  }
  const spaces = layout.spaces || [];
  const living = spaces.filter((s) => s.kind === 'living');
  const used = spaces.reduce((sum, s) => sum + s.area, 0);
  const hall = Math.max(2, layout.areaSqm - used);
  const bottom = [
    ...spaces.filter((s) => s.kind === 'kitchen').map((s) => ({ label: copy.kitchen, area: s.area, fill: '#fde7b0' })),
    ...spaces.filter((s) => s.kind === 'bath').map((s) => ({ label: copy.bath, area: s.area, fill: '#cfe6f2' })),
    { label: copy.hall, area: hall, fill: '#eceae5' },
  ];
  const top = living.map((s, i) => ({ label: `${i + 1}`, area: s.area, fill: '#f6f1e7' }));
  const W = 160;
  const topSum = top.reduce((a, b) => a + b.area, 0) || 1;
  const botSum = bottom.reduce((a, b) => a + b.area, 0) || 1;
  const topH = Math.round(96 * (topSum / (topSum + botSum)));
  const row = (items: typeof top, y: number, h: number, sum: number) => {
    let x = 0;
    return items.map((it, i) => {
      const w = (it.area / sum) * W;
      const el = (
        <g key={`${y}-${i}`}>
          <rect x={x} y={y} width={w} height={h} fill={it.fill} stroke="#475569" strokeWidth="1.5" />
          {w > 18 && (
            <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize="8" fill="#334155">
              {it.label} · {it.area}
            </text>
          )}
        </g>
      );
      x += w;
      return el;
    });
  };
  return (
    <svg viewBox={`0 0 ${W} 96`} className="w-full h-24 rounded-lg bg-white" aria-hidden="true">
      {row(top, 0, topH, topSum)}
      {row(bottom, topH, 96 - topH, botSum)}
    </svg>
  );
}

interface LayoutPickerProps {
  layouts: ApartmentLayout[];
  rooms: number;
  selectedId: string | null;
  lang: Lang;
  onPick: (layout: ApartmentLayout) => void;
}

export function LayoutPicker({ layouts, rooms, selectedId, lang, onPick }: LayoutPickerProps) {
  const copy = COPY[lang];
  const list = layouts.filter((l) => l.rooms === rooms);
  if (list.length === 0) return null;
  return (
    <div>
      <div className="text-sm font-semibold text-slate-900 dark:text-white">{copy.title}</div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{copy.hint}</p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {list.map((l) => {
          const active = l.id === selectedId;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onPick(l)}
              aria-pressed={active}
              className={`snap-start shrink-0 w-44 text-left rounded-2xl border p-2.5 transition-colors cursor-pointer ${
                active
                  ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                  : 'border-slate-200 dark:border-white/10 hover:border-amber-500/50'
              }`}
            >
              <LayoutPlan layout={l} lang={lang} />
              <div className="mt-2 text-xs font-semibold text-slate-900 dark:text-white leading-snug">{l.series}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {l.areaSqm} м² · {copy.ceiling} {l.ceilingHeight} м · {copy.bath} {l.bathrooms}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
