import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '../apiClient.ts';

type DayStats = { day: string; counts: Record<string, number> };

// Funnel order: from visiting the site to a booking in the CRM.
const FUNNEL: Array<[string, string]> = [
  ['visit', 'Посетители сайта'],
  ['estimate_view', 'Дошли до сметы'],
  ['estimate_edit', 'Начали считать'],
  ['layout_pick', 'Выбрали планировку'],
  ['finish_pick', 'Выбирали цвета'],
  ['pdf', 'Скачали PDF'],
  ['share', 'Поделились сметой'],
  ['save', 'Сохранили в кабинет'],
  ['book_click', 'Нажали «Записаться со сметой»'],
  ['booking_created', 'Оформили заявку'],
  ['review_sent', 'Оставили отзыв'],
];

export function StatsPanel() {
  const [days, setDays] = useState<DayStats[]>([]);
  const [period, setPeriod] = useState(7);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await apiFetch<{ days?: DayStats[] }>('/api/stats?days=30', { auth: 'admin' });
    setLoading(false);
    if (res.ok && Array.isArray(res.data.days)) setDays(res.data.days);
  };

  useEffect(() => {
    void load();
  }, []);

  const slice = days.slice(0, period);
  const total = (k: string) => slice.reduce((s, d) => s + (d.counts[k] || 0), 0);
  const visits = total('visit') || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Аналитика сайта</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Анонимные счётчики: без имён, телефонов и cookie. Каждый посетитель учитывается один раз за сеанс.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                period === p ? 'bg-amber-500 text-slate-950' : 'border border-slate-300 dark:border-white/15'
              }`}
            >
              {p} дней
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load()}
            className="p-2 rounded-lg border border-slate-300 dark:border-white/15 cursor-pointer"
            aria-label="Обновить"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-200 dark:divide-white/10">
        {FUNNEL.map(([k, label]) => {
          const n = total(k);
          const pct = Math.round((n / visits) * 100);
          return (
            <div key={k} className="px-4 py-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-700 dark:text-slate-200">{label}</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                  {n}
                  {k !== 'visit' && <span className="text-xs text-slate-400 font-normal ml-1.5">{pct}%</span>}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 mt-1.5">
                <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${Math.min(100, k === 'visit' ? 100 : pct)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="text-slate-500">
              <th className="text-left py-1.5 pr-3">День</th>
              <th className="text-right px-2">Визиты</th>
              <th className="text-right px-2">Смета</th>
              <th className="text-right px-2">PDF</th>
              <th className="text-right px-2">Заявки</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((d) => (
              <tr key={d.day} className="border-t border-slate-200 dark:border-white/10">
                <td className="py-1.5 pr-3">{new Date(d.day).toLocaleDateString('ru-RU')}</td>
                <td className="text-right px-2">{d.counts.visit || 0}</td>
                <td className="text-right px-2">{d.counts.estimate_edit || 0}</td>
                <td className="text-right px-2">{d.counts.pdf || 0}</td>
                <td className="text-right px-2 font-semibold">{d.counts.booking_created || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
