import { useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, ShoppingCart } from 'lucide-react';
import type { Lang, WorkEstimate } from '../types.ts';
import { buyLabel, computeShoppingList, shoppingListText } from '../data/materialsCatalog.ts';

const COPY = {
  ru: { title: 'Список закупки материалов', items: 'позиций', note: 'Ориентировочно, по средним нормам расхода с запасом на подрезку. Точный список составляет прораб после замера.', copy: 'Скопировать список', copied: 'Скопировано', material: 'Материал', qty: 'Сколько купить' },
  ky: { title: 'Материалдарды сатып алуу тизмеси', items: 'позиция', note: 'Болжолдуу, орточо чыгым нормалары боюнча запас менен. Так тизмени прораб өлчөөдөн кийин түзөт.', copy: 'Тизмени көчүрүү', copied: 'Көчүрүлдү', material: 'Материал', qty: 'Канча сатып алуу' },
  en: { title: 'Materials shopping list', items: 'items', note: 'Approximate, based on average consumption with a cutting allowance. The foreman confirms the list after measuring.', copy: 'Copy list', copied: 'Copied', material: 'Material', qty: 'To buy' },
} as const;

export function ShoppingList({ estimate, lang }: { estimate: WorkEstimate; lang: Lang }) {
  const copy = COPY[lang];
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const items = useMemo(() => computeShoppingList(estimate), [estimate]);
  if (items.length === 0) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${copy.title}\n${shoppingListText(items)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked: nothing else to do
    }
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-[#192540] border border-slate-200 dark:border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 sm:px-7 py-4 text-left cursor-pointer"
      >
        <span className="font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-amber-500" /> {copy.title}
          <span className="text-xs font-normal text-slate-500">
            {items.length} {copy.items}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 sm:px-7 pb-5">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{copy.note}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 text-left">
                  <th className="py-1.5 pr-3 font-medium">{copy.material}</th>
                  <th className="py-1.5 font-medium text-right">{copy.qty}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.name + i.packLabel} className="border-t border-slate-200 dark:border-white/10">
                    <td className="py-2 pr-3 text-slate-800 dark:text-slate-100">{i.name}</td>
                    <td className="py-2 text-right tabular-nums whitespace-nowrap">
                      <b className="text-slate-900 dark:text-white">{buyLabel(i)}</b>
                      {!i.byUnit && (
                        <span className="block text-xs text-slate-500">
                          ≈ {i.amount} {i.unit}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? copy.copied : copy.copy}
          </button>
        </div>
      )}
    </div>
  );
}
