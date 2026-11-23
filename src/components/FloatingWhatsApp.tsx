import { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import type { ContactsConfig } from '../types.ts';

interface FloatingWhatsAppProps {
  contacts: ContactsConfig;
  onOpenBooking: () => void;
}

export function FloatingWhatsApp({ contacts, onOpenBooking }: FloatingWhatsAppProps) {
  const [open, setOpen] = useState(false);
  const [quickMsg, setQuickMsg] = useState('');

  const waLink = `https://wa.me/${contacts.whatsapp}?text=${encodeURIComponent(
    quickMsg.trim() || 'Здравствуйте, READY HOME! Интересует расчёт ремонта квартиры в Бишкеке.',
  )}`;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 rounded-2xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 bg-[#131d33] text-white flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">READY HOME Бишкек</div>
              <div className="text-xs text-slate-300">Отвечаем в WhatsApp за 5 минут</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть чат"
              className="p-1 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Напишите площадь и ЖК вашей квартиры или дома — инженер подскажет ориентировочный бюджет и свободные даты замера.
            </p>
            <textarea
              rows={2}
              value={quickMsg}
              onChange={(e) => setQuickMsg(e.target.value)}
              placeholder="Например: ЖК Авангард, 82 м², ремонт под ключ..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
            />
            <div className="flex flex-col gap-2">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Отправить в WhatsApp
              </a>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenBooking();
                }}
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-amber-500 cursor-pointer"
              >
                Записаться на замер на сайте
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Чат с READY HOME в WhatsApp"
        className="w-13 h-13 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xl flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
