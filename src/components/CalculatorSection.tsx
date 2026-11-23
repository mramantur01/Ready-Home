import { useMemo, useState } from 'react';
import { ArrowRight, Calculator } from 'lucide-react';
import type { BookingDraft, Lang, MaterialTier, PropertyType, RenovationService } from '../types.ts';
import { calculateRenovationEstimate } from '../data/defaultContent.ts';
import { formatKgs, PROPERTY_LABELS, TIER_LABELS, tLoc, UI_COPY } from '../i18n.ts';

interface CalculatorSectionProps {
  services: RenovationService[];
  lang: Lang;
  onBookWithParams: (draft: BookingDraft) => void;
}

export function CalculatorSection({ services, lang, onBookWithParams }: CalculatorSectionProps) {
  const copy = UI_COPY[lang].calculator;
  const [propertyType, setPropertyType] = useState<PropertyType>('newbuild');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [areaSqm, setAreaSqm] = useState(76);
  const [tier, setTier] = useState<MaterialTier>('comfort');

  const activeService = useMemo(
    () => services.find((s) => s.id === serviceId) || services[0],
    [services, serviceId],
  );

  const result = useMemo(
    () => calculateRenovationEstimate(activeService?.pricePerSqm || 12500, areaSqm, propertyType, tier),
    [activeService, areaSqm, propertyType, tier],
  );

  return (
    <section id="calculator" className="py-16 md:py-24 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-10">
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

        <div className="grid lg:grid-cols-12 gap-6 items-stretch">
          {/* Controls */}
          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 p-6 sm:p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                {copy.propertyType}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(['newbuild', 'secondary', 'house', 'commercial'] as PropertyType[]).map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setPropertyType(pt)}
                    className={`px-4 py-3 rounded-xl text-left text-sm font-medium border transition-colors cursor-pointer ${
                      propertyType === pt
                        ? 'border-amber-500 bg-amber-500/12 text-amber-700 dark:text-amber-300 font-semibold'
                        : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-amber-500/40'
                    }`}
                  >
                    {PROPERTY_LABELS[pt][lang]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                {copy.serviceType}
              </label>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {services.slice(0, 6).map((srv) => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setServiceId(srv.id)}
                    className={`p-3.5 rounded-xl text-left border transition-colors cursor-pointer ${
                      activeService?.id === srv.id
                        ? 'border-amber-500 bg-amber-500/12'
                        : 'border-slate-200 dark:border-white/10 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                      {tLoc(srv.name, lang)}
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                      от {formatKgs(srv.pricePerSqm)} / м²
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-900 dark:text-white">
                  {copy.areaLabel}
                </label>
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {areaSqm} м²
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={320}
                step={2}
                value={areaSqm}
                onChange={(e) => setAreaSqm(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1 tabular-nums">
                <span>20 м²</span>
                <span>100 м²</span>
                <span>200 м²</span>
                <span>320 м²</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                {copy.tierLabel}
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['standard', 'comfort', 'premium'] as MaterialTier[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={`py-3 px-3 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                      tier === t
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold'
                        : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-amber-500/40'
                    }`}
                  >
                    {TIER_LABELS[t][lang]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-5 rounded-3xl bg-slate-900 dark:bg-[#0e172a] text-white border border-slate-800 dark:border-amber-500/25 p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Предварительный расчёт</div>
                  <div className="font-semibold text-base text-white">
                    {activeService ? tLoc(activeService.name, lang) : ''}
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 pt-4 border-t border-white/10 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">{copy.workCost}</span>
                  <span className="font-semibold text-white tabular-nums">
                    {formatKgs(result.workKgs)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">{copy.materialsCost}</span>
                  <span className="font-semibold text-white tabular-nums">
                    {formatKgs(result.materialsKgs)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">{copy.daysLabel}</span>
                  <span className="font-semibold text-white tabular-nums">
                    ~{result.estimatedDays} {copy.daysUnit}
                  </span>
                </div>
              </div>

              <div className="pt-5 border-t border-white/10">
                <div className="text-xs text-slate-400">{copy.totalLabel}</div>
                <div className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-400 tabular-nums">
                  {formatKgs(result.totalKgs)}
                </div>
                <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">{copy.note}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onBookWithParams({
                  serviceId: activeService?.id,
                  propertyType,
                  areaSqm,
                  materialTier: tier,
                })
              }
              className="mt-8 w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
            >
              <span>{copy.bookBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
