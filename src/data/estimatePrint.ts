// Printable estimate: opens a clean A4 page and the browser's "Save as PDF" dialog.
// Using the browser's own PDF export keeps Cyrillic text perfect without bundling fonts.
import type { ContactsConfig, WorkEstimate } from '../types.ts';
import { WORK_STAGES, WORK_UNIT_LABELS } from './workCatalog.ts';
import { FINISH_GROUPS, findFinish, type FinishGroup } from './finishCatalog.ts';
import { TIER_LABELS } from '../i18n.ts';
import { buyLabel, computeShoppingList } from './materialsCatalog.ts';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const kgs = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сом`;

export function buildEstimateHtml(
  est: WorkEstimate,
  contacts: ContactsConfig,
  shareUrl: string,
  groups: FinishGroup[] = FINISH_GROUPS,
): string {
  const p = est.params;
  const date = new Date().toLocaleDateString('ru-RU');
  const stageBlocks = est.stages
    .map((s) => {
      const name = WORK_STAGES.find((w) => w.id === s.id)?.name.ru || s.id;
      const rows = est.lines
        .filter((l) => l.stage === s.id)
        .map(
          (l) => `<tr>
            <td>${esc(l.name)}</td>
            <td class="n">${l.qty.toLocaleString('ru-RU')} ${WORK_UNIT_LABELS[l.unit].ru}</td>
            <td class="n">${kgs(l.workKgs)}</td>
            <td class="n">${kgs(l.materialsKgs)}</td>
            <td class="n b">${kgs(l.workKgs + l.materialsKgs)}</td>
          </tr>`,
        )
        .join('');
      return `<tr class="stage"><td colspan="4">${esc(name)} · ~${s.days} дн.</td><td class="n">${kgs(s.totalKgs)}</td></tr>${rows}`;
    })
    .join('');

  const finishes = groups
    .filter((g) => est.finishes?.[g.id])
    .map((g) => {
      const op = findFinish(g.id, est.finishes?.[g.id], groups);
      return `<li><span class="sw" style="background:${esc(op.color)}"></span>${esc(g.label.ru)}: <b>${esc(op.name.ru)}</b></li>`;
    })
    .join('');

  const shopping = computeShoppingList(est)
    .map((i) => `<tr><td>${esc(i.name)}</td><td class="n">${esc(buyLabel(i))}</td><td class="n muted">${i.byUnit ? "" : "≈ " + i.amount + " " + esc(i.unit)}</td></tr>`)
    .join('');

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Смета READY HOME — ${p.rooms}-комн, ${p.areaSqm} м²</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 0; padding: 16px; }
  h1 { font-size: 20px; margin: 0; }
  .brand { font-weight: 800; font-size: 18px; letter-spacing: .5px; }
  .brand span { color: #d97706; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; margin-bottom: 12px; }
  .muted { color: #64748b; }
  .params { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 8px 0 14px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-size: 11px; }
  .n { text-align: right; white-space: nowrap; }
  .b { font-weight: 700; }
  tr.stage td { background: #fef3c7; font-weight: 700; border-top: 6px solid #fff; }
  .totals { margin-top: 14px; margin-left: auto; width: 320px; }
  .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
  .grand { font-size: 18px; font-weight: 800; color: #b45309; border-top: 2px solid #f59e0b; margin-top: 4px; padding-top: 6px !important; }
  ul.fin { list-style: none; padding: 0; columns: 2; margin: 6px 0 0; }
  ul.fin li { margin: 3px 0; break-inside: avoid; }
  .sw { display: inline-block; width: 11px; height: 11px; border-radius: 50%; border: 1px solid #cbd5e1; margin-right: 6px; vertical-align: -1px; }
  .note { margin-top: 16px; font-size: 10.5px; }
  .foot { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; }
  a { color: #b45309; word-break: break-all; }
  @media print { body { padding: 0; } .noprint { display: none; } }
  .noprint { margin-bottom: 12px; }
  .noprint button { background: #f59e0b; border: 0; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; }
</style></head><body>
<div class="noprint"><button onclick="window.print()">Сохранить в PDF / Печать</button></div>
<div class="head">
  <div><div class="brand">READY <span>HOME</span></div><div class="muted">Ремонт квартир и домов в Бишкеке</div></div>
  <div style="text-align:right"><h1>Смета на ремонт</h1><div class="muted">от ${date}</div></div>
</div>
<div class="params">
  <div><b>${p.rooms}-комнатная</b>, ${p.areaSqm} м²</div>
  ${p.layout ? `<div>Планировка: ${esc(p.layout)}</div>` : ''}
  <div>Потолки: ${p.ceilingHeight} м</div>
  <div>Санузлов: ${p.bathrooms}</div>
  <div>${p.propertyType === 'secondary' ? 'Вторичное жильё' : 'Новостройка (ПСО)'}</div>
  <div>Материалы: ${TIER_LABELS[p.tier].ru}</div>
</div>
<table>
  <thead><tr><th>Работа</th><th class="n">Объём</th><th class="n">Работа</th><th class="n">Материалы</th><th class="n">Сумма</th></tr></thead>
  <tbody>${stageBlocks}</tbody>
</table>
<div class="totals">
  <div><span>Работы бригады</span><b>${kgs(est.workKgs)}</b></div>
  <div><span>Материалы</span><b>${kgs(est.materialsKgs)}</b></div>
  <div><span>Срок</span><b>~${est.days} дней</b></div>
  <div class="grand"><span>Итого</span><span>${kgs(est.totalKgs)}</span></div>
  <div class="muted"><span>Цена за м²</span><span>${kgs(est.totalKgs / p.areaSqm)}</span></div>
</div>
${finishes ? `<h3 style="margin:16px 0 0;font-size:13px">Выбранная отделка</h3><ul class="fin">${finishes}</ul>` : ''}
${shopping ? `<h3 style="margin:16px 0 4px;font-size:13px">Список закупки материалов (ориентировочно)</h3><table><tbody>${shopping}</tbody></table>` : ''}
<p class="note muted">Предварительная смета по типовой планировке. Точная стоимость фиксируется в договоре после бесплатного замера инженером.
Открыть и изменить эту смету онлайн: <a href="${esc(shareUrl)}">${esc(shareUrl)}</a></p>
<div class="foot">${esc(contacts.address.ru)} · ${esc(contacts.phone)} · WhatsApp +${esc(contacts.whatsapp)} · Telegram @${esc(contacts.telegram)}</div>
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>
</body></html>`;
}

export function openPrintableEstimate(
  est: WorkEstimate,
  contacts: ContactsConfig,
  shareUrl: string,
  groups: FinishGroup[] = FINISH_GROUPS,
): boolean {
  const html = buildEstimateHtml(est, contacts, shareUrl, groups);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const win = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return Boolean(win);
}
