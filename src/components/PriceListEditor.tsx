import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { MaterialTier, WorkBasis, WorkItem, WorkStageId, WorkUnit } from '../types.ts';
import { DEFAULT_PRICE_LIST, WORK_BASIS_LABELS, WORK_STAGES, WORK_UNIT_LABELS } from '../data/workCatalog.ts';

interface PriceListEditorProps {
  items: WorkItem[];
  onChange: (next: WorkItem[]) => void;
}

const field =
  'px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm tabular-nums';

export function PriceListEditor({ items, onChange }: PriceListEditorProps) {
  const patch = (id: string, change: Partial<WorkItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...change } : it)));

  const patchMaterial = (it: WorkItem, tier: MaterialTier, value: number) =>
    patch(it.id, { materialPrice: { ...it.materialPrice, [tier]: value } });

  const addItem = (stage: WorkStageId) =>
    onChange([
      ...items,
      {
        id: `w-${Date.now()}`,
        stage,
        name: { ru: 'Новая работа', ky: 'Жаңы иш', en: 'New work item' },
        unit: 'm2',
        basis: 'floor',
        workPrice: 0,
        materialPrice: { standard: 0, comfort: 0, premium: 0 },
        enabledByDefault: true,
      },
    ]);

  const resetDefaults = () => {
    if (window.confirm('Заменить весь прайс-лист стандартными ценами? Ваши правки будут потеряны после сохранения.')) {
      onChange(DEFAULT_PRICE_LIST);
    }
  };

  const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Прайс-лист работ для сметы</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Цены в сомах за единицу: работа бригады и материалы по классам Стандарт / Комфорт / Премиум. Стартовые цены
            примерные — проверьте их и сохраните. «По умолчанию» — работа сразу отмечена в смете клиента.
          </p>
        </div>
        <button
          type="button"
          onClick={resetDefaults}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 text-xs font-medium cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Стандартные цены
        </button>
      </div>

      {WORK_STAGES.map((stage) => {
        const stageItems = items.filter((it) => it.stage === stage.id);
        return (
          <div key={stage.id} className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-white/5">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{stage.name.ru}</span>
              <button
                type="button"
                onClick={() => addItem(stage.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Работа
              </button>
            </div>
            {stageItems.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500">Нет работ в этом этапе.</div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {stageItems.map((it) => (
                  <div key={it.id} className="p-3 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        type="text"
                        value={it.name.ru}
                        onChange={(e) => patch(it.id, { name: { ...it.name, ru: e.target.value } })}
                        className={field + ' flex-1 min-w-48'}
                        aria-label="Название работы"
                      />
                      <select
                        value={it.unit}
                        onChange={(e) => patch(it.id, { unit: e.target.value as WorkUnit })}
                        className={field}
                        aria-label="Единица"
                      >
                        {(Object.keys(WORK_UNIT_LABELS) as WorkUnit[]).map((u) => (
                          <option key={u} value={u}>
                            {WORK_UNIT_LABELS[u].ru}
                          </option>
                        ))}
                      </select>
                      <select
                        value={it.basis}
                        onChange={(e) => patch(it.id, { basis: e.target.value as WorkBasis })}
                        className={field}
                        aria-label="Объём считать по"
                        title="Объём считать по"
                      >
                        {(Object.keys(WORK_BASIS_LABELS) as WorkBasis[]).map((b) => (
                          <option key={b} value={b}>
                            {WORK_BASIS_LABELS[b]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onChange(items.filter((x) => x.id !== it.id))}
                        className="text-rose-500 inline-flex items-center gap-1 text-xs font-medium cursor-pointer"
                        aria-label="Удалить работу"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end text-xs text-slate-500 dark:text-slate-400">
                      <label className="space-y-1">
                        <span>Работа, сом</span>
                        <input type="number" min={0} value={it.workPrice} onChange={(e) => patch(it.id, { workPrice: num(e.target.value) })} className={field + ' w-full'} />
                      </label>
                      {(['standard', 'comfort', 'premium'] as MaterialTier[]).map((t) => (
                        <label key={t} className="space-y-1">
                          <span>Мат. {t === 'standard' ? 'Стандарт' : t === 'comfort' ? 'Комфорт' : 'Премиум'}</span>
                          <input
                            type="number"
                            min={0}
                            value={it.materialPrice[t]}
                            onChange={(e) => patchMaterial(it, t, num(e.target.value))}
                            className={field + ' w-full'}
                          />
                        </label>
                      ))}
                      <label className="flex items-center gap-2 pb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={it.enabledByDefault}
                          onChange={(e) => patch(it.id, { enabledByDefault: e.target.checked })}
                          className="w-4 h-4 accent-amber-500"
                        />
                        <span>По умолчанию</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
