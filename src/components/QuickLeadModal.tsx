import { useState } from 'react';
import { CheckCircle2, MessageCircle, Phone, Send, X } from 'lucide-react';
import type { BookingDraft, ContactsConfig, Lang } from '../types.ts';
import { apiFetch } from '../apiClient.ts';
import { formatKgs } from '../i18n.ts';

const COPY = {
  ru: {
    title: 'Оставьте номер — мы перезвоним',
    subtitle: 'Без регистрации. Инженер свяжется с вами, ответит на вопросы и согласует бесплатный замер.',
    name: 'Ваше имя',
    phone: 'Телефон',
    how: 'Как удобнее связаться',
    call: 'Звонок',
    comment: 'Комментарий (необязательно)',
    send: 'Жду звонка',
    sending: 'Отправляем…',
    attached: 'К заявке прикреплена ваша смета',
    doneTitle: 'Заявка принята',
    doneText: 'Мы свяжемся с вами в рабочее время. Номер заявки:',
    waText: 'Отправить смету нам в WhatsApp',
    tgText: 'Написать в Telegram',
    or: 'Хотите сразу выбрать дату замера?',
    login: 'Войти и записаться на замер',
    privacy: 'Нажимая кнопку, вы соглашаетесь, чтобы студия связалась с вами по этому номеру.',
  },
  ky: {
    title: 'Номериңизди калтырыңыз — биз чалабыз',
    subtitle: 'Каттоосуз. Инженер сиз менен байланышып, суроолорго жооп берет жана акысыз өлчөөнү макулдашат.',
    name: 'Атыңыз',
    phone: 'Телефон',
    how: 'Кантип байланышуу ыңгайлуу',
    call: 'Чалуу',
    comment: 'Комментарий (милдеттүү эмес)',
    send: 'Чалууну күтөм',
    sending: 'Жөнөтүлүүдө…',
    attached: 'Арызга сметаңыз тиркелди',
    doneTitle: 'Арыз кабыл алынды',
    doneText: 'Жумуш убактысында байланышабыз. Арыздын номери:',
    waText: 'Сметаны бизге WhatsApp аркылуу жөнөтүү',
    tgText: 'Telegram аркылуу жазуу',
    or: 'Өлчөө күнүн азыр тандагыңыз келеби?',
    login: 'Кирип, өлчөөгө жазылуу',
    privacy: 'Баскычты басуу менен студия сиз менен ушул номер аркылуу байланышына макулсуз.',
  },
  en: {
    title: 'Leave your number — we will call you back',
    subtitle: 'No sign-up. An engineer will call, answer questions and arrange a free measurement.',
    name: 'Your name',
    phone: 'Phone',
    how: 'Preferred contact',
    call: 'Call',
    comment: 'Comment (optional)',
    send: 'Call me back',
    sending: 'Sending…',
    attached: 'Your estimate is attached',
    doneTitle: 'Request received',
    doneText: 'We will contact you during working hours. Request number:',
    waText: 'Send the estimate to us on WhatsApp',
    tgText: 'Message us on Telegram',
    or: 'Want to pick a measurement date now?',
    login: 'Sign in and book a measurement',
    privacy: 'By pressing the button you agree that the studio may contact you on this number.',
  },
} as const;

interface QuickLeadModalProps {
  open: boolean;
  draft: BookingDraft;
  lang: Lang;
  contacts: ContactsConfig;
  onClose: () => void;
  onFullBooking: () => void; // sign in and use the full booking wizard
}

export function QuickLeadModal({ open, draft, lang, contacts, onClose, onFullBooking }: QuickLeadModalProps) {
  const copy = COPY[lang];
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+996 ');
  const [how, setHow] = useState<'call' | 'whatsapp' | 'telegram'>('call');
  const [comment, setComment] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [doneId, setDoneId] = useState('');

  if (!open) return null;

  const estimate = draft.workEstimate?.preview;
  const shareUrl = draft.shareCode ? `${window.location.origin}/#estimate=${draft.shareCode}` : '';
  const waMessage = [
    `Здравствуйте, READY HOME! ${doneId ? `Заявка ${doneId}. ` : ''}`,
    estimate ? `Моя смета: ${estimate.params.rooms}-комн, ${estimate.params.areaSqm} м² — ${formatKgs(estimate.totalKgs)}.` : '',
    shareUrl,
  ]
    .filter(Boolean)
    .join(' ');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await apiFetch<{ ok?: boolean; id?: string; error?: string }>('/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        name,
        phone,
        contactMethod: how,
        comment,
        website,
        workEstimate: draft.workEstimate
          ? { params: draft.workEstimate.params, selections: draft.workEstimate.selections, finishes: draft.workEstimate.finishes }
          : undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.data.error || 'Не удалось отправить. Попробуйте ещё раз или позвоните нам.');
      return;
    }
    setDoneId(res.data.id || '');
  };

  const field =
    'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70" role="dialog" aria-modal="true" aria-labelledby="quick-lead-title">
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 id="quick-lead-title" className="text-lg font-bold text-slate-900 dark:text-white">
            {doneId ? copy.doneTitle : copy.title}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>

        {doneId ? (
          <div className="mt-3 space-y-4">
            <div className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <p>
                {copy.doneText} <b className="tabular-nums">{doneId}</b>
              </p>
            </div>
            {contacts.whatsapp && (
              <a
                href={`https://wa.me/${contacts.whatsapp}?text=${encodeURIComponent(waMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm"
              >
                <MessageCircle className="w-4 h-4" /> {copy.waText}
              </a>
            )}
            {contacts.telegram && (
              <a
                href={`https://t.me/${contacts.telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-sky-500/50 text-sky-600 dark:text-sky-400 font-semibold text-sm"
              >
                <Send className="w-4 h-4" /> {copy.tgText}
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-2 space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">{copy.subtitle}</p>
            {estimate && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                {copy.attached}: {estimate.params.rooms}-комн · {estimate.params.areaSqm} м² ·{' '}
                <b className="tabular-nums">{formatKgs(estimate.totalKgs)}</b>
              </div>
            )}
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{copy.name}</span>
              <input required minLength={2} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{copy.phone}</span>
              <input required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field + ' tabular-nums'} />
            </label>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{copy.how}</span>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['call', copy.call, Phone],
                  ['whatsapp', 'WhatsApp', MessageCircle],
                  ['telegram', 'Telegram', Send],
                ] as const).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setHow(id)}
                    aria-pressed={how === id}
                    className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                      how === id ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{copy.comment}</span>
              <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} className={field} />
            </label>
            {/* Hidden from people; bots fill it in. */}
            <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden="true" />
            {error && <p className="text-sm text-rose-500" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-sm cursor-pointer"
            >
              {busy ? copy.sending : copy.send}
            </button>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{copy.privacy}</p>
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
              {copy.or}{' '}
              <button type="button" onClick={onFullBooking} className="font-semibold text-amber-600 dark:text-amber-400 underline cursor-pointer">
                {copy.login}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
