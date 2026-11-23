import { useState } from 'react';
import { X } from 'lucide-react';
import type { ScheduleConfig } from '../types.ts';
import { ALL_TIMES } from '../data/schedule.ts';

const DAYS: Array<[number, string]> = [
  [1, 'Пн'],
  [2, 'Вт'],
  [3, 'Ср'],
  [4, 'Чт'],
  [5, 'Пт'],
  [6, 'Сб'],
  [0, 'Вс'],
];

interface ScheduleEditorProps {
  schedule: ScheduleConfig;
  onChange: (next: ScheduleConfig) => void;
}

export function ScheduleEditor({ schedule, onChange }: ScheduleEditorProps) {
  const [newDate, setNewDate] = useState('');
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const chip = (on: boolean) =>
    `px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer tabular-nums ${
      on ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300'
    }`;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-4 mb-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Календарь бесплатных замеров</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Клиент видит только свободные окна. Занятое время (кроме отменённых заявок) пропадает из календаря.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs text-slate-500">Рабочие дни</div>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(([d, label]) => (
            <button key={d} type="button" className={chip(schedule.workDays.includes(d))} onClick={() => onChange({ ...schedule, workDays: toggle(schedule.workDays, d) })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs text-slate-500">Время выездов (нажмите, чтобы включить или выключить)</div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_TIMES.map((t) => (
            <button
              key={t}
              type="button"
              className={chip(schedule.slots.includes(t))}
              onClick={() => onChange({ ...schedule, slots: toggle(schedule.slots, t).sort() })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-500">
        <label className="space-y-1">
          <span>Замерщиков одновременно (заявок на одно время)</span>
          <input
            type="number"
            min={1}
            max={20}
            value={schedule.perSlot}
            onChange={(e) => onChange({ ...schedule, perSlot: Math.max(1, Number(e.target.value) || 1) })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span>Запись не раньше чем через, часов</span>
          <input
            type="number"
            min={0}
            max={72}
            value={schedule.leadHours}
            onChange={(e) => onChange({ ...schedule, leadHours: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
          />
        </label>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs text-slate-500">Выходные и праздники (замеров нет)</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
          />
          <button
            type="button"
            disabled={!newDate}
            onClick={() => {
              if (newDate && !schedule.blockedDates.includes(newDate)) {
                onChange({ ...schedule, blockedDates: [...schedule.blockedDates, newDate].sort() });
              }
              setNewDate('');
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            Добавить
          </button>
          {schedule.blockedDates.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-xs tabular-nums">
              {new Date(d + 'T00:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC' })}
              <button
                type="button"
                onClick={() => onChange({ ...schedule, blockedDates: schedule.blockedDates.filter((x) => x !== d) })}
                aria-label="Убрать дату"
                className="cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
