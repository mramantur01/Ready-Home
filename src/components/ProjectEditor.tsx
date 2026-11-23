import { useState } from 'react';
import { Camera, Plus, Save, Trash2, X } from 'lucide-react';
import type { BookingRecord, ProjectProgress, ProjectStage, ProjectStageStatus } from '../types.ts';
import { WORK_STAGES } from '../data/workCatalog.ts';
import { apiFetch } from '../apiClient.ts';
import { compressImage } from '../lib/compressImage.ts';
import { formatKgs } from '../i18n.ts';

export const STAGE_STATUS_LABELS: Record<ProjectStageStatus, string> = {
  planned: 'Запланирован',
  in_progress: 'В работе',
  ready: 'Готов — ждёт приёмки клиентом',
  accepted: 'Принят',
};

function initialProject(b: BookingRecord): ProjectProgress {
  const stages: ProjectStage[] = b.workEstimate
    ? b.workEstimate.stages.map((s) => ({
        id: s.id,
        name: WORK_STAGES.find((w) => w.id === s.id)?.name.ru || s.id,
        amountKgs: s.totalKgs,
        paidKgs: 0,
        status: 'planned',
        photos: [],
      }))
    : [{ id: 'st-1', name: 'Ремонт', amountKgs: b.totalPriceKgs, paidKgs: 0, status: 'planned', photos: [] }];
  return { startedAt: new Date().toISOString(), stages };
}

interface ProjectEditorProps {
  booking: BookingRecord;
  onSaved: (b: BookingRecord) => void;
}

// Admin: renovation progress for one booking — stages, payments, photo reports.
export function ProjectEditor({ booking, onSaved }: ProjectEditorProps) {
  const [project, setProject] = useState<ProjectProgress>(booking.project || initialProject(booking));
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const patchStage = (id: string, change: Partial<ProjectStage>) =>
    setProject((p) => ({ ...p, stages: p.stages.map((s) => (s.id === id ? { ...s, ...change } : s)) }));

  const upload = async (stage: ProjectStage, files: FileList | null) => {
    if (!files?.length) return;
    setBusy(stage.id);
    setMsg('');
    const added: ProjectStage['photos'] = [];
    for (const file of Array.from(files).slice(0, 10)) {
      try {
        const data = await compressImage(file);
        const res = await apiFetch<{ id?: string; error?: string }>('/api/photos', {
          method: 'POST',
          auth: 'admin',
          body: JSON.stringify({ data }),
        });
        if (res.ok && res.data.id) added.push({ id: res.data.id, at: new Date().toISOString() });
        else setMsg(res.data.error || 'Фото не загрузилось.');
      } catch {
        setMsg('Не удалось обработать фото.');
      }
    }
    setBusy('');
    if (added.length) {
      setProject((p) => ({
        ...p,
        stages: p.stages.map((s) => (s.id === stage.id ? { ...s, photos: [...s.photos, ...added] } : s)),
      }));
      setMsg(`Загружено фото: ${added.length}. Нажмите «Сохранить ход работ».`);
    }
  };

  const save = async () => {
    setBusy('save');
    const res = await apiFetch<{ ok?: boolean; booking?: BookingRecord; error?: string }>('/api/bookings', {
      method: 'PATCH',
      auth: 'admin',
      body: JSON.stringify({ id: booking.id, project }),
    });
    setBusy('');
    if (res.ok && res.data.booking) {
      onSaved(res.data.booking);
      setMsg('Сохранено — клиент видит это в личном кабинете.');
    } else {
      setMsg(res.data.error || 'Ошибка сохранения.');
    }
  };

  const total = project.stages.reduce((s, x) => s + x.amountKgs, 0);
  const paid = project.stages.reduce((s, x) => s + x.paidKgs, 0);
  const field = 'px-2 py-1.5 rounded-lg bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-xs';

  return (
    <div className="mt-2 rounded-2xl border border-amber-500/30 bg-white/60 dark:bg-white/5 p-3 space-y-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-slate-900 dark:text-white">
          Ход работ · оплачено {formatKgs(paid)} из {formatKgs(total)}
        </span>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy === 'save'}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold disabled:opacity-60 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" /> Сохранить ход работ
        </button>
      </div>
      {project.stages.map((s) => (
        <div key={s.id} className="rounded-xl border border-slate-200 dark:border-white/10 p-2.5 space-y-2">
          <div className="grid grid-cols-12 gap-2 items-end">
            <label className="col-span-12 sm:col-span-4 space-y-0.5">
              <span className="text-slate-500">Этап</span>
              <input value={s.name} onChange={(e) => patchStage(s.id, { name: e.target.value })} className={field + ' w-full'} />
            </label>
            <label className="col-span-6 sm:col-span-3 space-y-0.5">
              <span className="text-slate-500">Статус</span>
              <select value={s.status} onChange={(e) => patchStage(s.id, { status: e.target.value as ProjectStageStatus })} className={field + ' w-full'}>
                {(Object.keys(STAGE_STATUS_LABELS) as ProjectStageStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {STAGE_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-3 sm:col-span-2 space-y-0.5">
              <span className="text-slate-500">Сумма</span>
              <input type="number" min={0} value={s.amountKgs} onChange={(e) => patchStage(s.id, { amountKgs: Number(e.target.value) || 0 })} className={field + ' w-full tabular-nums'} />
            </label>
            <label className="col-span-3 sm:col-span-2 space-y-0.5">
              <span className="text-slate-500">Оплачено</span>
              <input type="number" min={0} value={s.paidKgs} onChange={(e) => patchStage(s.id, { paidKgs: Number(e.target.value) || 0 })} className={field + ' w-full tabular-nums'} />
            </label>
            <div className="col-span-12 sm:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={() => setProject((p) => ({ ...p, stages: p.stages.filter((x) => x.id !== s.id) }))}
                className="text-rose-500 p-1.5 cursor-pointer"
                aria-label="Удалить этап"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {s.photos.map((ph) => (
              <span key={ph.id} className="relative">
                <img src={`/api/photo/${ph.id}`} alt="" loading="lazy" className="w-14 h-14 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => patchStage(s.id, { photos: s.photos.filter((x) => x.id !== ph.id) })}
                  className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 cursor-pointer"
                  aria-label="Убрать фото"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-400 dark:border-white/25 cursor-pointer">
              <Camera className="w-3.5 h-3.5" /> {busy === s.id ? 'Загрузка…' : 'Фото'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void upload(s, e.target.files)} />
            </label>
            {s.acceptedAt && <span className="text-emerald-600">Принят {new Date(s.acceptedAt).toLocaleDateString('ru-RU')}</span>}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setProject((p) => ({
            ...p,
            stages: [...p.stages, { id: `st-${Date.now()}`, name: 'Новый этап', amountKgs: 0, paidKgs: 0, status: 'planned', photos: [] }],
          }))
        }
        className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Этап
      </button>
      {msg && <p className="text-slate-600 dark:text-slate-300">{msg}</p>}
    </div>
  );
}
