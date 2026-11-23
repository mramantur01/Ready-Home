// Colour and finish options the client picks for individual jobs.
// Choices are price-neutral: the material class (Стандарт / Комфорт / Премиум) sets the price.
import type { FinishChoices, FinishGroupId, LocalizedText } from '../types.ts';

export interface FinishOption {
  id: string;
  name: LocalizedText;
  color: string; // main swatch colour
  accent?: string; // second colour for patterned finishes (veins, planks, grout)
}

export interface FinishGroup {
  id: FinishGroupId;
  label: LocalizedText;
  workItemIds: string[]; // price-list jobs that show this picker
  options: FinishOption[];
}

const o = (id: string, ru: string, ky: string, en: string, color: string, accent?: string): FinishOption => ({
  id,
  name: { ru, ky, en },
  color,
  accent,
});

export const FINISH_GROUPS: FinishGroup[] = [
  {
    id: 'wall_paint',
    label: { ru: 'Цвет краски', ky: 'Боёктун түсү', en: 'Paint colour' },
    workItemIds: ['w-wall-paint'],
    options: [
      o('warm_white', 'Тёплый белый', 'Жылуу ак', 'Warm white', '#f1ede4'),
      o('cream', 'Сливочный', 'Каймак', 'Cream', '#ece1c8'),
      o('sand', 'Песочный', 'Кум түс', 'Sand', '#d9c7a7'),
      o('greige', 'Серо-бежевый', 'Боз-беж', 'Greige', '#c9bfb2'),
      o('light_grey', 'Светло-серый', 'Ачык боз', 'Light grey', '#d3d4d2'),
      o('sage', 'Шалфей', 'Шалфей', 'Sage', '#b7c2ad'),
      o('sky', 'Небесный', 'Асман', 'Sky blue', '#bfd0dc'),
      o('terracotta', 'Терракота', 'Терракота', 'Terracotta', '#c98f73'),
      o('graphite', 'Графит', 'Графит', 'Graphite', '#5d6166'),
    ],
  },
  {
    id: 'wallpaper',
    label: { ru: 'Обои', ky: 'Обой', en: 'Wallpaper' },
    workItemIds: ['w-wall-wallpaper'],
    options: [
      o('linen', 'Лён светлый', 'Ачык зыгыр', 'Light linen', '#e7dfd0', '#d6ccb9'),
      o('beige_damask', 'Бежевый дамаск', 'Беж дамаск', 'Beige damask', '#dccbb0', '#c7b393'),
      o('grey_stripe', 'Серая полоска', 'Боз сызык', 'Grey stripe', '#cfd1d3', '#b7babd'),
      o('green_botanic', 'Зелёная ботаника', 'Жашыл өсүмдүк', 'Green botanical', '#b9c6b0', '#93a68a'),
      o('navy_geo', 'Синяя геометрия', 'Көк геометрия', 'Navy geometric', '#4a5a78', '#6c7c9a'),
    ],
  },
  {
    id: 'bath_tile',
    label: { ru: 'Плитка на стены санузла', ky: 'Даараткана дубалынын плиткасы', en: 'Bathroom wall tile' },
    workItemIds: ['w-tile-bath-walls'],
    options: [
      o('white_gloss', 'Белая глянцевая', 'Ак жылтырак', 'White gloss', '#f4f5f6', '#c9ced2'),
      o('marble_white', 'Белый мрамор', 'Ак мрамор', 'White marble', '#ece9e4', '#b9b3aa'),
      o('travertine', 'Бежевый травертин', 'Беж травертин', 'Beige travertine', '#dccbb0', '#c2ae8d'),
      o('concrete', 'Серый бетон', 'Боз бетон', 'Grey concrete', '#a9a9a5', '#8f8f8b'),
      o('mint', 'Мятная', 'Жалбыз', 'Mint', '#c3e0d6', '#a3c7ba'),
      o('graphite', 'Тёмный графит', 'Кара графит', 'Dark graphite', '#45484c', '#2f3134'),
    ],
  },
  {
    id: 'bath_floor_tile',
    label: { ru: 'Плитка на пол санузла', ky: 'Даараткана полунун плиткасы', en: 'Bathroom floor tile' },
    workItemIds: ['w-tile-bath-floor'],
    options: [
      o('grey_stone', 'Серый камень', 'Боз таш', 'Grey stone', '#9c9c98', '#80807c'),
      o('beige_stone', 'Бежевый камень', 'Беж таш', 'Beige stone', '#cdbb9d', '#b19f80'),
      o('marble_white', 'Белый мрамор', 'Ак мрамор', 'White marble', '#ece9e4', '#b9b3aa'),
      o('black', 'Чёрный матовый', 'Кара күңүрт', 'Matte black', '#2f3134', '#1f2022'),
      o('wood_look', 'Под дерево', 'Жыгач сыяктуу', 'Wood-look', '#a8835d', '#8d6a47'),
    ],
  },
  {
    id: 'apron',
    label: { ru: 'Кухонный фартук', ky: 'Ашкана фартугу', en: 'Kitchen backsplash' },
    workItemIds: ['w-tile-apron'],
    options: [
      o('white_metro', 'Белый кабанчик', 'Ак кабанчик', 'White subway', '#f4f5f6', '#cfd3d6'),
      o('marble', 'Мрамор', 'Мрамор', 'Marble', '#ece9e4', '#b9b3aa'),
      o('green_zellige', 'Зелёная зеллиж', 'Жашыл зеллиж', 'Green zellige', '#6f9a86', '#55806c'),
      o('terracotta', 'Терракота', 'Терракота', 'Terracotta', '#c27a5c', '#a5644a'),
      o('black', 'Чёрный', 'Кара', 'Black', '#2f3134', '#1f2022'),
    ],
  },
  {
    id: 'laminate',
    label: { ru: 'Цвет ламината', ky: 'Ламинаттын түсү', en: 'Laminate colour' },
    workItemIds: ['w-floor-laminate'],
    options: [
      o('light_oak', 'Светлый дуб', 'Ачык эмен', 'Light oak', '#d2b48a', '#bf9f74'),
      o('natural_oak', 'Натуральный дуб', 'Табигый эмен', 'Natural oak', '#b98e5f', '#a67b4d'),
      o('grey_oak', 'Серый дуб', 'Боз эмен', 'Grey oak', '#a39a8f', '#8e857a'),
      o('walnut', 'Орех', 'Жаңгак', 'Walnut', '#7a5236', '#66432b'),
      o('wenge', 'Венге', 'Венге', 'Wenge', '#4a3426', '#3a281d'),
    ],
  },
  {
    id: 'plinth',
    label: { ru: 'Цвет плинтуса', ky: 'Плинтустун түсү', en: 'Skirting colour' },
    workItemIds: ['w-floor-plinth'],
    options: [
      o('white', 'Белый', 'Ак', 'White', '#f5f3ee'),
      o('match_floor', 'В тон пола', 'Пол түсүндө', 'Match floor', '#a67b4d'),
      o('match_wall', 'В тон стен', 'Дубал түсүндө', 'Match walls', '#d9c7a7'),
      o('black', 'Чёрный', 'Кара', 'Black', '#2a2b2d'),
    ],
  },
  {
    id: 'ceiling',
    label: { ru: 'Потолок', ky: 'Шып', en: 'Ceiling finish' },
    workItemIds: ['w-ceiling-stretch', 'w-ceiling-gkl'],
    options: [
      o('white_matte', 'Белый матовый', 'Ак күңүрт', 'White matte', '#fbfaf7'),
      o('white_satin', 'Белый сатин', 'Ак сатин', 'White satin', '#f4f2ec', '#ffffff'),
      o('white_gloss', 'Белый глянец', 'Ак жылтырак', 'White gloss', '#ffffff', '#e6edf3'),
      o('ivory', 'Слоновая кость', 'Пил сөөгү', 'Ivory', '#f1e9d8'),
      o('graphite', 'Графитовый', 'Графит', 'Graphite', '#4b4f55'),
    ],
  },
  {
    id: 'doors',
    label: { ru: 'Межкомнатные двери', ky: 'Бөлмө эшиктери', en: 'Interior doors' },
    workItemIds: ['w-door-interior'],
    options: [
      o('white', 'Белые', 'Ак', 'White', '#f2f0eb', '#d9d6cf'),
      o('light_oak', 'Светлый дуб', 'Ачык эмен', 'Light oak', '#c9a77c', '#b08d62'),
      o('walnut', 'Орех', 'Жаңгак', 'Walnut', '#7a5236', '#5f3f29'),
      o('grey', 'Серые', 'Боз', 'Grey', '#9a9a97', '#80807d'),
      o('graphite', 'Графит', 'Графит', 'Graphite', '#3e4247', '#2b2e32'),
    ],
  },
  {
    id: 'entrance_door',
    label: { ru: 'Входная дверь', ky: 'Кире бериш эшиги', en: 'Entrance door' },
    workItemIds: ['w-door-entrance'],
    options: [
      o('black', 'Чёрная', 'Кара', 'Black', '#2a2b2d'),
      o('walnut', 'Орех', 'Жаңгак', 'Walnut', '#7a5236'),
      o('white', 'Белая', 'Ак', 'White', '#efede8'),
      o('graphite', 'Графит', 'Графит', 'Graphite', '#45484c'),
    ],
  },
  {
    id: 'sockets',
    label: { ru: 'Розетки и выключатели', ky: 'Розетка жана өчүргүч', en: 'Sockets & switches' },
    workItemIds: ['w-el-sockets'],
    options: [
      o('white', 'Белые', 'Ак', 'White', '#ffffff'),
      o('black', 'Чёрные', 'Кара', 'Black', '#2a2b2d'),
      o('graphite', 'Графит', 'Графит', 'Graphite', '#55595e'),
      o('gold', 'Золото', 'Алтын', 'Gold', '#c9a35b'),
    ],
  },
  {
    id: 'plumbing',
    label: { ru: 'Смесители и сантехника', ky: 'Смеситель жана сантехника', en: 'Taps & fixtures' },
    workItemIds: ['w-pl-fixtures'],
    options: [
      o('chrome', 'Хром', 'Хром', 'Chrome', '#c7ccd1', '#9aa1a8'),
      o('matte_black', 'Чёрный матовый', 'Кара күңүрт', 'Matte black', '#2a2b2d'),
      o('brushed_gold', 'Золото браш', 'Алтын браш', 'Brushed gold', '#c9a35b'),
      o('gunmetal', 'Оружейная сталь', 'Курал болот', 'Gunmetal', '#5b5f63'),
    ],
  },
];

export const FINISH_GROUP_BY_ITEM: Record<string, FinishGroup> = Object.fromEntries(
  FINISH_GROUPS.flatMap((g) => g.workItemIds.map((id) => [id, g])),
);

export const DEFAULT_FINISHES: Required<FinishChoices> = Object.fromEntries(
  FINISH_GROUPS.map((g) => [g.id, g.options[0].id]),
) as Required<FinishChoices>;

export function findFinish(group: FinishGroupId, optionId: string | undefined): FinishOption {
  const g = FINISH_GROUPS.find((x) => x.id === group)!;
  return g.options.find((op) => op.id === optionId) || g.options[0];
}

// Keep only known groups/options (used by the server on bookings).
export function sanitizeFinishes(input: unknown): FinishChoices {
  const out: FinishChoices = {};
  if (!input || typeof input !== 'object') return out;
  const raw = input as Record<string, unknown>;
  for (const g of FINISH_GROUPS) {
    const v = raw[g.id];
    if (typeof v === 'string' && g.options.some((op) => op.id === v)) out[g.id] = v;
  }
  return out;
}
