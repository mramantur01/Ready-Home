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
}

export interface ReviewItem {
  id: string;
  author: string;
  projectInfo: string;
  rating: number;
  text: string;
  createdAt: string;
}

export interface BookingDraft {
  serviceId?: string;
  propertyType?: PropertyType;
  areaSqm?: number;
  materialTier?: MaterialTier;
  promoCode?: string;
  visual3D?: Visual3DConfig;
}
