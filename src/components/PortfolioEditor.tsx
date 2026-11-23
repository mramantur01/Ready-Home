import { useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import type { BeforeAfterItem } from '../types.ts';
import { apiFetch } from '../apiClient.ts';
import { compressImage } from '../lib/compressImage.ts';

interface PortfolioEditorProps {
  items: BeforeAfterItem[];
  onChange: (next: BeforeAfterItem[]) => void;
}

const field = 'w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm';

// Real completed projects: the estimate shows the closest ones as "похожие объекты".
export function PortfolioEditor({ items, onChange }: PortfolioEditorProps) {
  const [busy, setBusy] = useState('');
  const patch = (id: string, change: Partial<BeforeAfterItem>) => onChange(items.map((i) => (i.id === id ? { ...i, ...change } : i)));

  const upload = async (item: BeforeAfterItem, key: 'beforeImage' | 'afterImage', file?: File) => {
    if (!file) return;
    setBusy(item.id + key);
    try {
      const data = await compressImage(file, 1800, 0.82);
      const res = await apiFetch<{ id?: string }>('/api/photos', { method: 'POST', auth: 'admin', body: JSON.stringify({ data }) });
      if (res.ok && res.data.id) patch(item.id, { [key]: `/api/photo/${res.data.id}` });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Добавьте реальные объекты с фото до и после. В смете клиент увидит 1–2 самых похожих объекта по числу
        комнат и площади — с бюджетом и сроком.
      </p>
      {items.map((item) => (
        <div key={item.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 space-y-2 text-xs text-slate-500">
          <div className="grid grid-cols-12 gap-2 items-end">
            <label className="col-span-12 sm:col-span-5 space-y-1">
              <span>Название объекта</span>
              <input value={item.title.ru} onChange={(e) => patch(item.id, { title: { ru: e.target.value, ky: e.target.value, en: e.target.value } })} className={field} />
            </label>
            <label className="col-span-6 sm:col-span-3 space-y-1">
              <span>ЖК / район</span>
              <input value={item.location} onChange={(e) => patch(item.id, { location: e.target.value })} className={field} />
            </label>
            <label className="col-span-3 sm:col-span-1 space-y-1">
              <span>Комнат</span>
              <input type="number" min={1} max={5} value={item.rooms || ''} onChange={(e) => patch(item.id, { rooms: Number(e.target.value) || undefined })} className={field} />
            </label>
            <label className="col-span-3 sm:col-span-1 space-y-1">
              <span>м²</span>
              <input type="number" value={item.areaSqm} onChange={(e) => patch(item.id, { areaSqm: Number(e.target.value) || 50 })} className={field} />
            </label>
            <label className="col-span-6 sm:col-span-1 space-y-1">
              <span>Дней</span>
              <input type="number" value={item.durationDays} onChange={(e) => patch(item.id, { durationDays: Number(e.target.value) || 30 })} className={field} />
            </label>
            <label className="col-span-6 sm:col-span-1 space-y-1">
              <span>Бюджет</span>
              <input type="number" value={item.budgetKgs} onChange={(e) => patch(item.id, { budgetKgs: Number(e.target.value) || 0 })} className={field} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(['beforeImage', 'afterImage'] as const).map((key) => (
              <label key={key} className="inline-flex items-center gap-2 cursor-pointer">
                <img src={item[key]} alt="" className="w-16 h-12 object-cover rounded-lg bg-slate-200" />
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-slate-400 dark:border-white/25">
                  <Camera className="w-3.5 h-3.5" />
                  {busy === item.id + key ? 'Загрузка…' : key === 'beforeImage' ? 'Фото «до»' : 'Фото «после»'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => void upload(item, key, e.target.files?.[0])} />
              </label>
            ))}
            <button
              type="button"
              onClick={() => onChange(items.filter((x) => x.id !== item.id))}
              className="ml-auto text-rose-500 inline-flex items-center gap-1 font-medium cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Удалить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
