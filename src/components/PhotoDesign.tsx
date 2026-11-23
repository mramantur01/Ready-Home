import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { FinishChoices, Lang } from '../types.ts';
import { apiFetch } from '../apiClient.ts';
import { compressImage } from '../lib/compressImage.ts';
import { findFinish, type FinishGroup } from '../data/finishCatalog.ts';
import { tLoc } from '../i18n.ts';

const COPY = {
  ru: { title: 'Подбор отделки по фото комнаты', hint: 'Загрузите фото — ИИ предложит 3 варианта цветов и материалов из нашего каталога.', upload: 'Загрузить фото', busy: 'Подбираем…', apply: 'Применить' },
  ky: { title: 'Бөлмөнүн сүрөтү боюнча жасалга тандоо', hint: 'Сүрөт жүктөңүз — ИИ каталогдон 3 вариант сунуштайт.', upload: 'Сүрөт жүктөө', busy: 'Тандалууда…', apply: 'Колдонуу' },
  en: { title: 'Finishes from a room photo', hint: 'Upload a photo — the AI suggests 3 colour and material sets from our catalog.', upload: 'Upload photo', busy: 'Thinking…', apply: 'Apply' },
} as const;

type Option = { name: string; description: string; finishes: FinishChoices };

export function PhotoDesign({ lang, catalog, onApply }: { lang: Lang; catalog: FinishGroup[]; onApply: (f: FinishChoices) => void }) {
  const copy = COPY[lang];
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void apiFetch<{ enabled?: boolean }>('/api/ai/status').then((r) => setEnabled(Boolean(r.ok && r.data.enabled)));
  }, []);
  if (!enabled) return null;

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setOptions([]);
    try {
      const data = await compressImage(file, 1024, 0.8);
      setPreview(data);
      const res = await apiFetch<{ options?: Option[]; error?: string }>('/api/ai/design', { method: 'POST', body: JSON.stringify({ data }) });
      if (res.ok && res.data.options?.length) setOptions(res.data.options);
      else setError(res.data.error || 'Не удалось подобрать. Попробуйте другое фото.');
    } catch {
      setError('Не удалось прочитать фото.');
    }
    setBusy(false);
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-[#192540] border border-amber-500/30 p-5 sm:p-7 space-y-3">
      <div className="font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-amber-500" /> {copy.title}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{copy.hint}</p>
      <div className="flex items-center gap-3">
        {preview && <img src={preview} alt="" className="w-20 h-16 object-cover rounded-lg" />}
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold cursor-pointer">
          {busy ? copy.busy : copy.upload}
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
      </div>
      {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
      {options.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-2">
          {options.map((o, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 p-3 space-y-2 text-xs">
              <div className="font-semibold text-sm text-slate-900 dark:text-white">{o.name}</div>
              <p className="text-slate-500 dark:text-slate-400">{o.description}</p>
              <div className="flex flex-wrap gap-1">
                {catalog
                  .filter((g) => o.finishes[g.id])
                  .map((g) => {
                    const op = findFinish(g.id, o.finishes[g.id], catalog);
                    return (
                      <span
                        key={g.id}
                        title={`${tLoc(g.label, lang)}: ${tLoc(op.name, lang)}`}
                        className="w-5 h-5 rounded-full border border-slate-300 dark:border-white/20"
                        style={{ background: op.color }}
                      />
                    );
                  })}
              </div>
              <button type="button" onClick={() => onApply(o.finishes)} className="w-full py-1.5 rounded-lg border border-amber-500 text-amber-600 dark:text-amber-400 font-semibold cursor-pointer">
                {copy.apply}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
