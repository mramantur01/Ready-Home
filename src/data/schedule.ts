// Measurement calendar: which date/time slots are still free. Shared by the server
// (validates a booking) and the booking form (shows the calendar). Times are Bishkek (UTC+6).
import type { BookingRecord, ScheduleConfig } from '../types.ts';

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  workDays: [1, 2, 3, 4, 5, 6], // Mon–Sat (0 = Sunday)
  slots: ['09:30', '11:00', '13:00', '15:00', '17:00', '18:30'],
  perSlot: 1, // measurement teams that can go out at the same time
  blockedDates: [],
  leadHours: 3, // earliest booking from now
};

export const ALL_TIMES = Array.from({ length: 25 }, (_, i) => {
  const mins = 8 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}); // 08:00 … 20:00

const BISHKEK_OFFSET_MS = 6 * 3600_000;

export function bishkekToday(now = Date.now()): string {
  return new Date(now + BISHKEK_OFFSET_MS).toISOString().slice(0, 10);
}

function slotTimestamp(date: string, time: string): number {
  // date+time in Bishkek → UTC ms
  return Date.parse(`${date}T${time}:00Z`) - BISHKEK_OFFSET_MS;
}

export interface DaySlots {
  date: string;
  weekday: number;
  closed: boolean;
  slots: Array<{ time: string; free: number }>;
}

export function buildSlots(
  schedule: ScheduleConfig,
  bookings: Pick<BookingRecord, 'date' | 'time' | 'status'>[],
  days = 14,
  now = Date.now(),
): DaySlots[] {
  const taken = new Map<string, number>();
  for (const b of bookings) {
    if (!b.date || !b.time || b.status === 'cancelled') continue;
    const k = `${b.date} ${b.time}`;
    taken.set(k, (taken.get(k) || 0) + 1);
  }
  const start = Date.parse(`${bishkekToday(now)}T00:00:00Z`);
  const out: DaySlots[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start + i * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    const weekday = d.getUTCDay();
    const closed = !schedule.workDays.includes(weekday) || schedule.blockedDates.includes(date);
    const slots = closed
      ? []
      : schedule.slots.map((time) => {
          const tooSoon = slotTimestamp(date, time) < now + schedule.leadHours * 3600_000;
          const free = tooSoon ? 0 : Math.max(0, schedule.perSlot - (taken.get(`${date} ${time}`) || 0));
          return { time, free };
        });
    out.push({ date, weekday, closed, slots });
  }
  return out;
}

export function isSlotFree(
  schedule: ScheduleConfig,
  bookings: Pick<BookingRecord, 'date' | 'time' | 'status'>[],
  date: string,
  time: string,
  now = Date.now(),
): boolean {
  const day = buildSlots(schedule, bookings, 60, now).find((d) => d.date === date);
  return Boolean(day?.slots.find((s) => s.time === time && s.free > 0));
}
