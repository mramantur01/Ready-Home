import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import type { InstallmentConfig, Lang, WorkEstimate } from '../types.ts';
import { WORK_STAGES } from '../data/workCatalog.ts';
import { formatKgs, tLoc } from '../i18n.ts';

const COPY = {
  ru: {
    title: 'Как платить',
    byStage: 'По этапам',
    installment: 'Рассрочка',
    byStageNote: 'Суммы по этапам в порядке выполнения работ — удобно планировать бюджет. Порядок оплаты фиксируется в договоре.',
    after: 'после этапа',
    months: 'мес.',
    down: 'Первый взнос',
    monthly: 'Ежемесячно',
    overpay: 'Переплата',
    none: 'без переплаты',
  },
  ky: {
    title: 'Кантип төлөө',
    byStage: 'Этап боюнча',
    installment: 'Бөлүп төлөө',
    byStageNote: 'Иштердин тартиби боюнча этаптардын суммалары — бюджетти пландоо ыңгайлуу. Төлөө тартиби келишимде бекитилет.',
    after: 'этаптан кийин',
    months: 'ай',
    down: 'Биринчи төлөм',
    monthly: 'Ай сайын',
    overpay: 'Ашыкча төлөм',
    none: 'ашыкча төлөмсүз',
  },
  en: {
    title: 'How to pay',
    byStage: 'By stage',
    installment: 'Instalments',
    byStageNote: 'Stage amounts in the order the work is done, to help plan your budget. The payment schedule is fixed in the contract.',
    after: 'after stage',
    months: 'mo',
    down: 'Down payment',
    monthly: 'Monthly',
    overpay: 'Extra cost',
    none: 'no extra cost',
  },
} as const;

interface PaymentPlanProps {
  estimate: WorkEstimate;
  installment: InstallmentConfig;
  lang: Lang;
}

export function PaymentPlan({ estimate, installment, lang }: PaymentPlanProps) {
  const copy = COPY[lang];
  const canInstall = installment.enabled && installment.months.length > 0;
  const [mode, setMode] = useState<'stage' | 'installment'>('stage');
  const [months, setMonths] = useState(installment.months[0] || 6);
  const total = estimate.totalKgs;

  let cumulative = 0;
  const down = Math.round((total * installment.downPaymentPercent) / 100);
  const financed = Math.max(0, total - down);
  const withMarkup = Math.round(financed * (1 + installment.markupPercent / 100));
  const monthly = months > 0 ? Math.round(withMarkup / months) : 0;

  const tab = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
      active ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
    }`;

  return (
    <div className="mt-5 pt-4 border-t border-white/10">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm font-semibold inline-flex items-center gap-1.5">
          <CalendarClock className="w-4 h-4 text-amber-400" /> {copy.title}
        </span>
        {canInstall && (
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            <button type="button" className={tab(mode === 'stage')} onClick={() => setMode('stage')}>
              {copy.byStage}
            </button>
            <button type="button" className={tab(mode === 'installment')} onClick={() => setMode('installment')}>
              {copy.installment}
            </button>
          </div>
        )}
      </div>

      {mode === 'stage' || !canInstall ? (
        <>
          <p className="text-xs text-slate-400 mb-2.5">{copy.byStageNote}</p>
          <ol className="space-y-1.5 text-xs">
            {estimate.stages.map((s, i) => {
              cumulative += s.totalKgs;
              return (
                <li key={s.id} className="flex justify-between gap-2">
                  <span className="text-slate-300 truncate">
                    <span className="text-slate-500 tabular-nums mr-1">{i + 1}.</span>
                    {tLoc(WORK_STAGES.find((w) => w.id === s.id)?.name, lang)}
                  </span>
                  <span className="tabular-nums shrink-0">
                    <span className="font-semibold">{formatKgs(s.totalKgs)}</span>
                    <span className="text-slate-500 ml-1.5">{total ? Math.round((cumulative / total) * 100) : 0}%</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {installment.months.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  months === m ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-white/15 text-slate-200'
                }`}
              >
                {m} {copy.months}
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">
              {copy.down} ({installment.downPaymentPercent}%)
            </span>
            <span className="font-semibold tabular-nums">{formatKgs(down)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{copy.monthly}</span>
            <span className="font-bold text-amber-400 tabular-nums text-lg">{formatKgs(monthly)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">{copy.overpay}</span>
            <span className="tabular-nums">
              {installment.markupPercent > 0 ? formatKgs(withMarkup - financed) : copy.none}
            </span>
          </div>
          {installment.note && <p className="text-xs text-slate-400">{installment.note}</p>}
        </div>
      )}
    </div>
  );
}
