import { useState } from 'react';
import { CheckCircle2, Circle, Clock, Hammer, X } from 'lucide-react';
import type { BookingRecord, ProjectStageStatus } from '../types.ts';
import { apiFetch } from '../apiClient.ts';
import { formatKgs } from '../i18n.ts';

const LABEL: Record<ProjectStageStatus, string> = {
  planned: 'Запланирован',
  in_progress: 'В работе',
  ready: 'Готов — проверьте и примите',
  accepted: 'Принят',
};

const ICON: Record<ProjectStageStatus, typeof Circle> = {
  planned: Circle,
  in_progress: Hammer,
  ready: Clock,
  accepted: CheckCircle2,
};

interface ProjectTimelineProps {
  booking: BookingRecord;
  onUpdated: (b: BookingRecord) => void;
}

// Client cabinet: renovation progress with stage acceptance, payments and photo reports.
export function ProjectTimeline({ booking, onUpdated }: ProjectTimelineProps) {
  const project = booking.project;
  const [busy, setBusy] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  if (!project || project.stages.length === 0) return null;

  const total = project.stages.reduce((s, x) => s + x.amountKgs, 0);
  const paid = project.stages.reduce((s, x) => s + x.paidKgs, 0);
  const done = project.stages.filter((s) => s.status === 'accepted').length;
  const pct = Math.round((done / project.stages.length) * 100);

  const accept = async (stageId: string, name: string) => {
    if (!window.confirm(`Подтвердить, что этап «${name}» выполнен и вы его принимаете?`)) return;
    setBusy(stageId);
    setError('');
    const res = await apiFetch<{ ok?: boolean; booking?: BookingRecord; error?: string }>('/api/account', {
      method: 'POST',
      auth: 'client',
      body: JSON.stringify({ action: 'accept-stage', bookingId: booking.id, stageId }),
    });
    setBusy('');
    if (res.ok && res.data.booking) onUpdated(res.data.booking);
    else setError(res.data.error || 'Не удалось подтвердить. Попробуйте ещё раз.');
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-900 dark:text-white">Ход ремонта: {pct}%</span>
        <span className="text-slate-500 dark:text-slate-400 tabular-nums">
          Оплачено {formatKgs(paid)} из {formatKgs(total)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <ol className="space-y-2">
        {project.stages.map((s) => {
          const Icon = ICON[s.status];
          return (
            <li key={s.id} className="rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <Icon
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      s.status === 'accepted' ? 'text-emerald-500' : s.status === 'ready' ? 'text-amber-500' : s.status === 'in_progress' ? 'text-sky-500' : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{s.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {LABEL[s.status]}
                      {s.acceptedAt && ` · ${new Date(s.acceptedAt).toLocaleDateString('ru-RU')}`}
                      {s.amountKgs > 0 && ` · ${formatKgs(s.paidKgs)} / ${formatKgs(s.amountKgs)}`}
                    </div>
                  </div>
                </div>
                {s.status === 'ready' && (
                  <button
                    type="button"
                    disabled={busy === s.id}
                    onClick={() => void accept(s.id, s.name)}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold disabled:opacity-60 cursor-pointer"
                  >
                    Принять этап
                  </button>
                )}
              </div>
              {s.photos.length > 0 && (
                <div className="mt-2 flex gap-1.5 overflow-x-auto">
                  {s.photos.map((ph) => (
                    <button key={ph.id} type="button" onClick={() => setPhoto(ph.id)} className="shrink-0 cursor-zoom-in" aria-label="Открыть фото">
                      <img src={`/api/photo/${ph.id}`} alt={ph.caption || s.name} loading="lazy" className="w-16 h-16 object-cover rounded-lg" />
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
      {photo && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setPhoto(null)}>
          <button type="button" className="absolute top-4 right-4 text-white p-2 cursor-pointer" aria-label="Закрыть">
            <X className="w-6 h-6" />
          </button>
          <img src={`/api/photo/${photo}`} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
