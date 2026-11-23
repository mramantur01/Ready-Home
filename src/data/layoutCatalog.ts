// Typical apartment layouts found in Bishkek housing stock. Areas are approximate averages
// for each series; the client fine-tunes area and quantities in the estimate.
import type { ApartmentLayout, LayoutSpace, PropertyType } from '../types.ts';

const L = (kind: LayoutSpace['kind'], area: number): LayoutSpace => ({ kind, area });

function series(
  name: string,
  propertyType: PropertyType,
  ceilingHeight: number,
  variants: Array<{ rooms: number; area: number; living: number[]; kitchen: number; baths: number[] }>,
): ApartmentLayout[] {
  return variants.map((v) => ({
    id: `typ-${name.replace(/[^a-zA-Zа-яА-Я0-9]+/g, '-').toLowerCase()}-${v.rooms}`,
    series: name,
    rooms: v.rooms,
    areaSqm: v.area,
    ceilingHeight,
    bathrooms: v.baths.length,
    propertyType,
    spaces: [...v.living.map((a) => L('living', a)), L('kitchen', v.kitchen), ...v.baths.map((a) => L('bath', a))],
  }));
}

export const TYPICAL_LAYOUTS: ApartmentLayout[] = [
  ...series('Новостройка (элитка)', 'newbuild', 2.8, [
    { rooms: 1, area: 45, living: [19], kitchen: 12, baths: [4.5] },
    { rooms: 2, area: 68, living: [20, 15], kitchen: 13, baths: [5] },
    { rooms: 3, area: 95, living: [22, 16, 14], kitchen: 15, baths: [5, 3] },
    { rooms: 4, area: 125, living: [26, 18, 16, 14], kitchen: 17, baths: [6, 3.5] },
    { rooms: 5, area: 160, living: [30, 20, 18, 16, 14], kitchen: 20, baths: [6, 4, 3] },
  ]),
  ...series('106 серия', 'secondary', 2.7, [
    { rooms: 1, area: 39, living: [18], kitchen: 9, baths: [4] },
    { rooms: 2, area: 56, living: [19, 13], kitchen: 9, baths: [4.2] },
    { rooms: 3, area: 72, living: [20, 14, 12], kitchen: 9, baths: [4.5] },
    { rooms: 4, area: 88, living: [20, 15, 13, 11], kitchen: 10, baths: [5] },
  ]),
  ...series('105 серия', 'secondary', 2.5, [
    { rooms: 1, area: 34, living: [17], kitchen: 7, baths: [3.8] },
    { rooms: 2, area: 50, living: [18, 12], kitchen: 7, baths: [3.8] },
    { rooms: 3, area: 64, living: [18, 13, 10], kitchen: 7.5, baths: [4] },
  ]),
  ...series('Хрущёвка', 'secondary', 2.5, [
    { rooms: 1, area: 31, living: [17], kitchen: 6, baths: [3.2] },
    { rooms: 2, area: 44, living: [17, 10], kitchen: 6, baths: [3.2] },
    { rooms: 3, area: 57, living: [17, 11, 9], kitchen: 6, baths: [3.5] },
  ]),
  ...series('Сталинка', 'secondary', 3.0, [
    { rooms: 2, area: 60, living: [22, 16], kitchen: 8, baths: [4] },
    { rooms: 3, area: 80, living: [24, 17, 14], kitchen: 9, baths: [5] },
  ]),
];

export function layoutTitle(l: ApartmentLayout): string {
  return `${l.series}, ${l.rooms}-комн, ${l.areaSqm} м²`;
}
