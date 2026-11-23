// Itemized renovation price list, apartment quantity take-off and estimate maths.
// Shared by the browser (live estimate) and the server (recomputes on booking),
// so it must stay free of React and Node-only imports.
import type {
  ApartmentParams,
  FinishChoices,
  LocalizedText,
  MaterialTier,
  WorkBasis,
  WorkEstimate,
  WorkEstimateLine,
  WorkItem,
  WorkSelection,
  WorkStageId,
  WorkUnit,
} from '../types.ts';
import { FINISH_GROUPS, findFinish, finishSurcharge, type FinishGroup } from './finishCatalog.ts';

export interface WorkStageInfo {
  id: WorkStageId;
  name: LocalizedText;
  // Crew days for a 50 m² apartment; scaled by area in estimateDays().
  baseDays: number;
}

export const WORK_STAGES: WorkStageInfo[] = [
  { id: 'demolition', baseDays: 3, name: { ru: 'Демонтаж', ky: 'Демонтаж', en: 'Demolition' } },
  {
    id: 'engineering_rough',
    baseDays: 5,
    name: { ru: 'Электрика и сантехника (черновая)', ky: 'Электр жана сантехника (кара иш)', en: 'Rough electrics & plumbing' },
  },
  {
    id: 'walls_rough',
    baseDays: 8,
    name: { ru: 'Штукатурка стен', ky: 'Дубалды шыбоо', en: 'Wall plastering' },
  },
  {
    id: 'floor_rough',
    baseDays: 4,
    name: { ru: 'Стяжка и гидроизоляция', ky: 'Стяжка жана гидроизоляция', en: 'Screed & waterproofing' },
  },
  { id: 'tiling', baseDays: 7, name: { ru: 'Плитка', ky: 'Плитка', en: 'Tiling' } },
  {
    id: 'walls_finish',
    baseDays: 10,
    name: { ru: 'Шпаклёвка и покраска', ky: 'Шпаклёвка жана боёо', en: 'Putty & painting' },
  },
  { id: 'ceiling', baseDays: 2, name: { ru: 'Потолок', ky: 'Шып', en: 'Ceiling' } },
  {
    id: 'floor_finish',
    baseDays: 4,
    name: { ru: 'Напольное покрытие', ky: 'Пол жабуусу', en: 'Floor finish' },
  },
  { id: 'doors', baseDays: 2, name: { ru: 'Двери', ky: 'Эшиктер', en: 'Doors' } },
  {
    id: 'engineering_finish',
    baseDays: 3,
    name: { ru: 'Чистовая электрика и сантехника', ky: 'Таза электр жана сантехника', en: 'Finish electrics & plumbing' },
  },
  { id: 'cleaning', baseDays: 1, name: { ru: 'Финальная уборка', ky: 'Акыркы тазалоо', en: 'Final cleaning' } },
];

export const WORK_UNIT_LABELS: Record<WorkUnit, LocalizedText> = {
  m2: { ru: 'м²', ky: 'м²', en: 'm²' },
  m: { ru: 'м', ky: 'м', en: 'm' },
  pcs: { ru: 'шт', ky: 'даана', en: 'pcs' },
};

export const WORK_BASIS_LABELS: Record<WorkBasis, string> = {
  floor: 'Вся площадь пола',
  dry_floor: 'Пол без санузлов',
  ceiling: 'Площадь потолка',
  walls: 'Все стены',
  dry_walls: 'Стены без плитки',
  bath_walls: 'Стены санузлов',
  bath_floor: 'Пол санузлов',
  kitchen_apron: 'Фартук кухни',
  plinth: 'Периметр (плинтус)',
  windows: 'Окна',
  interior_doors: 'Межкомнатные двери',
  entrance_door: 'Входная дверь',
  electric_points: 'Розетки и выключатели',
  light_points: 'Светильники',
  plumbing_points: 'Сантехнические точки',
  plumbing_fixtures: 'Сантехприборы',
  switchboard: 'Электрощит',
  debris_trips: 'Рейсы вывоза мусора',
};

const mp = (standard: number, comfort: number, premium: number): Record<MaterialTier, number> => ({
  standard,
  comfort,
  premium,
});

// Starting prices in KGS. They are approximate Bishkek market rates and are meant
// to be checked and edited by the studio in the admin panel ("Прайс-лист работ").
export const DEFAULT_PRICE_LIST: WorkItem[] = [
  // Demolition
  {
    id: 'w-demo-walls',
    stage: 'demolition',
    name: { ru: 'Снятие старых обоев, краски и плитки', ky: 'Эски обой, боёк жана плитканы алуу', en: 'Strip old wallpaper, paint and tiles' },
    unit: 'm2', basis: 'walls', workPrice: 90, materialPrice: mp(0, 0, 0), enabledByDefault: true, secondaryOnly: true,
  },
  {
    id: 'w-demo-floor',
    stage: 'demolition',
    name: { ru: 'Демонтаж старого пола', ky: 'Эски полду бузуу', en: 'Remove old flooring' },
    unit: 'm2', basis: 'floor', workPrice: 160, materialPrice: mp(0, 0, 0), enabledByDefault: true, secondaryOnly: true,
  },
  {
    id: 'w-demo-debris',
    stage: 'demolition',
    name: { ru: 'Вывоз строительного мусора', ky: 'Курулуш таштандысын чыгаруу', en: 'Debris removal' },
    unit: 'pcs', basis: 'debris_trips', workPrice: 4500, materialPrice: mp(0, 0, 0), enabledByDefault: true,
  },
  // Rough engineering
  {
    id: 'w-el-points',
    stage: 'engineering_rough',
    name: { ru: 'Разводка электрики (точка с кабелем и штроблением)', ky: 'Электр зымдарын тартуу (чекит)', en: 'Electrical wiring per point' },
    unit: 'pcs', basis: 'electric_points', workPrice: 900, materialPrice: mp(600, 850, 1300), enabledByDefault: true,
  },
  {
    id: 'w-el-board',
    stage: 'engineering_rough',
    name: { ru: 'Сборка и установка электрощита', ky: 'Электр щитин чогултуу', en: 'Assemble & install switchboard' },
    unit: 'pcs', basis: 'switchboard', workPrice: 9000, materialPrice: mp(12000, 18000, 28000), enabledByDefault: true,
  },
  {
    id: 'w-pl-points',
    stage: 'engineering_rough',
    name: { ru: 'Разводка водопровода и канализации (точка)', ky: 'Суу жана канализация (чекит)', en: 'Water & drain piping per point' },
    unit: 'pcs', basis: 'plumbing_points', workPrice: 2500, materialPrice: mp(1500, 2400, 3800), enabledByDefault: true,
  },
  // Walls rough
  {
    id: 'w-wall-primer',
    stage: 'walls_rough',
    name: { ru: 'Грунтовка стен', ky: 'Дубалды грунттоо', en: 'Wall priming' },
    unit: 'm2', basis: 'walls', workPrice: 35, materialPrice: mp(15, 20, 30), enabledByDefault: true,
  },
  {
    id: 'w-wall-plaster',
    stage: 'walls_rough',
    name: { ru: 'Штукатурка стен по маякам', ky: 'Дубалды маяк менен шыбоо', en: 'Plastering on guides' },
    unit: 'm2', basis: 'walls', workPrice: 450, materialPrice: mp(250, 300, 380), enabledByDefault: true,
  },
  {
    id: 'w-wall-slopes',
    stage: 'walls_rough',
    name: { ru: 'Оконные откосы', ky: 'Терезе каптал беттери', en: 'Window reveals' },
    unit: 'pcs', basis: 'windows', workPrice: 1800, materialPrice: mp(700, 1000, 1500), enabledByDefault: true,
  },
  // Floor rough
  {
    id: 'w-floor-screed',
    stage: 'floor_rough',
    name: { ru: 'Стяжка пола (полусухая)', ky: 'Пол стяжкасы (жарым кургак)', en: 'Semi-dry floor screed' },
    unit: 'm2', basis: 'floor', workPrice: 400, materialPrice: mp(350, 400, 500), enabledByDefault: true,
  },
  {
    id: 'w-floor-waterproof',
    stage: 'floor_rough',
    name: { ru: 'Гидроизоляция санузла', ky: 'Даараткананы гидроизоляциялоо', en: 'Bathroom waterproofing' },
    unit: 'm2', basis: 'bath_floor', workPrice: 300, materialPrice: mp(250, 350, 500), enabledByDefault: true,
  },
  // Tiling
  {
    id: 'w-tile-bath-walls',
    stage: 'tiling',
    name: { ru: 'Плитка на стены санузла', ky: 'Даараткана дубалына плитка', en: 'Bathroom wall tiles' },
    unit: 'm2', basis: 'bath_walls', workPrice: 1100, materialPrice: mp(900, 1600, 3200), enabledByDefault: true,
  },
  {
    id: 'w-tile-bath-floor',
    stage: 'tiling',
    name: { ru: 'Плитка на пол санузла', ky: 'Даараткана полуна плитка', en: 'Bathroom floor tiles' },
    unit: 'm2', basis: 'bath_floor', workPrice: 1100, materialPrice: mp(900, 1600, 3200), enabledByDefault: true,
  },
  {
    id: 'w-tile-apron',
    stage: 'tiling',
    name: { ru: 'Кухонный фартук из плитки', ky: 'Ашкана фартугу (плитка)', en: 'Kitchen backsplash' },
    unit: 'm2', basis: 'kitchen_apron', workPrice: 1300, materialPrice: mp(1000, 1800, 3500), enabledByDefault: true,
  },
  // Walls finish
  {
    id: 'w-wall-putty',
    stage: 'walls_finish',
    name: { ru: 'Шпаклёвка стен в 2 слоя со шлифовкой', ky: 'Дубалды 2 кабат шпаклёвкалоо', en: 'Two-coat putty with sanding' },
    unit: 'm2', basis: 'dry_walls', workPrice: 380, materialPrice: mp(120, 160, 220), enabledByDefault: true,
  },
  {
    id: 'w-wall-paint',
    stage: 'walls_finish',
    name: { ru: 'Покраска стен в 2 слоя', ky: 'Дубалды 2 кабат боёо', en: 'Two-coat wall painting' },
    unit: 'm2', basis: 'dry_walls', workPrice: 220, materialPrice: mp(120, 220, 420), enabledByDefault: true,
  },
  {
    id: 'w-wall-wallpaper',
    stage: 'walls_finish',
    name: { ru: 'Поклейка обоев (вместо покраски)', ky: 'Обой чаптоо (боёонун ордуна)', en: 'Wallpapering (instead of paint)' },
    unit: 'm2', basis: 'dry_walls', workPrice: 280, materialPrice: mp(250, 550, 1100), enabledByDefault: false,
  },
  // Ceiling
  {
    id: 'w-ceiling-stretch',
    stage: 'ceiling',
    name: { ru: 'Натяжной потолок', ky: 'Тартылма шып', en: 'Stretch ceiling' },
    unit: 'm2', basis: 'ceiling', workPrice: 350, materialPrice: mp(350, 550, 1000), enabledByDefault: true,
  },
  {
    id: 'w-ceiling-gkl',
    stage: 'ceiling',
    name: { ru: 'Потолок из гипсокартона с покраской', ky: 'Гипсокартон шып боёк менен', en: 'Drywall ceiling, painted' },
    unit: 'm2', basis: 'ceiling', workPrice: 900, materialPrice: mp(500, 650, 900), enabledByDefault: false,
  },
  // Floor finish
  {
    id: 'w-floor-laminate',
    stage: 'floor_finish',
    name: { ru: 'Укладка ламината с подложкой', ky: 'Ламинат төшөө', en: 'Laminate with underlay' },
    unit: 'm2', basis: 'dry_floor', workPrice: 300, materialPrice: mp(700, 1300, 2600), enabledByDefault: true,
  },
  {
    id: 'w-floor-plinth',
    stage: 'floor_finish',
    name: { ru: 'Монтаж плинтуса', ky: 'Плинтус орнотуу', en: 'Skirting boards' },
    unit: 'm', basis: 'plinth', workPrice: 180, materialPrice: mp(120, 220, 450), enabledByDefault: true,
  },
  // Doors
  {
    id: 'w-door-interior',
    stage: 'doors',
    name: { ru: 'Установка межкомнатной двери', ky: 'Бөлмө эшигин орнотуу', en: 'Interior door installation' },
    unit: 'pcs', basis: 'interior_doors', workPrice: 4500, materialPrice: mp(9000, 16000, 32000), enabledByDefault: true,
  },
  {
    id: 'w-door-entrance',
    stage: 'doors',
    name: { ru: 'Установка входной двери', ky: 'Кире бериш эшигин орнотуу', en: 'Entrance door installation' },
    unit: 'pcs', basis: 'entrance_door', workPrice: 5000, materialPrice: mp(25000, 40000, 70000), enabledByDefault: false,
  },
  // Finish engineering
  {
    id: 'w-el-sockets',
    stage: 'engineering_finish',
    name: { ru: 'Установка розеток и выключателей', ky: 'Розетка жана өчүргүч орнотуу', en: 'Sockets & switches' },
    unit: 'pcs', basis: 'electric_points', workPrice: 250, materialPrice: mp(250, 450, 900), enabledByDefault: true,
  },
  {
    id: 'w-el-lights',
    stage: 'engineering_finish',
    name: { ru: 'Установка светильников', ky: 'Шамдарды орнотуу', en: 'Light fixtures' },
    unit: 'pcs', basis: 'light_points', workPrice: 500, materialPrice: mp(1000, 2500, 6000), enabledByDefault: true,
  },
  {
    id: 'w-pl-fixtures',
    stage: 'engineering_finish',
    name: { ru: 'Установка сантехприборов (унитаз, раковина, ванна, смесители)', ky: 'Сантехника приборлорун орнотуу', en: 'Plumbing fixtures installation' },
    unit: 'pcs', basis: 'plumbing_fixtures', workPrice: 2500, materialPrice: mp(8000, 16000, 35000), enabledByDefault: true,
  },
  // Cleaning
  {
    id: 'w-cleaning',
    stage: 'cleaning',
    name: { ru: 'Клининг после ремонта', ky: 'Оңдоодон кийинки тазалоо', en: 'Post-renovation cleaning' },
    unit: 'm2', basis: 'floor', workPrice: 90, materialPrice: mp(0, 0, 0), enabledByDefault: true,
  },
];

const NAME_PLACEHOLDERS = new Set(['Жаңы иш', 'New work item', 'Жаңы вариант', 'New option', 'Иш', 'Work item', 'Вариант', 'Option']);

export function renameRu(name: LocalizedText, ru: string): LocalizedText {
  const follow = (v: string) => !v || v === name.ru || NAME_PLACEHOLDERS.has(v);
  return { ru, ky: follow(name.ky) ? ru : name.ky, en: follow(name.en) ? ru : name.en };
}

export const DEFAULT_APARTMENT: ApartmentParams = {
  rooms: 2,
  areaSqm: 64,
  ceilingHeight: 2.7,
  bathrooms: 1,
  propertyType: 'newbuild',
  tier: 'comfort',
};

// Typical total area for a Bishkek apartment by room count, used as a starting point.
export const TYPICAL_AREA_BY_ROOMS: Record<number, number> = { 1: 42, 2: 64, 3: 88, 4: 115, 5: 145 };

export function clampParams(p: Partial<ApartmentParams>): ApartmentParams {
  const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  return {
    rooms: Math.max(1, Math.min(5, Math.round(num(p.rooms, DEFAULT_APARTMENT.rooms)))),
    areaSqm: Math.max(18, Math.min(400, Math.round(num(p.areaSqm, DEFAULT_APARTMENT.areaSqm) * 10) / 10)),
    ceilingHeight: Math.max(2.4, Math.min(4, Math.round(num(p.ceilingHeight, DEFAULT_APARTMENT.ceilingHeight) * 100) / 100)),
    bathrooms: Math.max(1, Math.min(3, Math.round(num(p.bathrooms, DEFAULT_APARTMENT.bathrooms)))),
    propertyType: p.propertyType === 'secondary' ? 'secondary' : 'newbuild',
    tier: p.tier === 'standard' || p.tier === 'premium' ? p.tier : 'comfort',
    layout: typeof p.layout === 'string' && p.layout.trim() ? p.layout.replace(/[<>]/g, '').slice(0, 120) : undefined,
  };
}

// Approximate quantity take-off for a typical apartment layout. Each value is the
// starting quantity for one WorkBasis; the client can correct any line by hand.
export function computeQuantities(input: ApartmentParams): Record<WorkBasis, number> {
  const p = clampParams(input);
  const bathFloorEach = 4.2;
  const bathFloor = p.bathrooms * bathFloorEach;
  // Spaces: living rooms + kitchen + hallway + bathrooms.
  const spaces = p.rooms + 2 + p.bathrooms;
  const dryArea = Math.max(10, p.areaSqm - bathFloor);
  const drySpaces = p.rooms + 2;
  const dryPerimeter = drySpaces * 4 * Math.sqrt(dryArea / drySpaces) * 1.08; // rooms are not square
  const bathPerimeter = p.bathrooms * 4 * Math.sqrt(bathFloorEach) * 1.05;
  const windows = p.rooms + 1;
  const interiorDoors = p.rooms + p.bathrooms + 1;
  const openings = windows * 2.1 + interiorDoors * 1.7 * 2 + 1.9; // door leaves count on both sides
  const bathWalls = Math.max(0, bathPerimeter * p.ceilingHeight - p.bathrooms * 1.6);
  const apron = 3;
  const walls = Math.max(20, (dryPerimeter + bathPerimeter) * p.ceilingHeight - openings);
  const dryWalls = Math.max(10, walls - bathWalls - apron);

  const r1 = (v: number) => Math.round(v * 10) / 10;
  return {
    floor: r1(p.areaSqm),
    dry_floor: r1(dryArea),
    ceiling: r1(p.areaSqm),
    walls: r1(walls),
    dry_walls: r1(dryWalls),
    bath_walls: r1(bathWalls),
    bath_floor: r1(bathFloor),
    kitchen_apron: apron,
    plinth: r1(Math.max(0, dryPerimeter - interiorDoors * 0.9)),
    windows,
    interior_doors: interiorDoors,
    entrance_door: 1,
    electric_points: Math.round(p.areaSqm * 0.45 + p.rooms * 3 + 6),
    light_points: spaces + p.rooms,
    plumbing_points: p.bathrooms * 5 + 3,
    plumbing_fixtures: p.bathrooms * 4 + 1,
    switchboard: 1,
    debris_trips: Math.max(1, Math.ceil(p.areaSqm / (p.propertyType === 'secondary' ? 25 : 45))),
  };
}

// Labour costs more on old housing: uneven walls, more preparation.
const SECONDARY_WORK_MULTIPLIER = 1.1;

export function defaultSelections(priceList: WorkItem[], params: ApartmentParams): WorkSelection[] {
  const q = computeQuantities(params);
  return priceList
    .filter((item) => item.enabledByDefault && (!item.secondaryOnly || params.propertyType === 'secondary'))
    .map((item) => ({ id: item.id, qty: q[item.basis] ?? 0 }));
}

function estimateStageDays(stageId: WorkStageId, areaSqm: number): number {
  const stage = WORK_STAGES.find((s) => s.id === stageId);
  if (!stage) return 0;
  return Math.max(1, Math.round(stage.baseDays * Math.pow(areaSqm / 50, 0.7)));
}

export function computeWorkEstimate(
  priceList: WorkItem[],
  rawParams: ApartmentParams,
  selections: WorkSelection[],
  finishes?: FinishChoices,
  finishGroups: FinishGroup[] = FINISH_GROUPS,
): WorkEstimate {
  const params = clampParams(rawParams);
  const byId = new Map(priceList.map((i) => [i.id, i]));
  const workMult = params.propertyType === 'secondary' ? SECONDARY_WORK_MULTIPLIER : 1;

  const lines: WorkEstimateLine[] = [];
  const seen = new Set<string>();
  for (const sel of selections) {
    const item = byId.get(sel.id);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    const qty = Math.max(0, Math.min(5000, Math.round((Number(sel.qty) || 0) * 10) / 10));
    if (qty <= 0) continue;
    lines.push({
      id: item.id,
      stage: item.stage,
      name: item.name.ru,
      unit: item.unit,
      qty,
      workKgs: Math.round(qty * item.workPrice * workMult),
      materialsKgs: Math.round(
        qty * ((item.materialPrice[params.tier] || 0) + finishSurcharge(item.id, finishes, finishGroups)),
      ),
    });
  }

  const stages = WORK_STAGES.map((s) => {
    const stageLines = lines.filter((l) => l.stage === s.id);
    const totalKgs = stageLines.reduce((sum, l) => sum + l.workKgs + l.materialsKgs, 0);
    return { id: s.id, totalKgs, days: stageLines.length ? estimateStageDays(s.id, params.areaSqm) : 0 };
  }).filter((s) => s.totalKgs > 0);

  const workKgs = lines.reduce((sum, l) => sum + l.workKgs, 0);
  const materialsKgs = lines.reduce((sum, l) => sum + l.materialsKgs, 0);
  // Some stages overlap on site (e.g. ceiling while floors cure), so the schedule is ~85% of the sum.
  const days = Math.round(stages.reduce((sum, s) => sum + s.days, 0) * 0.85);

  return {
    params,
    finishes,
    lines,
    stages,
    workKgs,
    materialsKgs,
    totalKgs: workKgs + materialsKgs,
    days,
  };
}

// Short plain-text summary (Telegram notification, CRM).
export function formatWorkEstimateText(est: WorkEstimate, groups: FinishGroup[] = FINISH_GROUPS): string {
  const kgs = (n: number) => `${n.toLocaleString('ru-RU')} сом`;
  const p = est.params;
  const head =
    `Смета по работам: ${p.rooms}-комн, ${p.areaSqm} м², потолки ${p.ceilingHeight} м, санузлов ${p.bathrooms}, класс ${p.tier}` +
    (p.layout ? `\nПланировка: ${p.layout}` : '');
  const stages = est.stages
    .map((s) => `• ${WORK_STAGES.find((w) => w.id === s.id)?.name.ru || s.id}: ${kgs(s.totalKgs)}`)
    .join('\n');
  const finishes = groups
    .filter((g) => est.finishes?.[g.id])
    .map((g) => `• ${g.label.ru}: ${findFinish(g.id, est.finishes?.[g.id], groups).name.ru}`)
    .join('\n');
  return (
    `${head}\n${stages}\nРаботы: ${kgs(est.workKgs)}, материалы: ${kgs(est.materialsKgs)}, срок ~${est.days} дн.` +
    (finishes ? `\nОтделка:\n${finishes}` : '')
  );
}
