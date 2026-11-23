import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  CreditCard,
  Layers,
  MessageCircle,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import type {
  BookingDraft,
  BookingRecord,
  ClientProfile,
  Lang,
  MaterialTier,
  PropertyType,
  SiteContent,
} from '../types.ts';
import {
  BISHKEK_COMPLEXES,
  calculateRenovationEstimate,
  PAYMENT_METHODS,
} from '../data/defaultContent.ts';
import { formatKgs, PROPERTY_LABELS, TIER_LABELS, tLoc } from '../i18n.ts';
import { apiFetch } from '../apiClient.ts';
import type { DaySlots } from '../data/schedule.ts';
import { SmartImage } from './SmartImage.tsx';

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  content: SiteContent;
  lang: Lang;
  profile: ClientProfile;
  draft: BookingDraft;
  onSuccess: (booking: BookingRecord) => void;
  onOpenCabinet: () => void;
}

const ROOM_COUNTS = ['Студия', '1-комн', '2-комн', '3-комн', '4+ комн / Дом'];

export function BookingModal({
  open,
  onClose,
  content,
  lang,
  profile,
  draft,
  onSuccess,
  onOpenCabinet,
}: BookingModalProps) {
  const [step, setStep] = useState(1);
  const [propertyType, setPropertyType] = useState<PropertyType>(draft.propertyType || 'newbuild');
  const [complexOrDistrict, setComplexOrDistrict] = useState(BISHKEK_COMPLEXES[0]);
  const [addressDetails, setAddressDetails] = useState('');
  const [areaSqm, setAreaSqm] = useState(draft.areaSqm || draft.visual3D?.areaSqm || 72);
  const [roomsCount, setRoomsCount] = useState(draft.roomsCount || '2-комн');

  const [serviceId, setServiceId] = useState(draft.serviceId || content.services[0]?.id || '');
  const [materialTier, setMaterialTier] = useState<MaterialTier>(
    draft.materialTier || draft.visual3D?.tier || 'comfort',
  );
  const [masterId, setMasterId] = useState(content.masters[0]?.id || '');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [calendar, setCalendar] = useState<DaySlots[] | null>(null);

  // Live calendar of free measurement slots; pick the first free one by default.
  const loadSlots = async () => {
    const res = await apiFetch<{ days?: DaySlots[] }>('/api/slots?days=14');
    if (!res.ok || !Array.isArray(res.data.days)) return;
    setCalendar(res.data.days);
    const firstDay = res.data.days.find((d) => d.slots.some((s) => s.free > 0));
    if (firstDay && !date) {
      setDate(firstDay.date);
      setTime(firstDay.slots.find((s) => s.free > 0)?.time || '');
    }
  };
  useEffect(() => {
    void loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [clientName, setClientName] = useState(profile.name);
  const [comment, setComment] = useState('');
  const [promoCode, setPromoCode] = useState(draft.promoCode || '');
  const [needLayoutApproval, setNeedLayoutApproval] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdBooking, setCreatedBooking] = useState<BookingRecord | null>(null);

  const selectedService = useMemo(
    () => content.services.find((s) => s.id === serviceId) || content.services[0],
    [content.services, serviceId],
  );

  const matchedPromo = useMemo(
    () => content.promos.find((p) => p.code.toUpperCase() === promoCode.trim().toUpperCase()),
    [content.promos, promoCode],
  );

  const estimate = useMemo(() => {
    // An itemized estimate from the "Смета по работам" section overrides the per-m² formula.
    const work = draft.workEstimate?.preview;
    if (work) {
      const discount = matchedPromo?.discountPercent || 0;
      return {
        workKgs: work.workKgs,
        materialsKgs: work.materialsKgs,
        totalKgs: Math.round((work.totalKgs * (100 - discount)) / 100),
        estimatedDays: work.days,
      };
    }
    const base = selectedService?.pricePerSqm || 12500;
    return calculateRenovationEstimate(
      base,
      areaSqm,
      propertyType,
      materialTier,
      matchedPromo?.discountPercent || 0,
    );
  }, [selectedService, areaSqm, propertyType, materialTier, matchedPromo, draft.workEstimate]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    const res = await apiFetch<{ ok?: boolean; booking?: BookingRecord; error?: string }>(
      '/api/bookings',
      {
        method: 'POST',
        auth: 'client',
        body: JSON.stringify({
          clientName,
          propertyType,
          complexOrDistrict,
          addressDetails,
          areaSqm,
          roomsCount,
          serviceId: selectedService?.id,
          materialTier,
          masterId,
          date,
          time,
          paymentMethod,
          needLayoutApproval,
          promoCode: promoCode.trim(),
          comment,
          visual3D: draft.visual3D,
          workEstimate: draft.workEstimate
            ? {
                params: draft.workEstimate.params,
                selections: draft.workEstimate.selections,
                finishes: draft.workEstimate.finishes,
              }
            : undefined,
        }),
      },
    );
    setSubmitting(false);

    if (!res.ok || !res.data.booking) {
      setError(res.data.error || 'Не удалось сохранить заявку. Попробуйте снова.');
      return;
    }
    setCreatedBooking(res.data.booking);
    onSuccess(res.data.booking);
  };

  const whatsappText = createdBooking
    ? encodeURIComponent(
        `Здравствуйте, READY HOME! Я оформил(а) заявку ${createdBooking.id} на ремонт (${createdBooking.complexOrDistrict}, ${createdBooking.areaSqm} м²). Замер: ${createdBooking.date} в ${createdBooking.time}.`,
      )
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-[#16213a] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {createdBooking ? 'Заявка оформлена' : 'Онлайн-запись на замер и ремонт'}
            </h3>
            {!createdBooking && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Шаг {step} из 5 · Оценка: <span className="text-amber-600 dark:text-amber-400 font-semibold tabular-nums">{formatKgs(estimate.totalKgs)}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        {!createdBooking && (
          <div className="h-1.5 bg-slate-100 dark:bg-white/5 w-full">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {createdBooking ? (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Номер вашей заявки</p>
                <div className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-500 tabular-nums">
                  {createdBooking.id}
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Запись сохранена в вашем личном кабинете. Инженер свяжется с вами для подтверждения выезда.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 p-4 text-left text-sm space-y-1.5">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Объект:</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right">
                    {createdBooking.complexOrDistrict}, {createdBooking.areaSqm} м²
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Услуга:</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right">
                    {createdBooking.serviceName}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Дата замера:</span>
                  <span className="font-medium text-slate-900 dark:text-white tabular-nums">
                    {createdBooking.date} · {createdBooking.time}
                  </span>
                </div>
                <div className="flex justify-between gap-2 pt-1.5 border-t border-slate-200 dark:border-white/10">
                  <span className="text-slate-500">Ориентировочная смета:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatKgs(createdBooking.totalPriceKgs)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCabinet();
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Открыть личный кабинет
                </button>
                <a
                  href={`https://wa.me/${content.contacts.whatsapp}?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-amber-500 text-sm font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                  Написать в WhatsApp студии
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Attached 3D Config Notice */}
              {draft.visual3D && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 flex items-center gap-3 text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                  <Layers className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    Прикреплён ваш 3D-проект: <strong>{draft.visual3D.roomType}</strong> · стиль{' '}
                    <strong>{draft.visual3D.stylePreset}</strong> · {draft.visual3D.areaSqm} м²
                  </div>
                </div>
              )}
              {draft.workEstimate && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 flex items-center gap-3 text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                  <Layers className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    Прикреплена смета по работам: <strong>{draft.workEstimate.params.rooms}-комн</strong> ·{' '}
                    {draft.workEstimate.params.areaSqm} м² · {draft.workEstimate.preview.lines.length} работ ·{' '}
                    <strong className="tabular-nums">{formatKgs(draft.workEstimate.preview.totalKgs)}</strong>
                  </div>
                </div>
              )}

              {/* STEP 1: PROPERTY */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      1. Тип объекта недвижимости
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(['newbuild', 'secondary', 'house', 'commercial'] as PropertyType[]).map((pt) => (
                        <button
                          key={pt}
                          type="button"
                          onClick={() => setPropertyType(pt)}
                          className={`px-3.5 py-2.5 rounded-xl text-left text-sm font-medium border transition-colors cursor-pointer ${
                            propertyType === pt
                              ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-amber-500/40'
                          }`}
                        >
                          {PROPERTY_LABELS[pt][lang]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      ЖК или район Бишкека
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {BISHKEK_COMPLEXES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setComplexOrDistrict(c)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            complexOrDistrict === c
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-amber-500/50'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={complexOrDistrict}
                      onChange={(e) => setComplexOrDistrict(e.target.value)}
                      placeholder="Название ЖК или улицы"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Площадь объекта (м²)
                      </label>
                      <input
                        type="number"
                        min={15}
                        max={1200}
                        value={areaSqm}
                        onChange={(e) => setAreaSqm(Number(e.target.value) || 40)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Корпус / этаж / квартира (необязательно)
                      </label>
                      <input
                        type="text"
                        value={addressDetails}
                        onChange={(e) => setAddressDetails(e.target.value)}
                        placeholder="Блок B, 7 этаж"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                      Количество комнат
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ROOM_COUNTS.map((rc) => (
                        <button
                          key={rc}
                          type="button"
                          onClick={() => setRoomsCount(rc)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            roomsCount === rc
                              ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {rc}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SERVICE & MATERIAL TIER */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      2. Выберите пакет ремонта
                    </label>
                    <div className="space-y-2">
                      {content.services.map((srv) => (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => setServiceId(srv.id)}
                          className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            serviceId === srv.id
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-slate-200 dark:border-white/10 hover:border-amber-500/40'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-sm text-slate-900 dark:text-white">
                              {tLoc(srv.name, lang)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Гарантия {srv.warrantyYears} лет · {srv.durationDays}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap tabular-nums">
                            {formatKgs(srv.pricePerSqm)}/м²
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      Класс отделочных материалов
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['standard', 'comfort', 'premium'] as MaterialTier[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setMaterialTier(t)}
                          className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                            materialTier === t
                              ? 'border-amber-500 bg-amber-500 text-slate-950 font-semibold'
                              : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {TIER_LABELS[t][lang]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 p-4 flex items-center justify-between">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Расчёт для {areaSqm} м² ({PROPERTY_LABELS[propertyType][lang]}) · ~{estimate.estimatedDays} дней
                    </div>
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatKgs(estimate.totalKgs)}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: MASTER */}
              {step === 3 && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                    3. Выберите ведущего инженера / архитектора
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {content.masters.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMasterId(m.id)}
                        className={`p-3.5 rounded-2xl border text-left flex items-center gap-3.5 transition-colors cursor-pointer ${
                          masterId === m.id
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-slate-200 dark:border-white/10 hover:border-amber-500/40'
                        }`}
                      >
                        <SmartImage
                          src={m.photo}
                          alt={m.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                            {m.name}
                          </div>
                          <div className="text-xs text-amber-600 dark:text-amber-400 truncate">
                            {tLoc(m.role, lang)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                            Стаж {m.experienceYears} лет · {m.projectsCount} объектов
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: DATE & TIME */}
              {step === 4 && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                    4. Дата и время бесплатного выезда на замер
                  </label>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" /> Выберите день — показаны только свободные окна
                    </label>
                    {!calendar ? (
                      <div className="h-16 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1">
                        {calendar.map((d) => {
                          const free = d.slots.filter((s) => s.free > 0).length;
                          const dt = new Date(d.date + 'T00:00:00Z');
                          const active = d.date === date;
                          return (
                            <button
                              key={d.date}
                              type="button"
                              disabled={free === 0}
                              onClick={() => {
                                setDate(d.date);
                                setTime(d.slots.find((s) => s.free > 0)?.time || '');
                              }}
                              className={`shrink-0 w-16 py-2 rounded-xl border text-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                                active
                                  ? 'bg-amber-500 border-amber-500 text-slate-950'
                                  : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <div className="text-[10px] uppercase">
                                {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.weekday]}
                              </div>
                              <div className="text-base font-bold tabular-nums">{dt.getUTCDate()}</div>
                              <div className="text-[10px]">{d.closed ? 'вых.' : free ? `${free} окон` : 'занято'}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                      Время визита
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(calendar?.find((d) => d.date === date)?.slots || []).map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={slot.free === 0}
                          onClick={() => setTime(slot.time)}
                          className={`py-2.5 rounded-xl text-sm font-medium border tabular-nums transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through ${
                            time === slot.time
                              ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold'
                              : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-amber-500/50'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: CONTACTS & PAYMENT */}
              {step === 5 && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Ваше имя
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Телефон (из личного кабинета)
                      </label>
                      <input
                        type="text"
                        value={profile.phone}
                        readOnly
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Промокод (если есть)
                      </label>
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="READY15"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white uppercase"
                      />
                      {matchedPromo && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          Применена скидка −{matchedPromo.discountPercent}%
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Предпочтительный способ оплаты
                      </label>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                        >
                          {PAYMENT_METHODS.map((pm) => (
                            <option key={pm} value={pm}>
                              {pm}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={needLayoutApproval}
                      onChange={(e) => setNeedLayoutApproval(e.target.checked)}
                      className="mt-0.5 accent-amber-500"
                    />
                    <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      Нужна помощь с согласованием перепланировки и дизайн-проектом в Бишкеке
                    </span>
                  </label>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Комментарий к ремонту
                    </label>
                    <textarea
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Пожелания по материалам, срокам заезда, дизайн-проекту..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      Мы не храним номера банковских карт на сайте. Безналичная оплата проходит строго через защищённый шлюз банка-эквайера (MBank, Optima, Bakai, FreedomPay) после подписания договора.
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs sm:text-sm">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Buttons */}
        {!createdBooking && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Назад
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
              >
                Далее
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
              >
                {submitting ? 'Сохранение...' : 'Подтвердить запись'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
