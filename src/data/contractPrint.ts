// Draft renovation contract filled from a booking and its itemized estimate.
// It is a starting template for the studio: blanks are left for details the site does not know
// (passport data, legal requisites), and it must be reviewed by a lawyer before use.
import type { BookingRecord, SiteContent } from '../types.ts';
import { WORK_STAGES, WORK_UNIT_LABELS } from './workCatalog.ts';
import { findFinish } from './finishCatalog.ts';
import { PROPERTY_LABELS, TIER_LABELS } from '../i18n.ts';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const kgs = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сом`;
const BLANK = '<span class="blank"></span>';

export function buildContractHtml(b: BookingRecord, content: SiteContent): string {
  const est = b.workEstimate;
  const today = new Date().toLocaleDateString('ru-RU');
  const days = est?.days;

  const scope = est
    ? est.stages
        .map((s, i) => {
          const name = WORK_STAGES.find((w) => w.id === s.id)?.name.ru || s.id;
          const lines = est.lines
            .filter((l) => l.stage === s.id)
            .map(
              (l) =>
                `<tr><td>${esc(l.name)}</td><td class="n">${l.qty.toLocaleString('ru-RU')} ${WORK_UNIT_LABELS[l.unit].ru}</td><td class="n">${kgs(l.workKgs + l.materialsKgs)}</td></tr>`,
            )
            .join('');
          return `<tr class="st"><td colspan="2">Этап ${i + 1}. ${esc(name)} (~${s.days} дн.)</td><td class="n">${kgs(s.totalKgs)}</td></tr>${lines}`;
        })
        .join('')
    : `<tr><td>${esc(b.serviceName)}, ${b.areaSqm} м², класс материалов «${TIER_LABELS[b.materialTier].ru}»</td><td></td><td class="n">${kgs(b.totalPriceKgs)}</td></tr>`;

  const finishes = est?.finishes
    ? content.finishCatalog
        .filter((g) => est.finishes?.[g.id])
        .map((g) => `${esc(g.label.ru)}: ${esc(findFinish(g.id, est.finishes?.[g.id], content.finishCatalog).name.ru)}`)
        .join('; ')
    : '';

  const payments = est
    ? `<ol>${est.stages
        .map(
          (s) =>
            `<li>${esc(WORK_STAGES.find((w) => w.id === s.id)?.name.ru || s.id)} — ${kgs(s.totalKgs)} в течение 3 (трёх) рабочих дней после подписания акта приёмки этапа.</li>`,
        )
        .join('')}</ol>`
    : `<p>Порядок оплаты: ${BLANK}</p>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Договор подряда ${esc(b.id)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: "Times New Roman", Georgia, serif; font-size: 13px; color: #111; line-height: 1.5; margin: 0; padding: 16px; }
  h1 { font-size: 17px; text-align: center; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 16px 0 6px; }
  .c { text-align: center; } .row { display: flex; justify-content: space-between; margin: 8px 0 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; } td { border: 1px solid #999; padding: 3px 6px; vertical-align: top; }
  tr.st td { background: #f2f2f2; font-weight: bold; } .n { text-align: right; white-space: nowrap; }
  .blank { display: inline-block; min-width: 180px; border-bottom: 1px solid #111; height: 1em; }
  .warn { background: #fff4d6; border: 1px solid #e0b100; padding: 8px 10px; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 12px; }
  .sign { display: flex; gap: 40px; margin-top: 24px; } .sign > div { flex: 1; }
  @media print { .noprint { display: none; } body { padding: 0; } }
  .noprint button { background: #f59e0b; border: 0; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; }
</style></head><body>
<div class="noprint warn"><b>Черновик договора.</b> Заполните пустые поля и проверьте текст у юриста перед подписанием.
<button onclick="window.print()" style="margin-left:10px">Печать / PDF</button></div>
<h1>ДОГОВОР ПОДРЯДА № ${esc(b.id)}</h1>
<div class="c">на выполнение ремонтно-отделочных работ</div>
<div class="row"><span>г. Бишкек</span><span>${today}</span></div>

<p><b>Подрядчик:</b> READY HOME, ${BLANK} (наименование / ИП, ИНН), в лице ${BLANK}, действующего на основании ${BLANK}, с одной стороны, и</p>
<p><b>Заказчик:</b> ${esc(b.clientName)}, телефон ${esc(b.phone)}, паспорт ${BLANK}, с другой стороны, заключили настоящий договор о нижеследующем.</p>

<h2>1. Предмет договора</h2>
<p>1.1. Подрядчик обязуется выполнить ремонтно-отделочные работы на объекте Заказчика, а Заказчик — принять и оплатить их.</p>
<p>1.2. Объект: ${esc(b.complexOrDistrict)}${b.addressDetails ? ', ' + esc(b.addressDetails) : ''}, ${PROPERTY_LABELS[b.propertyType].ru.toLowerCase()}, ${b.roomsCount}, площадь ${est ? est.params.areaSqm : b.areaSqm} м²${est?.params.layout ? ` (планировка: ${esc(est.params.layout)})` : ''}.</p>
<p>1.3. Состав и объём работ определены сметой (Приложение 1). Класс материалов: «${TIER_LABELS[est?.params.tier || b.materialTier].ru}».${finishes ? ` Выбранная отделка: ${finishes}.` : ''}</p>

<h2>2. Стоимость и порядок оплаты</h2>
<p>2.1. Стоимость работ и материалов по смете: <b>${kgs(b.totalPriceKgs)}</b>${b.promoCode ? ` (с учётом промокода ${esc(b.promoCode)})` : ''}.</p>
<p>2.2. Оплата производится поэтапно:</p>
${payments}
<p>2.3. Изменение объёма работ оформляется дополнительным соглашением с пересчётом сметы.</p>

<h2>3. Сроки</h2>
<p>3.1. Начало работ: ${BLANK}. Срок выполнения: ${days ? `около ${days} календарных дней` : BLANK} с даты начала, с учётом сроков высыхания материалов.</p>

<h2>4. Приёмка и гарантия</h2>
<p>4.1. Каждый этап принимается по акту. Заказчик вправе отказаться от подписания акта при обоснованных замечаниях, которые Подрядчик устраняет за свой счёт.</p>
<p>4.2. Гарантия на выполненные работы — ${b.warrantyYears} ${b.warrantyYears === 1 ? 'год' : b.warrantyYears < 5 ? 'года' : 'лет'} с даты подписания итогового акта.</p>

<h2>5. Прочие условия</h2>
<p>5.1. Ответственный прораб со стороны Подрядчика: ${esc(b.masterName)}.</p>
<p>5.2. Споры решаются путём переговоров, а при недостижении согласия — в суде по законодательству Кыргызской Республики.</p>

<h2>Приложение 1. Смета</h2>
<table>${scope}<tr class="st"><td colspan="2">Итого</td><td class="n">${kgs(b.totalPriceKgs)}</td></tr></table>

<div class="sign">
  <div><b>Подрядчик</b><br>READY HOME<br>${esc(content.contacts.address.ru)}<br>${esc(content.contacts.phone)}<br><br>_______________ / ${BLANK}</div>
  <div><b>Заказчик</b><br>${esc(b.clientName)}<br>${esc(b.phone)}<br><br><br>_______________ / ${BLANK}</div>
</div>
</body></html>`;
}

export function openContract(b: BookingRecord, content: SiteContent): void {
  const url = URL.createObjectURL(new Blob([buildContractHtml(b, content)], { type: 'text/html;charset=utf-8' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
