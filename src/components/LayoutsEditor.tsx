import { Plus, Trash2 } from 'lucide-react';
import type { ApartmentLayout } from '../types.ts';
import { LayoutPlan } from './LayoutPicker.tsx';

interface LayoutsEditorProps {
  layouts: ApartmentLayout[];
  onChange: (next: ApartmentLayout[]) => void;
}

const field =
  'w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm';

export function LayoutsEditor({ layouts, onChange }: LayoutsEditorProps) {
  const patch = (id: string, change: Partial<ApartmentLayout>) =>
    onChange(layouts.map((l) => (l.id === id ? { ...l, ...change } : l)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Планировки ЖК</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Ваши планировки показываются клиенту первыми, перед типовыми сериями (хрущёвка, 105, 106, сталинка,
            новостройки). Добавьте ЖК, с которыми работаете, и ссылку на картинку плана (публикуйте планы
            застройщика только с его разрешения).
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              {
                id: `lay-${Date.now()}`,
                series: 'ЖК ',
                rooms: 2,
                areaSqm: 65,
                ceilingHeight: 2.8,
                bathrooms: 1,
                propertyType: 'newbuild',
              },
              ...layouts,
            ])
          }
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Планировка
        </button>
      </div>

      {layouts.length === 0 && (
        <div className="p-6 text-center text-sm text-slate-500 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
          Пока только типовые планировки. Нажмите «Планировка», чтобы добавить план вашего ЖК.
        </div>
      )}

      {layouts.map((l) => (
        <div
          key={l.id}
          className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 grid grid-cols-12 gap-2 items-end text-xs text-slate-500 dark:text-slate-400"
        >
          <div className="col-span-12 sm:col-span-3">
            <LayoutPlan layout={l} lang="ru" />
          </div>
          <div className="col-span-12 sm:col-span-9 grid grid-cols-6 gap-2">
            <label className="col-span-6 sm:col-span-3 space-y-1">
              <span>Название (ЖК, серия)</span>
              <input type="text" value={l.series} onChange={(e) => patch(l.id, { series: e.target.value })} className={field} />
            </label>
            <label className="col-span-6 sm:col-span-3 space-y-1">
              <span>Картинка плана (ссылка)</span>
              <input
                type="url"
                placeholder="https://…"
                value={l.planImage || ''}
                onChange={(e) => patch(l.id, { planImage: e.target.value.trim() || undefined })}
                className={field}
              />
            </label>
            <label className="col-span-2 sm:col-span-1 space-y-1">
              <span>Комнат</span>
              <input type="number" min={1} max={5} value={l.rooms} onChange={(e) => patch(l.id, { rooms: Number(e.target.value) || 1 })} className={field} />
            </label>
            <label className="col-span-2 sm:col-span-1 space-y-1">
              <span>м²</span>
              <input type="number" min={18} max={400} step={0.1} value={l.areaSqm} onChange={(e) => patch(l.id, { areaSqm: Number(e.target.value) || 18 })} className={field} />
            </label>
            <label className="col-span-2 sm:col-span-1 space-y-1">
              <span>Потолки, м</span>
              <input type="number" min={2.4} max={4} step={0.05} value={l.ceilingHeight} onChange={(e) => patch(l.id, { ceilingHeight: Number(e.target.value) || 2.7 })} className={field} />
            </label>
            <label className="col-span-2 sm:col-span-1 space-y-1">
              <span>Санузлов</span>
              <input type="number" min={1} max={3} value={l.bathrooms} onChange={(e) => patch(l.id, { bathrooms: Number(e.target.value) || 1 })} className={field} />
            </label>
            <label className="col-span-3 sm:col-span-1 space-y-1">
              <span>Тип</span>
              <select
                value={l.propertyType}
                onChange={(e) => patch(l.id, { propertyType: e.target.value === 'secondary' ? 'secondary' : 'newbuild' })}
                className={field}
              >
                <option value="newbuild">Новостройка</option>
                <option value="secondary">Вторичка</option>
              </select>
            </label>
            <div className="col-span-1 flex justify-end pb-1.5">
              <button
                type="button"
                onClick={() => onChange(layouts.filter((x) => x.id !== l.id))}
                className="text-rose-500 cursor-pointer"
                aria-label="Удалить планировку"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
