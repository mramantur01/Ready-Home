import { useEffect, useState } from 'react';
import { Bot, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../apiClient.ts';

type Status = { configured: boolean; fromEnv: boolean; last4: string };

// Admin: paste the Gemini API key. The server checks it with Google, stores it and never shows it again.
export function AiKeySettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const res = await apiFetch<Status>('/api/admin/ai-key', { auth: 'admin' });
    if (res.ok) setStatus(res.data);
  };
  useEffect(() => {
    void load();
  }, []);

  const save = async (value: string) => {
    setBusy(true);
    setMsg('');
    setError('');
    let res: { ok: boolean; status: number; data: { ok?: boolean; configured?: boolean; error?: string } };
    try {
      res = await apiFetch<{ ok?: boolean; configured?: boolean; error?: string }>('/api/admin/ai-key', {
        method: 'POST',
        auth: 'admin',
        body: JSON.stringify({ key: value }),
      });
    } catch {
      res = { ok: false, status: 0, data: { error: 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.' } };
    } finally {
      setBusy(false);
    }
    setKey('');
    if (!res.ok) {
      setError(res.data.error || 'Не удалось сохранить ключ.');
      return;
    }
    setMsg(res.data.configured ? 'Ключ проверен и сохранён. ИИ-консультант и подбор по фото включены на сайте.' : 'Ключ удалён. ИИ выключен.');
    await load();
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3 mb-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Bot className="w-4 h-4 text-amber-500" /> ИИ-консультант и подбор отделки по фото (Gemini)
      </div>
      {status?.configured ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          Включено{status.fromEnv ? ' (ключ задан в Vercel)' : status.last4 ? ` · ключ …${status.last4}` : ''}
        </p>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Выключено. Создайте ключ на aistudio.google.com → «Get API key» → «Create API key», скопируйте и вставьте сюда.
          Сайт проверит ключ и сохранит его на сервере — посетители его не видят.
        </p>
      )}
      {!status?.fromEnv && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (key.trim()) void save(key.trim());
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIza…"
            aria-label="Ключ Gemini API"
            className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !key.trim()}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Проверяем…' : 'Сохранить и проверить'}
          </button>
          {status?.configured && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Удалить ключ и выключить ИИ на сайте?')) void save('');
              }}
              className="px-4 py-2 rounded-xl border border-rose-500/50 text-rose-600 text-sm font-semibold cursor-pointer"
            >
              Удалить ключ
            </button>
          )}
        </form>
      )}
      {msg && <p className="text-xs text-emerald-600 dark:text-emerald-400">{msg}</p>}
      {error && (
        <p className="text-xs text-rose-500" role="alert">
          {error}
        </p>
      )}
      <p className="text-[11px] text-slate-500">
        Запросы к Gemini сверх бесплатного уровня Google оплачиваются. На сайте стоят лимиты: 30 вопросов в час на посетителя,
        1500 в день всего, 6 подборов по фото в час.
      </p>
    </div>
  );
}
