export type Lang = 'ru' | 'ky' | 'en';

export type LocalizedText = {
  ru: string;
  ky: string;
  en: string;
};

export type ServiceCategory =
  | 'turnkey'
  | 'rough'
  | 'design3d'
  | 'wetrooms'
  | 'engineering';

export type PropertyType =
  | 'newbuild'
  | 'secondary'
  | 'house'
  | 'commercial';

export type MaterialTier = 'standard' | 'comfort' | 'premium';

export type BookingStatus =
  | 'pending'
  | 'in_progress'
  | 'handover'
  | 'completed'
  | 'cancelled';

export interface HeroSlide {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  image: string;
  textAlign: 'left' | 'right';
}

export interface RenovationService {
  id: string;
  category: ServiceCategory;
  name: LocalizedText;
  description: LocalizedText;
  pricePerSqm: number; // in KGS
  warrantyYears: number;
  durationDays: string;
  materials: string;
  image: string;
}

export interface PromoItem {
  id: string;
  badge: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  code: string;
  discountPercent: number;
  expiresAt: string;
}

export interface MasterItem {
  id: string;
  name: string;
  role: LocalizedText;
  experienceYears: number;
  specialization: LocalizedText;
  projectsCount: number;
  photo: string;
}

export interface BeforeAfterItem {
  id: string;
  title: LocalizedText;
  location: string;
  areaSqm: number;
  durationDays: number;
  budgetKgs: number;
  beforeImage: string;
  afterImage: string;
}

export interface InstagramPost {
  id: string;
  image: string;
  caption: LocalizedText;
  date: string;
  likes: number;
  url: string;
}

export interface FaqItem {
  id: string;
  question: LocalizedText;
  answer: LocalizedText;
}

export interface ContactsConfig {
  address: LocalizedText;
  phone: string;
  whatsapp: string;
  telegram: string;
  instagram: string;
  workHours: LocalizedText;
  twoGisUrl: string;
  yandexMapsUrl: string;
}

export interface SiteContent {
  tickerText: LocalizedText;
  heroSpeedMs: number;
  heroSlides: HeroSlide[];
  services: RenovationService[];
  promos: PromoItem[];
  masters: MasterItem[];
  beforeAfter: BeforeAfterItem[];
  instagramPosts: InstagramPost[];
  faqs: FaqItem[];
  contacts: ContactsConfig;
  priceList: WorkItem[];
  finishCatalog: FinishGroupConfig[];
  installment: InstallmentConfig;
  layouts: ApartmentLayout[]; // the studio's own layouts (ЖК plans), shown before the typical series
  schedule: ScheduleConfig;
}

// Free-measurement calendar (admin → "График и контакты").
export interface ScheduleConfig {
  workDays: number[]; // 0 = Sunday … 6 = Saturday
  slots: string[]; // "HH:MM", Bishkek time
  perSlot: number; // measurements possible at the same time
  blockedDates: string[]; // holidays, "YYYY-MM-DD"
  leadHours: number; // how soon a visit can be booked
}

export interface LayoutSpace {
  kind: 'living' | 'kitchen' | 'bath';
  area: number;
}

// A floor plan the client can start from: a typical Bishkek series or a specific complex.
export interface ApartmentLayout {
  id: string;
  series: string; // e.g. "106 серия" or "ЖК Авангард Сити"
  rooms: number;
  areaSqm: number;
  ceilingHeight: number;
  bathrooms: number;
  propertyType: PropertyType;
  spaces?: LayoutSpace[]; // for the schematic plan; hallway is the remainder
  planImage?: string; // photo/scan of the real plan
}

// Instalment offer shown under the estimate (switched on by the studio once a bank partner is set).
export interface InstallmentConfig {
  enabled: boolean;
  months: number[]; // e.g. [3, 6, 12]
  downPaymentPercent: number;
  markupPercent: number; // total extra cost over the whole term, 0 = interest-free
  note: string; // e.g. "Рассрочка через MBank, решение за 15 минут"
}

// Editable colour/material catalog (admin → "Каталог отделки").
export interface FinishOptionConfig {
  id: string;
  name: LocalizedText;
  color: string;
  accent?: string;
  photo?: string;
  surcharge?: number;
}

export interface FinishGroupConfig {
  id: FinishGroupId;
  label: LocalizedText;
  workItemIds: string[];
  options: FinishOptionConfig[];
}

// ------------------------------------------------------------------
// Itemized renovation estimate ("смета по работам")
// ------------------------------------------------------------------

export type WorkStageId =
  | 'demolition'
  | 'engineering_rough'
  | 'walls_rough'
  | 'floor_rough'
  | 'tiling'
  | 'walls_finish'
  | 'ceiling'
  | 'floor_finish'
  | 'doors'
  | 'engineering_finish'
  | 'cleaning';

export type WorkUnit = 'm2' | 'm' | 'pcs';

// Which apartment measurement drives the quantity of a work item.
export type WorkBasis =
  | 'floor' // all floor area
  | 'dry_floor' // floor without bathrooms
  | 'ceiling'
  | 'walls' // all wall area minus openings
  | 'dry_walls' // walls without tiled areas
  | 'bath_walls' // tiled bathroom walls
  | 'bath_floor'
  | 'kitchen_apron'
  | 'plinth' // running metres of skirting
  | 'windows'
  | 'interior_doors'
  | 'entrance_door'
  | 'electric_points'
  | 'light_points'
  | 'plumbing_points'
  | 'plumbing_fixtures'
  | 'switchboard'
  | 'debris_trips';

export interface WorkItem {
  id: string;
  stage: WorkStageId;
  name: LocalizedText;
  unit: WorkUnit;
  basis: WorkBasis;
  workPrice: number; // KGS per unit, crew labour
  materialPrice: Record<MaterialTier, number>; // KGS per unit, by material class
  enabledByDefault: boolean;
  secondaryOnly?: boolean; // only pre-selected for secondary housing (old finishes to remove)
}

export interface ApartmentParams {
  rooms: number; // 1–5 living rooms
  areaSqm: number;
  ceilingHeight: number; // metres
  bathrooms: number;
  propertyType: PropertyType;
  tier: MaterialTier;
  layout?: string; // chosen layout, e.g. "106 серия, 2-комн, 56 м²"
}

export interface WorkSelection {
  id: string;
  qty: number;
}

export interface WorkEstimateLine {
  id: string;
  stage: WorkStageId;
  name: string; // Russian name, frozen at booking time
  unit: WorkUnit;
  qty: number;
  workKgs: number;
  materialsKgs: number;
}

// Colour / finish choices the client makes for jobs (paint colour, tile, laminate…).
export type FinishGroupId =
  | 'wall_paint'
  | 'wallpaper'
  | 'bath_tile'
  | 'bath_floor_tile'
  | 'apron'
  | 'laminate'
  | 'plinth'
  | 'ceiling'
  | 'doors'
  | 'entrance_door'
  | 'sockets'
  | 'plumbing';

export type FinishChoices = Partial<Record<FinishGroupId, string>>;

export interface WorkEstimate {
  params: ApartmentParams;
  finishes?: FinishChoices;
  lines: WorkEstimateLine[];
  stages: Array<{ id: WorkStageId; totalKgs: number; days: number }>;
  workKgs: number;
  materialsKgs: number;
  totalKgs: number;
  days: number;
}

export type Room3DType = 'living' | 'bedroom' | 'kitchen' | 'bathroom';
export type WallFinishId =
  | 'warm_ivory'
  | 'sand_plaster'
  | 'graphite_silk'
  | 'sage_matte'
  | 'navy_velvet'
  | 'wood_slats'
  | 'travertine_slab';
export type FloorFinishId =
  | 'oak_herringbone'
  | 'walnut_plank'
  | 'travertine_tile'
  | 'slate_porcelain'
  | 'microcement';
export type CeilingTypeId = 'floating_led' | 'track_spots' | 'designer_chandelier';
export type AccentToneId = 'graphite' | 'warm_sand' | 'emerald' | 'terracotta' | 'royal_navy';
export type StylePresetId = 'minimal' | 'neoclassic' | 'warm_loft' | 'scandi' | 'ready_amber';

export interface Visual3DConfig {
  roomType: Room3DType;
  stylePreset: StylePresetId;
  wallFinish: WallFinishId;
  floorFinish: FloorFinishId;
  ceilingType: CeilingTypeId;
  accentTone: AccentToneId;
  lightingMode: 'day' | 'evening';
  renovationStage: 'after' | 'before';
  areaSqm: number;
  tier: MaterialTier;
  estimatedPriceKgs: number;
}

export interface BookingRecord {
  id: string; // RH-XXXXXX
  phone: string;
  clientName: string;
  propertyType: PropertyType;
  complexOrDistrict: string;
  addressDetails: string;
  areaSqm: number;
  roomsCount: string;
  serviceId: string;
  serviceName: string;
  warrantyYears: number;
  materialTier: MaterialTier;
  masterId: string;
  masterName: string;
  date: string;
  time: string;
  paymentMethod: string;
  needLayoutApproval: boolean;
  promoCode?: string;
  comment: string;
  totalPriceKgs: number;
  status: BookingStatus;
  createdAt: string;
  visual3D?: Visual3DConfig;
  workEstimate?: WorkEstimate;
  adminNote?: string; // only in admin API responses
  source?: 'quick'; // "перезвоните мне" request without an account or a chosen date
  contactMethod?: 'call' | 'whatsapp' | 'telegram';
}

export interface ClientProfile {
  name: string;
  phone: string;
  createdAt: string;
  savedPresets: Array<{
    id: string;
    label: string;
    createdAt: string;
    config: Visual3DConfig;
  }>;
  savedEstimates?: SavedEstimate[];
}

export interface SavedEstimate {
  id: string;
  label: string;
  createdAt: string;
  code: string; // encoded estimate, opens via #estimate=CODE
  totalKgs: number;
}

export interface ReviewItem {
  id: string;
  author: string;
  projectInfo: string;
  rating: number;
  text: string;
  createdAt: string;
  status?: 'pending' | 'approved'; // missing = approved (older reviews)
}

export interface BookingDraft {
  serviceId?: string;
  propertyType?: PropertyType;
  areaSqm?: number;
  materialTier?: MaterialTier;
  promoCode?: string;
  visual3D?: Visual3DConfig;
  roomsCount?: string;
  workEstimate?: {
    params: ApartmentParams;
    selections: WorkSelection[];
    finishes: FinishChoices;
    preview: WorkEstimate; // client-side numbers for display; the server recomputes
  };
  shareCode?: string; // #estimate=CODE link to the same estimate
}
