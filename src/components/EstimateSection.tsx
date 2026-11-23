import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bookmark, Check, ChevronDown, ClipboardList, FileDown, Pause, Play, RotateCcw, Share2 } from 'lucide-react';
import type {
  ApartmentLayout,
  ApartmentParams,
  BeforeAfterItem,
  BookingDraft,
  ContactsConfig,
  FinishChoices,
  InstallmentConfig,
  FinishGroupId,
  Lang,
  MaterialTier,
  WorkItem,
  WorkSelection,
  WorkStageId,
} from '../types.ts';
import {
  clampParams,
  computeQuantities,
  computeWorkEstimate,
  DEFAULT_APARTMENT,
  TYPICAL_AREA_BY_ROOMS,
  WORK_STAGES,
  WORK_UNIT_LABELS,
} from '../data/workCatalog.ts';
import { formatKgs, TIER_LABELS, tLoc } from '../i18n.ts';
import { StageVisual } from './StageVisual.tsx';
import { PaymentPlan } from './PaymentPlan.tsx';
import { ShoppingList } from './ShoppingList.tsx';
import { PhotoDesign } from './PhotoDesign.tsx';

// three.js is loaded only when the visitor opens the 3D apartment view.
const Apartment3D = lazy(() => import('./Apartment3D.tsx'));
import { SimilarProjects } from './SimilarProjects.tsx';
import { track } from '../analytics.ts';
import { LayoutPicker } from './LayoutPicker.tsx';
import { layoutTitle, TYPICAL_LAYOUTS } from '../data/layoutCatalog.ts';
import { decodeEstimate, encodeEstimate, estimateShareUrl } from '../data/estimateShare.ts';
import { openPrintableEstimate } from '../data/estimatePrint.ts';
import { defaultFinishes, findFinish, groupByItem, type FinishGroup } from '../data/finishCatalog.ts';

const COPY = {
  ru: {
    kicker: 'Смета по каждой работе',
    title: 'Узнайте цену ремонта по каждому этапу',
    subtitle:
      'Укажите параметры квартиры — мы посчитаем объёмы и стоимость каждой работы: штукатурка, шпаклёвка, покраска, плитка, полы, двери и электрика. Отключайте ненужные этапы и правьте объёмы под свою квартиру.',
    rooms: 'Комнат',
    area: 'Общая площадь',
    ceiling: 'Высота потолков',
    bathrooms: 'Санузлов',
    property: 'Тип жилья',
    newbuild: 'Новостройка (ПСО)',
    secondary: 'Вторичка (со старым ремонтом)',
    tier: 'Класс материалов',
    stages: 'Этапы и работы',
    qty: 'Объём',
    work: 'Работа',
    materials: 'Материалы',
    perUnit: 'за',
    total: 'Итого по смете',
    workTotal: 'Работы бригады',
    materialsTotal: 'Материалы',
    days: 'Срок',
    daysUnit: 'дн.',
    resetQty: 'Сбросить объёмы',
    preview: 'Как будет выглядеть после этапа',
    play: 'Показать по шагам',
    pause: 'Пауза',
    bare: 'Бетон до ремонта',
    book: 'Записаться с этой сметой',
    note: 'Объёмы рассчитаны по типовой планировке. Точная смета фиксируется в договоре после бесплатного замера.',
    edited: 'изменено',
    areaHint: 'Введите свою площадь в м² или двигайте ползунок',
    yourFinish: 'Ваша отделка',
    pdf: 'Скачать PDF',
    share: 'Поделиться',
    copied: 'Ссылка скопирована',
    save: 'Сохранить в кабинет',
    saved: 'Сохранено в кабинете',
    shareText: 'Моя смета на ремонт в READY HOME',
    popupBlocked: 'Разрешите всплывающие окна, чтобы открыть PDF.',
  },
  ky: {
    kicker: 'Ар бир иштин сметасы',
    title: 'Ар бир этаптын баасын билиңиз',
    subtitle:
      'Батириңиздин параметрлерин көрсөтүңүз — ар бир иштин көлөмүн жана баасын эсептейбиз: шыбоо, шпаклёвка, боёо, плитка, пол, эшиктер жана электр.',
    rooms: 'Бөлмө',
    area: 'Жалпы аянт',
    ceiling: 'Шып бийиктиги',
    bathrooms: 'Даараткана',
    property: 'Турак жай түрү',
    newbuild: 'Жаңы үй (ПСО)',
    secondary: 'Экинчилик (эски оңдоо)',
    tier: 'Материалдар классы',
    stages: 'Этаптар жана иштер',
    qty: 'Көлөм',
    work: 'Иш',
    materials: 'Материал',
    perUnit: 'үчүн',
    total: 'Смета боюнча жалпы',
    workTotal: 'Усталардын иши',
    materialsTotal: 'Материалдар',
    days: 'Мөөнөт',
    daysUnit: 'күн',
    resetQty: 'Көлөмдөрдү калыбына келтирүү',
    preview: 'Этаптан кийин кандай болот',
    play: 'Кадам менен көрсөтүү',
    pause: 'Тыныгуу',
    bare: 'Оңдоого чейин бетон',
    book: 'Ушул смета менен жазылуу',
    note: 'Көлөмдөр типтүү план боюнча эсептелген. Так смета акысыз өлчөөдөн кийин келишимде бекитилет.',
    edited: 'өзгөртүлдү',
    areaHint: 'Аянтыңызды м² менен жазыңыз же жылдыргычты жылдырыңыз',
    yourFinish: 'Сиздин жасалгаңыз',
    pdf: 'PDF жүктөө',
    share: 'Бөлүшүү',
    copied: 'Шилтеме көчүрүлдү',
    save: 'Кабинетке сактоо',
    saved: 'Кабинетте сакталды',
    shareText: 'READY HOME оңдоо сметам',
    popupBlocked: 'PDF ачуу үчүн калкып чыкма терезелерге уруксат бериңиз.',
  },
  en: {
    kicker: 'Itemized estimate',
    title: 'See the price of every renovation stage',
    subtitle:
      'Enter your apartment details and we calculate quantities and cost for each job: plaster, putty, paint, tiles, floors, doors and electrics. Switch off stages you do not need and adjust quantities.',
    rooms: 'Rooms',
    area: 'Total area',
    ceiling: 'Ceiling height',
    bathrooms: 'Bathrooms',
    property: 'Housing type',
    newbuild: 'New build (shell)',
    secondary: 'Resale (old finish)',
    tier: 'Material class',
    stages: 'Stages and jobs',
    qty: 'Qty',
    work: 'Labour',
    materials: 'Materials',
    perUnit: 'per',
    total: 'Estimate total',
    workTotal: 'Crew labour',
    materialsTotal: 'Materials',
    days: 'Timeline',
    daysUnit: 'days',
    resetQty: 'Reset quantities',
    preview: 'What it looks like after stage',
    play: 'Play step by step',
    pause: 'Pause',
    bare: 'Bare concrete',
    book: 'Book with this estimate',
    note: 'Quantities are based on a typical layout. The final price is fixed in the contract after a free measurement.',
    edited: 'edited',
    areaHint: 'Type your area in m² or move the slider',
    yourFinish: 'Your finishes',
    pdf: 'Download PDF',
    share: 'Share',
    copied: 'Link copied',
    save: 'Save to account',
    saved: 'Saved to your account',
    shareText: 'My READY HOME renovation estimate',
    popupBlocked: 'Allow pop-ups to open the PDF.',
  },
} as const;

interface EstimateSectionProps {
  priceList: WorkItem[];
  finishCatalog: FinishGroup[];
  installment: InstallmentConfig;
  layouts: ApartmentLayout[];
  portfolio: BeforeAfterItem[];
  lang: Lang;
  contacts: ContactsConfig;
  onBook: (draft: BookingDraft) => void;
  // Returns true when saved; asks the visitor to log in otherwise.
  onSaveEstimate: (data: { code: string; label: string; totalKgs: number }) => Promise<boolean>;
}

function isDefaultEnabled(item: WorkItem, params: ApartmentParams): boolean {
  return item.enabledByDefault && (!item.secondaryOnly || params.propertyType === 'secondary');
}

export function EstimateSection({
  priceList,
  finishCatalog,
  installment,
  layouts,
  portfolio,
  lang,
  contacts,
  onBook,
  onSaveEstimate,
}: EstimateSectionProps) {
  const copy = COPY[lang];
  const FINISH_GROUPS = finishCatalog;
  const FINISH_GROUP_BY_ITEM = useMemo(() => groupByItem(finishCatalog), [finishCatalog]);
  const DEFAULT_FINISHES = useMemo(() => defaultFinishes(finishCatalog), [finishCatalog]);
  const [params, setParams] = useState<ApartmentParams>(DEFAULT_APARTMENT);
  const [enabledOverride, setEnabledOverride] = useState<Record<string, boolean>>({});
  const [qtyOverride, setQtyOverride] = useState<Record<string, number>>({});
  const [finishes, setFinishes] = useState<FinishChoices>(() => defaultFinishes(finishCatalog));
  const [areaText, setAreaText] = useState(String(DEFAULT_APARTMENT.areaSqm));
  const [openStage, setOpenStage] = useState<WorkStageId | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null); // null = all done
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);
  const [flash, setFlash] = useState('');
  const sectionRef = useRef<HTMLElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [inSection, setInSection] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    let tracked = false;
    const io = new IntersectionObserver((entries) => {
      const on = entries.some((e) => e.isIntersecting);
      setInSection(on);
      if (on && !tracked) {
        tracked = true;
        track('estimate_view');
      }
    });
    io.observe(el);
    // hide the phone total bar while the real totals card is on screen
    const sum = summaryRef.current;
    const io2 = sum ? new IntersectionObserver((e) => setSummaryVisible(e.some((x) => x.isIntersecting))) : null;
    if (sum && io2) io2.observe(sum);
    return () => {
      io.disconnect();
      io2?.disconnect();
    };
  }, []);

  // Open a shared or saved estimate from the link (#estimate=CODE).
  useEffect(() => {
    const restore = () => {
      const m = window.location.hash.match(/^#estimate=([A-Za-z0-9_-]+)$/);
      if (!m) return;
      const state = decodeEstimate(m[1]);
      if (!state) return;
      setParams(state.params);
      setEnabledOverride(state.enabled);
      setQtyOverride(state.qty);
      setFinishes({ ...DEFAULT_FINISHES, ...state.finishes });
      setAreaText(String(state.params.areaSqm));
      setPreviewIdx(null);
      window.setTimeout(() => document.getElementById('estimate')?.scrollIntoView({ block: 'start' }), 50);
    };
    restore();
    window.addEventListener('hashchange', restore);
    return () => window.removeEventListener('hashchange', restore);
  }, []);

  const [layoutId, setLayoutId] = useState<string | null>(null);
  const [view, setView] = useState<'room' | 'apartment'>('room');
  const allLayouts = useMemo(() => [...layouts, ...TYPICAL_LAYOUTS], [layouts]);

  // Manual changes to the apartment mean it no longer matches the picked layout exactly.
  const update = (patch: Partial<ApartmentParams>) => {
    track('estimate_edit');
    const shape = 'areaSqm' in patch || 'rooms' in patch || 'ceilingHeight' in patch || 'bathrooms' in patch;
    if (shape) setLayoutId(null);
    setParams((p) => clampParams({ ...p, ...patch, layout: shape ? undefined : p.layout }));
  };

  const pickLayout = (l: ApartmentLayout) => {
    track('layout_pick');
    setLayoutId(l.id);
    setQtyOverride({});
    setParams((p) =>
      clampParams({
        ...p,
        rooms: l.rooms,
        areaSqm: l.areaSqm,
        ceilingHeight: l.ceilingHeight,
        bathrooms: l.bathrooms,
        propertyType: l.propertyType === 'secondary' ? 'secondary' : 'newbuild',
        layout: layoutTitle(l),
      }),
    );
  };

  const quantities = useMemo(() => computeQuantities(params), [params]);

  const isEnabled = (item: WorkItem) => enabledOverride[item.id] ?? isDefaultEnabled(item, params);
  const qtyOf = (item: WorkItem) => qtyOverride[item.id] ?? quantities[item.basis] ?? 0;

  const selections: WorkSelection[] = useMemo(
    () => priceList.filter(isEnabled).map((item) => ({ id: item.id, qty: qtyOf(item) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priceList, enabledOverride, qtyOverride, quantities, params.propertyType],
  );

  // Colour surcharges depend on the chosen option of each enabled job.
  const selectedFinishes = useMemo(() => {
    const out: FinishChoices = {};
    for (const sel of selections) {
      const g = groupByItem(finishCatalog)[sel.id];
      if (g) out[g.id] = finishes[g.id] || g.options[0]?.id;
    }
    return out;
  }, [selections, finishes, finishCatalog]);

  const estimate = useMemo(
    () => computeWorkEstimate(priceList, params, selections, selectedFinishes, finishCatalog),
    [priceList, params, selections, selectedFinishes, finishCatalog],
  );
  const stageTotals = useMemo(() => new Map(estimate.stages.map((s) => [s.id, s])), [estimate]);
  const activeStages = WORK_STAGES.filter((s) => stageTotals.has(s.id));

  // Preview: stages up to previewIdx are "done".
  const shownCount = previewIdx === null ? activeStages.length : previewIdx;
  const doneStages = useMemo(
    () => new Set(activeStages.slice(0, shownCount).map((s) => s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shownCount, estimate],
  );
  const selectedIds = new Set(selections.map((s) => s.id));

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setPreviewIdx((idx) => {
        const cur = idx === null ? activeStages.length : idx;
        if (cur >= activeStages.length) return 0;
        const next = cur + 1;
        if (next >= activeStages.length) {
          setPlaying(false);
          return null;
        }
        return next;
      });
    }, 1100);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, activeStages.length]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    setPreviewIdx(0);
    setPlaying(true);
  };

  const toggleStage = (stageId: WorkStageId, on: boolean) => {
    const next = { ...enabledOverride };
    for (const item of priceList.filter((i) => i.stage === stageId)) {
      // Turning a stage on restores its default jobs (not mutually exclusive alternatives).
      next[item.id] = on ? isDefaultEnabled(item, params) || Boolean(enabledOverride[item.id]) : false;
    }
    // If a stage has no default jobs, enable its first one so the switch visibly works.
    if (on && !priceList.some((i) => i.stage === stageId && next[i.id])) {
      const first = priceList.find((i) => i.stage === stageId);
      if (first) next[first.id] = true;
    }
    setEnabledOverride(next);
  };

  const toggleItem = (item: WorkItem) => {
    const on = !isEnabled(item);
    const next = { ...enabledOverride, [item.id]: on };
    // Paint vs wallpaper and stretch vs drywall ceiling are alternatives.
    const alternatives: Record<string, string> = {
      'w-wall-paint': 'w-wall-wallpaper',
      'w-wall-wallpaper': 'w-wall-paint',
      'w-ceiling-stretch': 'w-ceiling-gkl',
      'w-ceiling-gkl': 'w-ceiling-stretch',
    };
    if (on && alternatives[item.id]) next[alternatives[item.id]] = false;
    setEnabledOverride(next);
  };

  const hasQtyEdits = Object.keys(qtyOverride).length > 0;

  // Keep the typed area in sync when another control (room buttons, slider) changes it.
  useEffect(() => {
    setAreaText((txt) => (Number(txt.replace(',', '.')) === params.areaSqm ? txt : String(params.areaSqm)));
  }, [params.areaSqm]);

  // Finish choices only for jobs that are in the estimate.
  const chosenFinishes: FinishChoices = useMemo(() => {
    const out: FinishChoices = {};
    for (const sel of selections) {
      const g = FINISH_GROUP_BY_ITEM[sel.id];
      if (g) out[g.id] = finishes[g.id] || g.options[0]?.id;
    }
    return out;
  }, [selections, finishes, FINISH_GROUP_BY_ITEM]);

  const setFinish = (group: FinishGroupId, optionId: string) => {
    track('finish_pick');
    setFinishes((f) => ({ ...f, [group]: optionId }));
  };

  const showFlash = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(''), 2600);
  };

  const currentCode = () =>
    encodeEstimate({ params, enabled: enabledOverride, qty: qtyOverride, finishes: chosenFinishes });

  const handlePdf = () => {
    track('pdf');
    const ok = openPrintableEstimate(
      { ...estimate, finishes: chosenFinishes },
      contacts,
      estimateShareUrl(currentCode()),
      finishCatalog,
    );
    if (!ok) showFlash(copy.popupBlocked);
  };

  const handleShare = async () => {
    track('share');
    const url = estimateShareUrl(currentCode());
    const text = `${copy.shareText}: ${params.rooms}-комн, ${params.areaSqm} м² — ${formatKgs(estimate.totalKgs)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'READY HOME', text, url });
        return;
      } catch {
        // cancelled or unsupported: fall back to copying the link
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      showFlash(copy.copied);
    } catch {
      window.prompt(copy.share, url);
    }
  };

  const handleSave = async () => {
    track('save');
    const ok = await onSaveEstimate({
      code: currentCode(),
      label: `${params.rooms}-комн · ${params.areaSqm} м² · ${TIER_LABELS[params.tier].ru}`,
      totalKgs: estimate.totalKgs,
    });
    if (ok) showFlash(copy.saved);
  };

  const handleBook = () => {
    track('book_click');
    onBook({
      propertyType: params.propertyType,
      areaSqm: params.areaSqm,
      materialTier: params.tier,
      roomsCount: `${params.rooms}-комн`,
      shareCode: currentCode(),
      workEstimate: {
        params,
        selections,
        finishes: chosenFinishes,
        preview: { ...estimate, finishes: chosenFinishes },
      },
    });
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm tabular-nums';
  const chip = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
      active
        ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold'
        : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-amber-500/40'
    }`;

  const previewLabel =
    shownCount === 0
      ? copy.bare
      : tLoc(WORK_STAGES.find((s) => s.id === activeStages[shownCount - 1]?.id)?.name, lang);

  return (
    <section ref={sectionRef} id="estimate" className="py-16 md:py-24 scroll-mt-20 border-t border-slate-200/80 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-10">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">{copy.kicker}</p>
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
            style={{ textWrap: 'balance' }}
          >
            {copy.title}
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">{copy.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left: apartment parameters + stage list */}
          <div className="lg:col-span-7 space-y-6 min-w-0">
            <div className="rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 p-5 sm:p-7 space-y-5">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{copy.rooms}</div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => update({ rooms: n, areaSqm: TYPICAL_AREA_BY_ROOMS[n], bathrooms: n >= 3 ? 2 : 1 })}
                      className={chip(params.rooms === n) + ' min-w-12'}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <LayoutPicker layouts={allLayouts} rooms={params.rooms} selectedId={layoutId} lang={lang} onPick={pickLayout} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{copy.area}</span>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={18}
                      max={400}
                      value={areaText}
                      onChange={(e) => {
                        setAreaText(e.target.value);
                        const v = Number(e.target.value.replace(',', '.'));
                        if (Number.isFinite(v) && v >= 18) update({ areaSqm: v });
                      }}
                      onBlur={() => setAreaText(String(params.areaSqm))}
                      aria-label={copy.area}
                      className="w-24 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#16213a] border border-amber-500/50 text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums text-right"
                    />
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">м²</span>
                  </label>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">{copy.areaHint}</p>
                <input
                  type="range"
                  min={18}
                  max={250}
                  step={1}
                  value={Math.min(250, params.areaSqm)}
                  onChange={(e) => update({ areaSqm: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{copy.ceiling}</div>
                  <div className="flex flex-wrap gap-2">
                    {[2.5, 2.7, 2.8, 3.0, 3.3].map((h) => (
                      <button key={h} type="button" onClick={() => update({ ceilingHeight: h })} className={chip(params.ceilingHeight === h)}>
                        {h.toFixed(1)} м
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{copy.bathrooms}</div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((n) => (
                      <button key={n} type="button" onClick={() => update({ bathrooms: n })} className={chip(params.bathrooms === n) + ' min-w-12'}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{copy.property}</div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => update({ propertyType: 'newbuild' })} className={chip(params.propertyType === 'newbuild')}>
                      {copy.newbuild}
                    </button>
                    <button type="button" onClick={() => update({ propertyType: 'secondary' })} className={chip(params.propertyType === 'secondary')}>
                      {copy.secondary}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{copy.tier}</div>
                  <div className="flex flex-wrap gap-2">
                    {(['standard', 'comfort', 'premium'] as MaterialTier[]).map((t) => (
                      <button key={t} type="button" onClick={() => update({ tier: t })} className={chip(params.tier === t)}>
                        {TIER_LABELS[t][lang]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b border-slate-200 dark:border-white/10">
                <h3 className="font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-amber-500" /> {copy.stages}
                </h3>
                {hasQtyEdits && (
                  <button
                    type="button"
                    onClick={() => setQtyOverride({})}
                    className="text-xs font-medium text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> {copy.resetQty}
                  </button>
                )}
              </div>

              <ol className="divide-y divide-slate-200 dark:divide-white/10">
                {WORK_STAGES.map((stage, idx) => {
                  const items = priceList.filter((i) => i.stage === stage.id);
                  if (items.length === 0) return null;
                  const stageOn = items.some((i) => selectedIds.has(i.id));
                  const total = stageTotals.get(stage.id)?.totalKgs || 0;
                  const open = openStage === stage.id;
                  return (
                    <li key={stage.id}>
                      <div className="flex items-center gap-3 px-5 sm:px-7 py-3.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={stageOn}
                          aria-label={tLoc(stage.name, lang)}
                          onClick={() => toggleStage(stage.id, !stageOn)}
                          className={`relative w-10 h-6 rounded-full shrink-0 transition-colors cursor-pointer ${
                            stageOn ? 'bg-amber-500' : 'bg-slate-300 dark:bg-white/15'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${stageOn ? 'left-[18px]' : 'left-0.5'}`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenStage(open ? null : stage.id)}
                          className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left cursor-pointer"
                          aria-expanded={open}
                        >
                          <span className={`text-sm font-semibold ${stageOn ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                            <span className="text-slate-400 tabular-nums mr-1.5">{idx + 1}.</span>
                            {tLoc(stage.name, lang)}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className={`text-sm font-bold tabular-nums ${stageOn ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                              {stageOn ? formatKgs(total) : '—'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                          </span>
                        </button>
                      </div>

                      {open && (
                        <div className="px-5 sm:px-7 pb-4 space-y-2">
                          {items.map((item) => {
                            const on = selectedIds.has(item.id);
                            const qty = qtyOf(item);
                            const unit = WORK_UNIT_LABELS[item.unit][lang];
                            const line = estimate.lines.find((l) => l.id === item.id);
                            const matPrice = item.materialPrice[params.tier] || 0;
                            return (
                              <div
                                key={item.id}
                                className={`rounded-2xl border p-3 grid grid-cols-12 gap-2 items-center ${
                                  on
                                    ? 'border-amber-500/40 bg-amber-500/5'
                                    : 'border-slate-200 dark:border-white/10 opacity-70'
                                }`}
                              >
                                <label className="col-span-12 sm:col-span-6 flex items-start gap-2.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={on}
                                    onChange={() => toggleItem(item)}
                                    className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0"
                                  />
                                  <span className="text-sm leading-snug text-slate-800 dark:text-slate-100">
                                    {tLoc(item.name, lang)}
                                    <span className="block text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                                      {copy.work} {formatKgs(item.workPrice)}
                                      {matPrice > 0 && ` + ${copy.materials.toLowerCase()} ${formatKgs(matPrice)}`} {copy.perUnit} {unit}
                                    </span>
                                  </span>
                                </label>
                                <div className="col-span-6 sm:col-span-3 flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    step={item.unit === 'pcs' ? 1 : 0.5}
                                    value={qty}
                                    disabled={!on}
                                    aria-label={`${copy.qty}: ${tLoc(item.name, lang)}`}
                                    onChange={(e) =>
                                      setQtyOverride({ ...qtyOverride, [item.id]: Math.max(0, Number(e.target.value) || 0) })
                                    }
                                    className={inputCls + ' !py-1.5 !px-2 w-20'}
                                  />
                                  <span className="text-xs text-slate-500">{unit}</span>
                                  {qtyOverride[item.id] !== undefined && (
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400">{copy.edited}</span>
                                  )}
                                </div>
                                <div className="col-span-6 sm:col-span-3 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                                  {on && line ? formatKgs(line.workKgs + line.materialsKgs) : '—'}
                                </div>
                                {on && FINISH_GROUP_BY_ITEM[item.id] && (
                                  <FinishPicker
                                    group={FINISH_GROUP_BY_ITEM[item.id]}
                                    unit={unit}
                                    value={finishes[FINISH_GROUP_BY_ITEM[item.id].id]}
                                    lang={lang}
                                    onChange={setFinish}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            <PhotoDesign
              lang={lang}
              catalog={finishCatalog}
              onApply={(f) => {
                track('finish_pick');
                setFinishes((cur) => ({ ...cur, ...f }));
                setPreviewIdx(null);
                document.getElementById('estimate')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            <ShoppingList estimate={estimate} lang={lang} />
          </div>

          {/* Right: visual preview + totals */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
            <div className="rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 p-4 sm:p-5">
              <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-xl p-1 mb-3 text-xs font-semibold" role="tablist">
                {([
                  ['room', lang === 'en' ? 'Room' : lang === 'ky' ? 'Бөлмө' : 'Комната'],
                  ['apartment', lang === 'en' ? 'Apartment 3D' : lang === 'ky' ? 'Батир 3D' : 'Квартира 3D'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={view === id}
                    onClick={() => setView(id)}
                    className={`flex-1 py-1.5 rounded-lg cursor-pointer ${
                      view === id ? 'bg-amber-500 text-slate-950' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {view === 'room' ? (
                <StageVisual
                  doneStages={doneStages}
                  wallpaper={selectedIds.has('w-wall-wallpaper')}
                  finishes={finishes}
                  groups={finishCatalog}
                />
              ) : (
                <Suspense fallback={<div className="h-72 sm:h-80 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />}>
                  <Apartment3D
                    params={params}
                    spaces={allLayouts.find((l) => l.id === layoutId)?.spaces}
                    doneStages={doneStages}
                    finishes={finishes}
                    groups={finishCatalog}
                    wallpaper={selectedIds.has('w-wall-wallpaper')}
                  />
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'en' ? 'Drag to rotate, pinch or scroll to zoom.' : lang === 'ky' ? 'Айлантуу үчүн сүйрөңүз, чоңойтуу үчүн тартыңыз.' : 'Вращайте пальцем или мышью, приближайте щипком или колёсиком.'}
                  </p>
                </Suspense>
              )}
              <div className="mt-4">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{copy.preview}:</span>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 cursor-pointer"
                  >
                    {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {playing ? copy.pause : copy.play}
                  </button>
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white min-h-5">{previewLabel}</div>
                <input
                  type="range"
                  min={0}
                  max={activeStages.length}
                  value={shownCount}
                  onChange={(e) => {
                    setPlaying(false);
                    const v = Number(e.target.value);
                    setPreviewIdx(v >= activeStages.length ? null : v);
                  }}
                  aria-label={copy.preview}
                  className="w-full accent-amber-500 cursor-pointer mt-2"
                />
              </div>
              {Object.keys(chosenFinishes).length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2">{copy.yourFinish}</div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {FINISH_GROUPS.filter((g) => chosenFinishes[g.id]).map((g) => {
                      const op = findFinish(g.id, chosenFinishes[g.id], finishCatalog);
                      return (
                        <li key={g.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/20 shrink-0"
                            style={{ background: op.color }}
                          />
                          <span className="truncate">
                            {tLoc(g.label, lang)}: <span className="font-medium text-slate-900 dark:text-white">{tLoc(op.name, lang)}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <SimilarProjects items={portfolio} params={params} lang={lang} />

            <div ref={summaryRef} className="rounded-3xl bg-slate-900 dark:bg-[#0e172a] text-white border border-slate-800 dark:border-amber-500/25 p-5 sm:p-6">
              <div className="space-y-2 text-sm">
                {estimate.stages.map((s) => {
                  const pct = estimate.totalKgs ? Math.round((s.totalKgs / estimate.totalKgs) * 100) : 0;
                  return (
                    <div key={s.id}>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-300 truncate">{tLoc(WORK_STAGES.find((w) => w.id === s.id)?.name, lang)}</span>
                        <span className="font-semibold tabular-nums">{formatKgs(s.totalKgs)}</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/10 mt-1">
                        <div className="h-1 rounded-full bg-amber-500" style={{ width: `${Math.max(2, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">{copy.workTotal}</span>
                  <span className="font-semibold tabular-nums">{formatKgs(estimate.workKgs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{copy.materialsTotal}</span>
                  <span className="font-semibold tabular-nums">{formatKgs(estimate.materialsKgs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{copy.days}</span>
                  <span className="font-semibold tabular-nums">
                    ~{estimate.days} {copy.daysUnit}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs text-slate-400">{copy.total}</div>
                <div className="mt-1 text-3xl font-extrabold tracking-tight text-amber-400 tabular-nums">
                  {formatKgs(estimate.totalKgs)}
                </div>
                <div className="text-xs text-slate-400 tabular-nums mt-1">
                  ≈ {formatKgs(Math.round(estimate.totalKgs / params.areaSqm))} / м²
                </div>
                <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">{copy.note}</p>
              </div>

              {estimate.lines.length > 0 && <PaymentPlan estimate={estimate} installment={installment} lang={lang} />}

              <button
                type="button"
                onClick={handleBook}
                disabled={estimate.lines.length === 0}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
              >
                <span>{copy.book}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: copy.pdf, icon: FileDown, onClick: handlePdf },
                  { label: copy.share, icon: Share2, onClick: () => void handleShare() },
                  { label: copy.save, icon: Bookmark, onClick: () => void handleSave() },
                ].map(({ label, icon: Icon, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    disabled={estimate.lines.length === 0}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border border-white/15 hover:border-amber-400 text-slate-100 text-xs font-medium text-center leading-tight disabled:opacity-50 cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-amber-400" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="min-h-5 mt-2 text-xs text-emerald-400 text-center" role="status" aria-live="polite">
                {flash && (
                  <span className="inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {flash}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Phone: sticky total while scrolling through the stages */}
      {inSection && !summaryVisible && estimate.lines.length > 0 && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-slate-900/95 backdrop-blur border-t border-white/10 px-4 py-2.5 flex items-center justify-between gap-3 text-white" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="text-left cursor-pointer"
          >
            <div className="text-[11px] text-slate-400">{copy.total} · ~{estimate.days} {copy.daysUnit}</div>
            <div className="text-lg font-extrabold text-amber-400 tabular-nums leading-tight">{formatKgs(estimate.totalKgs)}</div>
          </button>
          <button type="button" onClick={handleBook} className="mr-16 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold cursor-pointer">
            {lang === 'en' ? 'Book' : lang === 'ky' ? 'Жазылуу' : 'Записаться'}
          </button>
        </div>
      )}
    </section>
  );
}

interface FinishPickerProps {
  group: FinishGroup;
  unit: string;
  value: string | undefined;
  lang: Lang;
  onChange: (group: FinishGroupId, optionId: string) => void;
}

function FinishPicker({ group, unit, value, lang, onChange }: FinishPickerProps) {
  const groupId = group.id;
  const current = group.options.find((o) => o.id === value) || group.options[0];
  if (!current) return null;
  return (
    <div className="col-span-12 pt-1">
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
        {tLoc(group.label, lang)}: <span className="font-semibold text-slate-800 dark:text-slate-100">{tLoc(current.name, lang)}</span>
        {current.surcharge ? (
          <span className="ml-1.5 text-amber-600 dark:text-amber-400 tabular-nums">
            +{formatKgs(current.surcharge)} / {unit}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tLoc(group.label, lang)}>
        {group.options.map((op) => {
          const active = op.id === current.id;
          return (
            <button
              key={op.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={tLoc(op.name, lang) + (op.surcharge ? ` (+${formatKgs(op.surcharge)} / ${unit})` : '')}
              aria-label={tLoc(op.name, lang)}
              onClick={() => onChange(groupId, op.id)}
              className={`relative ${op.photo ? 'w-11 h-11 rounded-xl' : 'w-8 h-8 rounded-full'} border-2 cursor-pointer transition-transform bg-cover bg-center ${
                active ? 'border-amber-500 scale-110 ring-2 ring-amber-500/30' : 'border-slate-300 dark:border-white/20 hover:scale-105'
              }`}
              style={{
                background: op.photo
                  ? `center / cover no-repeat url("${op.photo.replace(/"/g, '')}"), ${op.color}`
                  : op.accent
                    ? `linear-gradient(135deg, ${op.color} 0 55%, ${op.accent} 55% 100%)`
                    : op.color,
              }}
            >
              {op.surcharge ? (
                <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1 rounded bg-amber-500 text-slate-950 leading-tight">+</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
