import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { FinishGroupConfig, FinishOptionConfig } from '../types.ts';
import { FINISH_GROUPS } from '../data/finishCatalog.ts';
import { DEFAULT_PRICE_LIST, renameRu, WORK_UNIT_LABELS } from '../data/workCatalog.ts';

interface FinishCatalogEditorProps {
  groups: FinishGroupConfig[];
  onChange: (next: FinishGroupConfig[]) => void;
}

const field =
  'px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm';

function unitFor(group: FinishGroupConfig): string {
  const item = DEFAULT_PRICE_LIST.find((i) => group.workItemIds.includes(i.id));
  return item ? WORK_UNIT_LABELS[item.unit].ru : 'ед.';
}

export function FinishCatalogEditor({ groups, onChange }: FinishCatalogEditorProps) {
  // Show every built-in group even if the saved catalog predates it.
  const all = FINISH_GROUPS.map((base) => groups.find((g) => g.id === base.id) || base);

  const setGroup = (id: string, options: FinishOptionConfig[]) =>
    onChange(all.map((g) => (g.id === id ? { ...g, options } : g)));

  const patchOption = (g: FinishGroupConfig, optId: string, change: Partial<FinishOptionConfig>) =>
    setGroup(
      g.id,
      g.options.map((o) => (o.id === optId ? { ...o, ...change } : o)),
    );

  const resetDefaults = () => {
    if (window.confirm('Вернуть стандартный набор цветов? Ваши варианты, фото и наценки будут заменены после сохранения.')) {
      onChange(FINISH_GROUPS);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Каталог отделки (цвета и материалы)</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Это варианты, которые клиент выбирает в смете. Добавьте реальные позиции шоурума: название, цвет для
            картинки, ссылку на фото и наценку. Наценка прибавляется к цене материалов за единицу работы
            (например, +800 сом за м² мраморной плитки).
          </p>
        </div>
        <button
          type="button"
          onClick={resetDefaults}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 text-xs font-medium cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Стандартный набор
        </button>
      </div>

      {all.map((g) => (
        <div key={g.id} className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-white/5">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{g.label.ru}</span>
            <button
              type="button"
              onClick={() =>
                setGroup(g.id, [
                  ...g.options,
                  { id: `opt-${Date.now()}`, name: { ru: 'Новый вариант', ky: 'Жаңы вариант', en: 'New option' }, color: '#cccccc' },
                ])
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Вариант
            </button>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {g.options.map((o) => (
              <div key={o.id} className="p-3 grid grid-cols-12 gap-2 items-end text-xs text-slate-500 dark:text-slate-400">
                <div
                  className="col-span-2 sm:col-span-1 w-11 h-11 rounded-xl border border-slate-300 dark:border-white/20 bg-cover bg-center"
                  style={{
                    background: o.photo
                      ? `center / cover no-repeat url("${o.photo.replace(/"/g, '')}"), ${o.color}`
                      : o.accent
                        ? `linear-gradient(135deg, ${o.color} 0 55%, ${o.accent} 55% 100%)`
                        : o.color,
                  }}
                  aria-hidden="true"
                />
                <label className="col-span-10 sm:col-span-4 space-y-1">
                  <span>Название</span>
                  <input
                    type="text"
                    value={o.name.ru}
                    onChange={(e) => patchOption(g, o.id, { name: renameRu(o.name, e.target.value) })}
                    className={field + ' w-full'}
                  />
                </label>
                <label className="col-span-4 sm:col-span-1 space-y-1">
                  <span>Цвет</span>
                  <input
                    type="color"
                    value={o.color}
                    onChange={(e) => patchOption(g, o.id, { color: e.target.value })}
                    className="block w-full h-9 rounded-lg cursor-pointer"
                  />
                </label>
                <label className="col-span-8 sm:col-span-3 space-y-1">
                  <span>Фото (ссылка, необязательно)</span>
                  <input
                    type="url"
                    placeholder="https://…"
                    value={o.photo || ''}
                    onChange={(e) => patchOption(g, o.id, { photo: e.target.value.trim() || undefined })}
                    className={field + ' w-full'}
                  />
                </label>
                <label className="col-span-8 sm:col-span-2 space-y-1">
                  <span>Наценка, сом/{unitFor(g)}</span>
                  <input
                    type="number"
                    min={0}
                    value={o.surcharge || 0}
                    onChange={(e) => patchOption(g, o.id, { surcharge: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                    className={field + ' w-full tabular-nums'}
                  />
                </label>
                <div className="col-span-4 sm:col-span-1 flex justify-end pb-1.5">
                  <button
                    type="button"
                    disabled={g.options.length <= 1}
                    onClick={() => setGroup(g.id, g.options.filter((x) => x.id !== o.id))}
                    className="text-rose-500 disabled:opacity-30 cursor-pointer"
                    aria-label="Удалить вариант"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
