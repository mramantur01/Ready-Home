// Shopping list: typical consumption norms per unit of each job, rounded up to whole packs.
// Norms are average values (e.g. gypsum plaster ~13 kg/m² at 1.5 cm); the foreman confirms
// the final list on site.
import type { WorkEstimate, WorkEstimateLine } from '../types.ts';

interface MaterialSpec {
  name: string; // material, as it appears on the list
  per: number; // amount per unit of the job (per m², per m, per piece)
  unit: string; // unit of the amount
  pack: number; // pack size in the same unit (1 = sold by the unit)
  packLabel: string; // e.g. "мешок 30 кг"
  waste: number; // stock for cutting/losses, 0.1 = +10 %
}

const m = (name: string, per: number, unit: string, pack: number, packLabel: string, waste = 0.05): MaterialSpec => ({
  name,
  per,
  unit,
  pack,
  packLabel,
  waste,
});

export const MATERIAL_SPECS: Record<string, MaterialSpec[]> = {
  'w-demo-walls': [m('Мешки для строительного мусора', 0.15, 'шт', 1, 'шт', 0)],
  'w-demo-floor': [m('Мешки для строительного мусора', 0.4, 'шт', 1, 'шт', 0)],
  'w-el-points': [
    m('Кабель ВВГнг 3×2,5', 6, 'м', 100, 'бухта 100 м', 0.1),
    m('Подрозетник', 1, 'шт', 1, 'шт', 0.05),
    m('Гофра 20 мм', 5, 'м', 50, 'бухта 50 м', 0.1),
  ],
  'w-el-board': [m('Щит с автоматами и УЗО (комплект)', 1, 'компл', 1, 'компл', 0)],
  'w-pl-points': [m('Труба PPR 20 мм', 3, 'м', 4, 'палка 4 м', 0.1), m('Фитинги PPR (комплект на точку)', 1, 'компл', 1, 'компл', 0)],
  'w-wall-primer': [m('Грунтовка глубокого проникновения', 0.15, 'л', 10, 'канистра 10 л')],
  'w-wall-plaster': [
    m('Штукатурка гипсовая (типа Rotband)', 13, 'кг', 30, 'мешок 30 кг', 0.07),
    m('Маяк штукатурный 6 мм, 3 м', 0.35, 'шт', 1, 'шт', 0.05),
  ],
  'w-wall-slopes': [m('Уголок перфорированный 3 м', 2, 'шт', 1, 'шт', 0), m('Штукатурка для откосов', 12, 'кг', 30, 'мешок 30 кг')],
  'w-floor-screed': [m('Пескобетон / ЦПС (стяжка 5 см)', 100, 'кг', 50, 'мешок 50 кг', 0.05), m('Плёнка и фиброволокно', 1, 'м²', 50, 'рулон 50 м²', 0.1)],
  'w-floor-waterproof': [m('Гидроизоляция обмазочная', 1.5, 'кг', 15, 'ведро 15 кг'), m('Гидроизоляционная лента', 1.2, 'м', 10, 'рулон 10 м', 0)],
  'w-tile-bath-walls': [
    m('Плитка настенная (санузел)', 1, 'м²', 1.44, 'упаковка 1,44 м²', 0.1),
    m('Клей плиточный', 5, 'кг', 25, 'мешок 25 кг'),
    m('Затирка для швов', 0.4, 'кг', 2, 'упаковка 2 кг'),
  ],
  'w-tile-bath-floor': [
    m('Плитка напольная (санузел)', 1, 'м²', 1.44, 'упаковка 1,44 м²', 0.1),
    m('Клей плиточный', 6, 'кг', 25, 'мешок 25 кг'),
    m('Затирка для швов', 0.5, 'кг', 2, 'упаковка 2 кг'),
  ],
  'w-tile-apron': [
    m('Плитка для фартука', 1, 'м²', 1, 'м²', 0.12),
    m('Клей плиточный', 5, 'кг', 25, 'мешок 25 кг'),
    m('Затирка для швов', 0.5, 'кг', 2, 'упаковка 2 кг'),
  ],
  'w-wall-putty': [
    m('Шпаклёвка стартовая', 1.2, 'кг', 25, 'мешок 25 кг'),
    m('Шпаклёвка финишная', 0.8, 'кг', 20, 'мешок 20 кг'),
    m('Сетка шлифовальная', 0.05, 'шт', 1, 'шт', 0),
  ],
  'w-wall-paint': [m('Грунт под покраску', 0.1, 'л', 10, 'канистра 10 л'), m('Краска интерьерная (2 слоя)', 0.25, 'л', 9, 'ведро 9 л', 0.05)],
  'w-wall-wallpaper': [m('Обои (рулон 1,06 × 10 м)', 1 / 10.6, 'рулон', 1, 'рулон', 0.15), m('Клей для обоев', 1 / 25, 'упак', 1, 'упаковка', 0.1)],
  'w-ceiling-stretch': [m('Полотно натяжного потолка (по размеру)', 1, 'м²', 1, 'м²', 0), m('Багет (профиль)', 1.1, 'м', 2.5, 'планка 2,5 м', 0.1)],
  'w-ceiling-gkl': [
    m('Гипсокартон потолочный 1,2 × 2,5 м', 1 / 3, 'лист', 1, 'лист', 0.1),
    m('Профиль ПП 60×27, 3 м', 1, 'шт', 1, 'шт', 0.05),
    m('Шпаклёвка финишная', 1, 'кг', 20, 'мешок 20 кг'),
    m('Краска потолочная', 0.25, 'л', 9, 'ведро 9 л'),
  ],
  'w-floor-laminate': [m('Ламинат', 1, 'м²', 2, 'упаковка ~2 м²', 0.07), m('Подложка под ламинат', 1, 'м²', 10, 'рулон 10 м²', 0.05)],
  'w-floor-plinth': [m('Плинтус 2,5 м', 1 / 2.5, 'шт', 1, 'шт', 0.1), m('Уголки и заглушки для плинтуса', 0.4, 'шт', 1, 'шт', 0)],
  'w-door-interior': [m('Дверь межкомнатная с коробкой и наличниками', 1, 'компл', 1, 'компл', 0), m('Пена монтажная', 1, 'баллон', 1, 'баллон', 0)],
  'w-door-entrance': [m('Дверь входная', 1, 'шт', 1, 'шт', 0)],
  'w-el-sockets': [m('Розетки и выключатели (механизм + рамка)', 1, 'шт', 1, 'шт', 0)],
  'w-el-lights': [m('Светильники', 1, 'шт', 1, 'шт', 0)],
  'w-pl-fixtures': [m('Сантехприборы и смесители', 1, 'шт', 1, 'шт', 0)],
};

export interface ShoppingItem {
  name: string;
  amount: number; // with stock
  unit: string;
  packs: number;
  packLabel: string;
  byUnit: boolean; // sold by the same unit it is measured in (pieces, m²)
}

export function buyLabel(i: ShoppingItem): string {
  return i.byUnit ? `${i.packs} ${i.unit}` : `${i.packs} × ${i.packLabel}`;
}

const round = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);

export function computeShoppingList(est: Pick<WorkEstimate, 'lines'>): ShoppingItem[] {
  const byKey = new Map<string, ShoppingItem & { pack: number }>();
  const add = (line: WorkEstimateLine) => {
    for (const spec of MATERIAL_SPECS[line.id] || []) {
      const amount = line.qty * spec.per * (1 + spec.waste);
      const key = `${spec.name}|${spec.packLabel}`;
      const cur = byKey.get(key);
      if (cur) cur.amount += amount;
      else
        byKey.set(key, {
          name: spec.name,
          amount,
          unit: spec.unit,
          packs: 0,
          packLabel: spec.packLabel,
          pack: spec.pack,
          byUnit: spec.pack === 1 && spec.packLabel === spec.unit,
        });
    }
  };
  est.lines.forEach(add);
  return [...byKey.values()].map(({ pack, ...it }) => ({
    ...it,
    amount: round(it.amount),
    packs: Math.max(1, Math.ceil(it.amount / pack - 1e-9)),
  }));
}

export function shoppingListText(items: ShoppingItem[]): string {
  return items.map((i) => `• ${i.name}: ${buyLabel(i)}${i.byUnit ? '' : ` (≈ ${i.amount} ${i.unit})`}`).join('\n');
}
