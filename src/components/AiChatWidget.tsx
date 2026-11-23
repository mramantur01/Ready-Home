import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { apiFetch } from '../apiClient.ts';
import type { Lang } from '../types.ts';

const COPY = {
  ru: { open: 'Спросить ИИ-консультанта', title: 'ИИ-консультант READY HOME', hello: 'Здравствуйте! Спросите о ценах на работы, этапах ремонта или материалах — отвечу по прайсу студии.', placeholder: 'Например: сколько стоит плитка в ванной 4 м²?', note: 'Ответы ИИ ориентировочные. Точную цену назовёт инженер после замера.' },
  ky: { open: 'ИИ-кеңешчиден суроо', title: 'READY HOME ИИ-кеңешчиси', hello: 'Саламатсызбы! Иштердин баасы, оңдоо этаптары же материалдар жөнүндө сураңыз.', placeholder: 'Мисалы: ваннадагы 4 м² плитка канча турат?', note: 'ИИ жооптору болжолдуу. Так бааны инженер өлчөөдөн кийин айтат.' },
  en: { open: 'Ask the AI consultant', title: 'READY HOME AI consultant', hello: 'Hi! Ask about job prices, renovation stages or materials — I answer from the studio price list.', placeholder: 'E.g. how much are bathroom tiles for 4 m²?', note: 'AI answers are approximate. The engineer confirms the price after measuring.' },
} as const;

type Msg = { role: 'user' | 'model'; text: string };

export function AiChatWidget({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void apiFetch<{ enabled?: boolean }>('/api/ai/status').then((r) => setEnabled(Boolean(r.ok && r.data.enabled)));
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, busy]);

  if (!enabled) return null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: 'user' as const, text: q }];
    setMsgs(next);
    setText('');
    setBusy(true);
    const res = await apiFetch<{ reply?: string; error?: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: next.slice(-10) }),
    });
    setBusy(false);
    setMsgs((m) => [...m, { role: 'model', text: res.data.reply || res.data.error || 'Ошибка. Попробуйте ещё раз.' }]);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg text-sm font-semibold cursor-pointer"
        >
          <Bot className="w-5 h-5 text-amber-400 dark:text-amber-600" />
          <span className="hidden sm:inline">{copy.open}</span>
        </button>
      )}
      {open && (
        <div
          className="fixed z-50 bottom-0 left-0 right-0 sm:bottom-5 sm:left-5 sm:right-auto sm:w-96 h-[70vh] sm:h-[520px] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 shadow-2xl"
          role="dialog"
          aria-label={copy.title}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10">
            <span className="font-semibold text-sm text-slate-900 dark:text-white inline-flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber-500" /> {copy.title}
            </span>
            <button type="button" onClick={() => setOpen(false)} className="p-1 cursor-pointer" aria-label="Закрыть">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm" aria-live="polite">
            <div className="rounded-2xl bg-slate-100 dark:bg-white/5 p-3 text-slate-700 dark:text-slate-200">{copy.hello}</div>
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`rounded-2xl p-3 whitespace-pre-wrap ${
                  m.role === 'user' ? 'ml-8 bg-amber-500 text-slate-950' : 'mr-8 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-100'
                }`}
              >
                {m.text}
              </div>
            ))}
            {busy && <div className="mr-8 rounded-2xl p-3 bg-slate-100 dark:bg-white/5 text-slate-500 animate-pulse">…</div>}
          </div>
          <form onSubmit={send} className="p-3 border-t border-slate-200 dark:border-white/10">
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={copy.placeholder}
                maxLength={800}
                aria-label={copy.placeholder}
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
              />
              <button type="submit" disabled={busy || !text.trim()} className="px-3 rounded-xl bg-amber-500 text-slate-950 disabled:opacity-50 cursor-pointer" aria-label="Отправить">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500">{copy.note}</p>
          </form>
        </div>
      )}
    </>
  );
}
