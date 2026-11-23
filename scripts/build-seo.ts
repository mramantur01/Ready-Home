// Generates static, search-engine-friendly landing pages after `vite build`:
//   /remont/                       hub
//   /remont/<n>-komnatnaya-kvartira  1–5 rooms
//   /remont/<series>                new builds, 106, 105, Khrushchyovka, Stalinka
//   /ceny-na-remont                full price list (numbers refresh from the live API in the browser)
// plus sitemap.xml and robots.txt. Every page links into the online estimate prefilled for that layout.
import fs from 'node:fs';
import path from 'node:path';
import { TYPICAL_LAYOUTS, layoutTitle } from '../src/data/layoutCatalog.ts';
import { computeWorkEstimate, defaultSelections, DEFAULT_PRICE_LIST, WORK_STAGES, WORK_UNIT_LABELS } from '../src/data/workCatalog.ts';
import { DEFAULT_SITE_CONTENT } from '../src/data/defaultContent.ts';
import { encodeEstimate } from '../src/data/estimateShare.ts';
import type { ApartmentLayout, ApartmentParams, MaterialTier } from '../src/types.ts';

const DIST = path.resolve(process.cwd(), 'dist');
const host = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://ready-home-ten.vercel.app');
const SITE = host.replace(/\/+$/, '');
const contacts = DEFAULT_SITE_CONTENT.contacts;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const kgs = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сом`;
const round1000 = (n: number) => Math.round(n / 1000) * 1000;

function paramsOf(l: ApartmentLayout, tier: MaterialTier): ApartmentParams {
  return {
    rooms: l.rooms,
    areaSqm: l.areaSqm,
    ceilingHeight: l.ceilingHeight,
    bathrooms: l.bathrooms,
    propertyType: l.propertyType === 'secondary' ? 'secondary' : 'newbuild',
    tier,
    layout: layoutTitle(l),
  };
}

function estimateFor(l: ApartmentLayout, tier: MaterialTier) {
  const p = paramsOf(l, tier);
  return computeWorkEstimate(DEFAULT_PRICE_LIST, p, defaultSelections(DEFAULT_PRICE_LIST, p));
}

function estimateLink(l: ApartmentLayout): string {
  const code = encodeEstimate({ params: paramsOf(l, 'comfort'), enabled: {}, qty: {}, finishes: {} });
  return `/#estimate=${code}`;
}

const CSS = `
*{box-sizing:border-box}body{margin:0;font-family:"Plus Jakarta Sans",-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:#131d33;color:#e2e8f0;line-height:1.6}
a{color:#fbbf24}header,main,footer{max-width:960px;margin:0 auto;padding:0 16px}
header{display:flex;justify-content:space-between;align-items:center;padding-top:18px;padding-bottom:18px;border-bottom:1px solid #ffffff14}
.brand{font-weight:800;font-size:20px;color:#fff;text-decoration:none}.brand span{color:#f59e0b}
h1{font-size:clamp(26px,5vw,38px);line-height:1.2;color:#fff;margin:28px 0 12px}h2{color:#fff;font-size:22px;margin:32px 0 10px}
.lead{color:#cbd5e1;font-size:17px}.cta{display:inline-block;background:#f59e0b;color:#0f172a;font-weight:700;padding:14px 20px;border-radius:12px;text-decoration:none;margin:8px 8px 8px 0}
.cta.ghost{background:transparent;color:#fbbf24;border:1px solid #fbbf2466}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:15px}th,td{padding:8px 10px;border-bottom:1px solid #ffffff14;text-align:left;vertical-align:top}
th{color:#94a3b8;font-weight:600;font-size:13px}.n{text-align:right;white-space:nowrap}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}.card{background:#192540;border:1px solid #ffffff14;border-radius:16px;padding:16px;text-decoration:none;color:#e2e8f0}
.card b{color:#fff;display:block}.muted{color:#94a3b8;font-size:14px}footer{padding-top:28px;padding-bottom:40px;color:#94a3b8;font-size:14px;border-top:1px solid #ffffff14;margin-top:40px}
ol li{margin:4px 0}`;

function page(opts: { slug: string; title: string; description: string; h1: string; body: string; extraHead?: string }): string {
  const url = `${SITE}${opts.slug}`;
  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:title" content="${esc(opts.title)}"><meta property="og:description" content="${esc(opts.description)}">
<meta property="og:type" content="website"><meta property="og:url" content="${esc(url)}"><meta property="og:locale" content="ru_RU">
<style>${CSS}</style>${opts.extraHead || ''}
</head><body>
<header><a class="brand" href="/">READY <span>HOME</span></a><a href="/#estimate">Онлайн-смета</a></header>
<main>
<h1>${esc(opts.h1)}</h1>
${opts.body}
</main>
<footer>
<p><a href="/remont/">Все планировки</a> · <a href="/ceny-na-remont">Цены на ремонтные работы</a> · <a href="/#contacts">Контакты</a></p>
<p>${esc(contacts.address.ru)} · ${esc(contacts.phone)}</p>
</footer>
</body></html>`;
}

function stagesList(): string {
  return `<ol>${WORK_STAGES.map((s) => `<li>${esc(s.name.ru)}</li>`).join('')}</ol>`;
}

function layoutTable(list: ApartmentLayout[]): string {
  const rows = list
    .map((l) => {
      const std = estimateFor(l, 'standard').totalKgs;
      const prem = estimateFor(l, 'premium').totalKgs;
      return `<tr><td><b>${esc(l.series)}</b>, ${l.rooms}-комн.</td><td class="n">${l.areaSqm} м²</td><td class="n">${l.ceilingHeight} м</td><td class="n">${kgs(round1000(std))} – ${kgs(round1000(prem))}</td><td><a href="${esc(estimateLink(l))}">Рассчитать</a></td></tr>`;
    })
    .join('');
  return `<table><thead><tr><th>Планировка</th><th class="n">Площадь</th><th class="n">Потолки</th><th class="n">Ремонт под ключ*</th><th></th></tr></thead><tbody>${rows}</tbody></table>
<p class="muted">* Ориентировочно, по базовым ценам от класса «Стандарт» до «Премиум», работы и материалы. Точная сумма по каждой работе — в онлайн-смете и после бесплатного замера.</p>`;
}

const pages: Array<{ slug: string; html: string }> = [];
const ROOM_WORD: Record<number, string> = { 1: 'однокомнатной', 2: 'двухкомнатной', 3: 'трёхкомнатной', 4: 'четырёхкомнатной', 5: 'пятикомнатной' };

for (let rooms = 1; rooms <= 5; rooms++) {
  const list = TYPICAL_LAYOUTS.filter((l) => l.rooms === rooms);
  if (!list.length) continue;
  const first = list[0];
  const comfort = estimateFor(first, 'comfort');
  const slug = `/remont/${rooms}-komnatnaya-kvartira`;
  pages.push({
    slug,
    html: page({
      slug,
      title: `Ремонт ${ROOM_WORD[rooms]} квартиры в Бишкеке — цена и смета онлайн | READY HOME`,
      description: `Сколько стоит ремонт ${rooms}-комнатной квартиры в Бишкеке: смета по каждой работе, этапы, сроки и цены для новостроек и вторички. Рассчитайте онлайн за 2 минуты.`,
      h1: `Ремонт ${ROOM_WORD[rooms]} квартиры в Бишкеке`,
      body: `<p class="lead">Ремонт ${rooms}-комнатной квартиры площадью около ${first.areaSqm} м² в классе «Комфорт» обходится примерно в ${kgs(round1000(comfort.totalKgs))} (≈ ${kgs(round1000(comfort.totalKgs / first.areaSqm))} за м²) и занимает около ${comfort.days} дней. Ниже — типовые планировки Бишкека и ориентировочные суммы.</p>
<a class="cta" href="${esc(estimateLink(first))}">Рассчитать смету для своей квартиры</a><a class="cta ghost" href="/#contacts">Бесплатный замер</a>
<h2>Типовые планировки ${rooms}-комнатных квартир</h2>${layoutTable(list)}
<h2>Что входит в ремонт под ключ</h2>${stagesList()}
<p>В онлайн-смете можно отключить ненужные этапы, указать свою площадь, выбрать цвет краски, плитки, ламината и дверей и сразу увидеть цену каждой работы.</p>`,
    }),
  });
}

const SERIES: Array<{ slug: string; name: string; h1: string; intro: string }> = [
  { slug: 'novostroyka', name: 'Новостройка (элитка)', h1: 'Ремонт квартиры в новостройке Бишкека (ПСО)', intro: 'Квартиры в новостройках сдаются в ПСО — с голыми стенами и стяжкой или без неё. Демонтаж не нужен, ремонт начинается с черновой электрики и сантехники.' },
  { slug: '106-seriya', name: '106 серия', h1: 'Ремонт квартиры 106 серии в Бишкеке', intro: 'Улучшенная планировка 106 серии: просторная кухня и потолки около 2,7 м. В ремонт обычно входит демонтаж старой отделки и замена инженерных сетей.' },
  { slug: '105-seriya', name: '105 серия', h1: 'Ремонт квартиры 105 серии в Бишкеке', intro: 'Квартиры 105 серии с потолками около 2,5 м и небольшой кухней. Часто совмещают санузел и перепланируют кухню.' },
  { slug: 'hrushchevka', name: 'Хрущёвка', h1: 'Ремонт хрущёвки в Бишкеке', intro: 'Компактные квартиры с низкими потолками и маленькой кухней. Важны выравнивание стен, замена проводки и аккуратная работа с санузлом.' },
  { slug: 'stalinka', name: 'Сталинка', h1: 'Ремонт сталинки в Бишкеке', intro: 'Высокие потолки около 3 м и большие комнаты: больше площадь стен, поэтому штукатурка и покраска занимают заметную часть сметы.' },
];

for (const s of SERIES) {
  const list = TYPICAL_LAYOUTS.filter((l) => l.series === s.name);
  if (!list.length) continue;
  const slug = `/remont/${s.slug}`;
  pages.push({
    slug,
    html: page({
      slug,
      title: `${s.h1} — цены, смета, сроки | READY HOME`,
      description: `${s.h1}: смета по каждой работе, этапы и ориентировочные цены для ${list.map((l) => `${l.rooms}-комн`).join(', ')}. Онлайн-расчёт с выбором цветов и материалов.`,
      h1: s.h1,
      body: `<p class="lead">${esc(s.intro)}</p>
<a class="cta" href="${esc(estimateLink(list[0]))}">Рассчитать смету онлайн</a>
<h2>Планировки и ориентировочная стоимость</h2>${layoutTable(list)}
<h2>Этапы ремонта</h2>${stagesList()}`,
    }),
  });
}

// Price list page. Numbers in the HTML are the built-in defaults; a small script swaps in the studio's live prices.
{
  const slug = '/ceny-na-remont';
  const rows = WORK_STAGES.map((stage) => {
    const items = DEFAULT_PRICE_LIST.filter((i) => i.stage === stage.id);
    if (!items.length) return '';
    return `<tr><th colspan="3" style="color:#fbbf24;padding-top:18px">${esc(stage.name.ru)}</th></tr>${items
      .map(
        (i) =>
          `<tr data-id="${esc(i.id)}"><td>${esc(i.name.ru)}</td><td class="n" data-k="work">${kgs(i.workPrice)}</td><td class="n" data-k="mat">${i.materialPrice.standard ? `${kgs(i.materialPrice.standard)} – ${kgs(i.materialPrice.premium)}` : '—'}</td></tr>`,
      )
      .join('')}`;
  }).join('');
  const units = Object.fromEntries(DEFAULT_PRICE_LIST.map((i) => [i.id, WORK_UNIT_LABELS[i.unit].ru]));
  pages.push({
    slug,
    html: page({
      slug,
      title: 'Цены на ремонтные работы в Бишкеке — прайс за м² | READY HOME',
      description: 'Цены на штукатурку, шпаклёвку, покраску, плитку, стяжку, ламинат, электрику и сантехнику в Бишкеке за м², метр и штуку. Работа и материалы по классам.',
      h1: 'Цены на ремонтные работы в Бишкеке',
      body: `<p class="lead">Стоимость каждой работы за единицу: отдельно работа бригады и материалы (от класса «Стандарт» до «Премиум»).</p>
<a class="cta" href="/#estimate">Посчитать смету для своей квартиры</a>
<table><thead><tr><th>Работа</th><th class="n">Работа</th><th class="n">Материалы</th></tr></thead><tbody>${rows}</tbody></table>
<p class="muted">Цены указаны за единицу: м², погонный метр или штуку. Итоговая стоимость фиксируется в договоре после замера.</p>
<script>
(function(){var U=${JSON.stringify(units)};
function f(n){return Math.round(n).toLocaleString('ru-RU')+' сом'}
fetch('/api/content').then(function(r){return r.json()}).then(function(c){(c.priceList||[]).forEach(function(i){
var tr=document.querySelector('tr[data-id="'+i.id+'"]');if(!tr)return;var u=U[i.id]?' / '+U[i.id]:'';
tr.querySelector('[data-k=work]').textContent=f(i.workPrice)+u;
var m=i.materialPrice||{};tr.querySelector('[data-k=mat]').textContent=m.standard?f(m.standard)+' – '+f(m.premium)+u:'—';});}).catch(function(){});
})();
</script>`,
    }),
  });
}

// Hub page
{
  const slug = '/remont/';
  const cards = pages
    .filter((p) => p.slug.startsWith('/remont/'))
    .map((p) => {
      const t = p.html.match(/<h1>([^<]+)<\/h1>/)?.[1] || p.slug;
      return `<a class="card" href="${p.slug}"><b>${t}</b><span class="muted">Цены, этапы, смета онлайн</span></a>`;
    })
    .join('');
  pages.push({
    slug,
    html: page({
      slug,
      title: 'Ремонт квартир в Бишкеке — цены по планировкам | READY HOME',
      description: 'Ремонт 1–5-комнатных квартир, новостроек, хрущёвок, 105 и 106 серии, сталинок в Бишкеке: ориентировочные цены и онлайн-смета по каждой работе.',
      h1: 'Ремонт квартир в Бишкеке по планировкам',
      body: `<p class="lead">Выберите свою квартиру — по числу комнат или по серии дома — и узнайте ориентировочную стоимость ремонта.</p>
<div class="cards">${cards}<a class="card" href="/ceny-na-remont"><b>Цены на ремонтные работы</b><span class="muted">Прайс за м², метр и штуку</span></a></div>`,
    }),
  });
}

for (const p of pages) {
  const dir = path.join(DIST, p.slug.endsWith('/') ? p.slug : p.slug);
  const file = p.slug.endsWith('/') ? path.join(dir, 'index.html') : path.join(dir, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, p.html, 'utf8');
}

const today = new Date().toISOString().slice(0, 10);
const urls = ['/', ...pages.map((p) => p.slug)];
fs.writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`SEO: ${pages.length} pages + sitemap.xml for ${SITE}`);
