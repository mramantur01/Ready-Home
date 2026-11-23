import type { PropertyType, MaterialTier, SiteContent, ReviewItem, Visual3DConfig } from '../types.ts';

export const ASSET_IMAGES = {
  heroLiving: '/src/assets/images/hero_living_luxury_1795408666796.jpg',
  heroKitchen: '/src/assets/images/hero_kitchen_marble_1795408665355.jpg',
  beforeApt: '/src/assets/images/before_concrete_apt_1795408665851.jpg',
  afterApt: '/src/assets/images/after_finished_apt_1795408665542.jpg',
  serviceBath: '/src/assets/images/service_bathroom_spa_1795408666230.jpg',
  serviceBedroom: '/src/assets/images/service_bedroom_suite_1795408665234.jpg',
  masterArch: '/src/assets/images/master_architect_1795408665669.jpg',
  masterDesigner: '/src/assets/images/master_designer_1795408665231.jpg',
} as const;

export const PROPERTY_MULTIPLIERS: Record<PropertyType, number> = {
  newbuild: 1.0,
  secondary: 1.15,
  house: 1.22,
  commercial: 1.1,
};

export const MATERIAL_MULTIPLIERS: Record<MaterialTier, number> = {
  standard: 1.0,
  comfort: 1.28,
  premium: 1.62,
};

export const BISHKEK_COMPLEXES = [
  'ЖК Авангард Сити',
  'ЖК Роял Парк',
  'ЖК Манас',
  'ЖК Елизавета',
  'ЖК Ихлас Резиденс',
  'Южные микрорайоны',
  'Орто-Сай (коттедж)',
  'Центр / Бульвар Эркиндик',
  'Микрорайон Джал',
];

export const PAYMENT_METHODS = [
  'MBank',
  'O!Деньги',
  'Optima Bank',
  'Bakai Bank',
  'Карта (эквайринг банка)',
  'Наличные по договору',
];

export function calculateRenovationEstimate(
  basePricePerSqm: number,
  areaSqm: number,
  propertyType: PropertyType,
  tier: MaterialTier,
  discountPercent = 0,
): {
  workKgs: number;
  materialsKgs: number;
  totalKgs: number;
  estimatedDays: number;
} {
  const safeArea = Math.max(15, Math.min(1000, Math.round(areaSqm)));
  const propMult = PROPERTY_MULTIPLIERS[propertyType] ?? 1;
  const matMult = MATERIAL_MULTIPLIERS[tier] ?? 1;
  const workKgs = Math.round(basePricePerSqm * safeArea * propMult);
  const materialsKgs = Math.round(workKgs * (0.42 * matMult));
  const gross = workKgs + materialsKgs;
  const discount = Math.max(0, Math.min(35, discountPercent));
  const totalKgs = Math.round((gross * (100 - discount)) / 100 / 100) * 100;
  const estimatedDays = Math.max(18, Math.round(safeArea * (tier === 'premium' ? 1.15 : tier === 'comfort' ? 0.95 : 0.78)));
  return { workKgs, materialsKgs, totalKgs, estimatedDays };
}

export function calculate3DProjectEstimate(config: Omit<Visual3DConfig, 'estimatedPriceKgs'>): number {
  const baseByRoom: Record<Visual3DConfig['roomType'], number> = {
    living: 13500,
    bedroom: 12200,
    kitchen: 16800,
    bathroom: 21500,
  };
  const wallExtra: Record<Visual3DConfig['wallFinish'], number> = {
    warm_ivory: 0,
    sand_plaster: 1400,
    graphite_silk: 900,
    sage_matte: 600,
    navy_velvet: 1100,
    wood_slats: 2600,
    travertine_slab: 3800,
  };
  const floorExtra: Record<Visual3DConfig['floorFinish'], number> = {
    oak_herringbone: 2900,
    walnut_plank: 2400,
    travertine_tile: 2700,
    slate_porcelain: 2200,
    microcement: 3100,
  };
  const ceilingExtra: Record<Visual3DConfig['ceilingType'], number> = {
    floating_led: 1800,
    track_spots: 1450,
    designer_chandelier: 2200,
  };
  const tierMult = MATERIAL_MULTIPLIERS[config.tier] ?? 1;
  const perSqm =
    (baseByRoom[config.roomType] +
      wallExtra[config.wallFinish] +
      floorExtra[config.floorFinish] +
      ceilingExtra[config.ceilingType]) *
    tierMult;
  return Math.round((perSqm * Math.max(12, config.areaSqm)) / 1000) * 1000;
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  tickerText: {
    ru: 'Скидка 15% на дизайнерский ремонт под ключ и бесплатный 3D-замер квартиры в Бишкеке при онлайн-записи',
    ky: 'Онлайн жазылууда Бишкектеги батирлерди ачкычка чейин дизайнердик оңдоого 15% арзандатуу жана акысыз 3D-өлчөө',
    en: '15% off turnkey designer apartment renovation plus complimentary 3D site survey in Bishkek when booking online',
  },
  heroSpeedMs: 6500,
  heroSlides: [
    {
      id: 'slide-1',
      title: {
        ru: 'Идеальный ремонт квартир и домов под ключ с 3D-визуализацией',
        ky: '3D-визуализация менен батирлерди жана үйлөрдү ачкычка чейин кемчиликсиз оңдоо',
        en: 'Turnkey apartment and house renovation with live 3D visualization',
      },
      subtitle: {
        ru: 'Создайте примерный 3D-ремонт своей квартиры прямо на сайте, получите точную смету в сомах и фиксированные сроки по официальному договору в Бишкеке.',
        ky: 'Сайтыбызда батириңиздин болжолдуу 3D-оңдоосун түзүп, сом менен так сметаны жана Бишкектеги расмий келишим боюнча мөөнөттү алыңыз.',
        en: 'Preview your apartment renovation in interactive 3D right on the site, get a transparent KGS estimate, and lock fixed delivery dates under contract in Bishkek.',
      },
      image: ASSET_IMAGES.heroLiving,
      textAlign: 'left',
    },
    {
      id: 'slide-2',
      title: {
        ru: 'Дизайнерские кухни, гостиные и коттеджи без лишних забот',
        ky: 'Түйшүксүз дизайнердик ашканалар, конок бөлмөлөр жана коттедждер',
        en: 'Architectural kitchens, living spaces, and villas delivered turnkey',
      },
      subtitle: {
        ru: 'Собственные инженерные бригады, фото-отчёты каждую неделю в личном кабинете, прямые поставки Knauf, Kerama Marazzi и Grohe.',
        ky: 'Жеке инженердик бригадалар, жеке кабинетте жума сайын фото-отчёттор, Knauf, Kerama Marazzi жана Grohe түз жеткирүүлөрү.',
        en: 'In-house engineering crews, weekly progress reports in your client portal, and direct supplies from Knauf, Kerama Marazzi, and Grohe.',
      },
      image: ASSET_IMAGES.heroKitchen,
      textAlign: 'left',
    },
  ],
  services: [
    {
      id: 'srv-turnkey-design',
      category: 'turnkey',
      name: {
        ru: 'Дизайнерский ремонт под ключ',
        ky: 'Ачкычка чейин дизайнердик оңдоо',
        en: 'Turnkey Designer Renovation',
      },
      description: {
        ru: 'Полный цикл работ от 3D-проекта и черновой стяжки до монтажа встроенной мебели, парящих потолков и премиальной сантехники.',
        ky: '3D-долбоордон жана кара жумуштардан баштап эмерек, жарыктандыруу жана премиум сантехниканы орнотууга чейин толук цикл.',
        en: 'End-to-end execution from 3D concept and screed leveling to recessed LED ceilings, bespoke joinery, and premium fixtures.',
      },
      pricePerSqm: 16500,
      warrantyYears: 5,
      durationDays: '65–95 дней',
      materials: 'Knauf, Kerama Marazzi, Grohe, Schneider Electric',
      image: ASSET_IMAGES.heroLiving,
    },
    {
      id: 'srv-turnkey-comfort',
      category: 'turnkey',
      name: {
        ru: 'Капитальный ремонт новостройки (ПСО)',
        ky: 'Жаңы курулушту капиталдык оңдоо (ПСО)',
        en: 'New-Build Full Renovation (White Box to Ready)',
      },
      description: {
        ru: 'Идеально для квартир ПСО в Бишкеке: возведение перегородок, полная разводка электрики и сантехники, чистовая отделка под ключ.',
        ky: 'Бишкектеги ПСО батирлер үчүн идеалдуу: бөлмө тосмолору, электр жана сантехника, толук таза жасалгалоо.',
        en: 'Tailored for Bishkek shell-and-core apartments: partitions, full electrical and plumbing routing, and complete finishing.',
      },
      pricePerSqm: 12500,
      warrantyYears: 4,
      durationDays: '50–75 дней',
      materials: 'Knauf, Ceresit, Rehau, Tarkett, Tikkurila',
      image: ASSET_IMAGES.afterApt,
    },
    {
      id: 'srv-design-3d',
      category: 'design3d',
      name: {
        ru: '3D Дизайн-проект и авторский надзор',
        ky: '3D Дизайн-долбоор жана автордук көзөмөл',
        en: '3D Interior Architecture & Supervision',
      },
      description: {
        ru: 'Обмерный план, 3 варианта планировки, фотореалистичная 3D-визуализация всех комнат, рабочие чертежи и ведомость материалов.',
        ky: 'Өлчөө планы, 3 пландоо варианты, бардык бөлмөлөрдүн 3D-визуализациясы, жумушчу чиймелер жана материалдар тизмеси.',
        en: 'Laser measurements, 3 space layouts, photorealistic 3D renders for every room, technical blueprints, and bill of materials.',
      },
      pricePerSqm: 2400,
      warrantyYears: 5,
      durationDays: '14–25 дней',
      materials: 'Полный комплект чертежей BIM / 3D-тур',
      image: ASSET_IMAGES.serviceBedroom,
    },
    {
      id: 'srv-bathroom',
      category: 'wetrooms',
      name: {
        ru: 'Ремонт санузла и ванной под ключ',
        ky: 'Ванна жана санузелди ачкычка чейин оңдоо',
        en: 'Luxury Bathroom & Wetroom Renovation',
      },
      description: {
        ru: 'Гидроизоляция, коллекторная разводка труб Rehau, запил керамогранита под 45°, скрытые инсталляции, тёплый пол и подсветка зеркал.',
        ky: 'Гидроизоляция, Rehau түтүктөрү, керамогранитти 45° кесүү, жашыруун инсталляция, жылуу пол жана күзгү жарыгы.',
        en: 'Waterproofing, Rehau manifold plumbing, mitered 45° large-format porcelain slabs, concealed frames, and underfloor heating.',
      },
      pricePerSqm: 22000,
      warrantyYears: 5,
      durationDays: '16–24 дня',
      materials: 'Rehau, Geberit, Grohe, Litokol, Kerama Marazzi',
      image: ASSET_IMAGES.serviceBath,
    },
    {
      id: 'srv-kitchen',
      category: 'wetrooms',
      name: {
        ru: 'Ремонт кухни-гостиной и столовой',
        ky: 'Ашкана жана конок бөлмөсүн оңдоо',
        en: 'Kitchen & Dining Space Renovation',
      },
      description: {
        ru: 'Вывод силовой электрики под технику, фартук из травертина или керамогранита, зонирование света, вентиляция и подготовка под остров.',
        ky: 'Техника үчүн күчтүү электр, травертин фартугу, жарыкты зоналаштыруу, желдетүү жана ашкана аралына даярдоо.',
        en: 'Dedicated appliance circuits, travertine or porcelain backsplashes, layered lighting zones, extraction, and island plumbing.',
      },
      pricePerSqm: 15000,
      warrantyYears: 4,
      durationDays: '20–30 дней',
      materials: 'Schneider Electric, Ceresit, Blum, керамогранит',
      image: ASSET_IMAGES.heroKitchen,
    },
    {
      id: 'srv-rough-engineering',
      category: 'engineering',
      name: {
        ru: 'Черновой ремонт, электрика и сантехника',
        ky: 'Кара жумуштар, электр жана сантехника',
        en: 'Rough Works, Electrical & Plumbing Systems',
      },
      description: {
        ru: 'Механизированная штукатурка по маякам, полусухая стяжка пола, сборка электрощита с УЗО, шумоизоляция и трассы кондиционеров.',
        ky: 'Маяк боюнча штукатурка, жарым кургак стяжка, УЗО менен электр щити, үн изоляциясы жана кондиционер трассалары.',
        en: 'Laser-leveled plastering, semi-dry floor screed, RCD breaker panels, acoustic insulation, and recessed AC lines.',
      },
      pricePerSqm: 7800,
      warrantyYears: 5,
      durationDays: '22–35 дней',
      materials: 'Knauf MP-75, кабель ГОСТ ВВГнг-LS, трубы Rehau',
      image: ASSET_IMAGES.beforeApt,
    },
  ],
  promos: [
    {
      id: 'promo-1',
      badge: { ru: 'Хит сезона', ky: 'Сезон хити', en: 'Season Offer' },
      title: {
        ru: 'Скидка 15% на ремонт под ключ + 3D-планировка',
        ky: 'Ачкычка чейин оңдоого 15% арзандатуу + 3D-пландоо',
        en: '15% Off Turnkey Renovation + 3D Concept',
      },
      description: {
        ru: 'При заключении договора на капитальный или дизайнерский ремонт квартиры от 60 м² в Бишкеке.',
        ky: 'Бишкекте 60 м² баштап батирди капиталдык же дизайнердик оңдоо келишимин түзүүдө.',
        en: 'Valid on full or designer apartment renovations from 60 m² signed in Bishkek.',
      },
      code: 'READY15',
      discountPercent: 15,
      expiresAt: '31.12.2026',
    },
    {
      id: 'promo-2',
      badge: { ru: 'Новосёлам ПСО', ky: 'Жаңы конуш', en: 'New-Build Bonus' },
      title: {
        ru: 'Бесплатный технический аудит и приёмка квартиры',
        ky: 'Батирди акысыз техникалык аудит жана кабыл алуу',
        en: 'Free Thermal & Laser Apartment Handover Audit',
      },
      description: {
        ru: 'Наш инженер проверит стяжку, окна, вентиляцию и геометрию стен в новостройке до подписания акта с застройщиком.',
        ky: 'Биздин инженер куруучудан кабыл алуудан мурун стяжканы, терезелерди жана дубалдарды лазер менен текшерет.',
        en: 'Our chief engineer inspects screed, glazing, ventilation, and wall geometry before you sign developer handover.',
      },
      code: 'NEWBUILD',
      discountPercent: 10,
      expiresAt: '31.12.2026',
    },
    {
      id: 'promo-3',
      badge: { ru: 'Частные дома', ky: 'Жеке үйлөр', en: 'Private Houses' },
      title: {
        ru: 'Тёплый пол в санузлах в подарок для коттеджей',
        ky: 'Коттедждер үчүн санузелдерге жылуу пол белекке',
        en: 'Complimentary Bathroom Underfloor Heating',
      },
      description: {
        ru: 'При заказе комплексной отделки дома от 140 м² в Орто-Сае, Кок-Жаре или пригороде Бишкека.',
        ky: 'Орто-Сайда, Көк-Жарда же Бишкек четинде 140 м² баштап үйдү толук оңдоодо.',
        en: 'Included on full house renovations over 140 m² in Orto-Sai, Kok-Jar, and greater Bishkek.',
      },
      code: 'VILLAHEAT',
      discountPercent: 12,
      expiresAt: '31.12.2026',
    },
  ],
  masters: [
    {
      id: 'm-1',
      name: 'Бакыт Асанов',
      role: {
        ru: 'Главный инженер-прораб',
        ky: 'Башкы инженер-прораб',
        en: 'Chief Site Engineer',
      },
      experienceYears: 12,
      specialization: {
        ru: 'Капитальный ремонт ПСО, инженерия, технадзор по СНиП КР',
        ky: 'ПСО капиталдык оңдоо, инженерия, КР СНиП боюнча техкөзөмөл',
        en: 'Shell-and-core renovations, MEP systems, SNiP compliance',
      },
      projectsCount: 165,
      photo: ASSET_IMAGES.masterArch,
    },
    {
      id: 'm-2',
      name: 'Айгерим Токтосунова',
      role: {
        ru: 'Ведущий архитектор и 3D-визуализатор',
        ky: 'Жетекчи архитектор жана 3D-визуализатор',
        en: 'Lead Interior Architect & 3D Artist',
      },
      experienceYears: 9,
      specialization: {
        ru: 'Перепланировки, 3D-визуализация интерьеров, подбор отделочных материалов',
        ky: 'Кайра пландоо, 3D-визуализация, жасалгалоо материалдарын тандоо',
        en: 'Space planning, 3D architectural visualization, material curation',
      },
      projectsCount: 140,
      photo: ASSET_IMAGES.masterDesigner,
    },
    {
      id: 'm-3',
      name: 'Тимур Жумабеков',
      role: {
        ru: 'Руководитель направления отделки и коттеджей',
        ky: 'Жасалгалоо жана коттедж бөлүмүнүн башчысы',
        en: 'Head of Finishing & Villa Projects',
      },
      experienceYears: 11,
      specialization: {
        ru: 'Крупноформатный керамогранит, декоративные штукатурки, премиальные дома',
        ky: 'Чоң форматтагы керамогранит, декоративдик штукатурка, премиум үйлөр',
        en: 'Large-format stone slabs, Venetian plaster, turnkey villas',
      },
      projectsCount: 118,
      photo: ASSET_IMAGES.masterArch,
    },
  ],
  beforeAfter: [
    {
      id: 'ba-1',
      title: {
        ru: '3-комнатная квартира в ЖК «Авангард Сити»',
        ky: '«Авангард Сити» ТК 3 бөлмөлүү батир',
        en: '3-Bedroom Apartment at Avangard City',
      },
      location: 'Бишкек, ул. Токомбаева',
      areaSqm: 108,
      durationDays: 78,
      budgetKgs: 1940000,
      beforeImage: ASSET_IMAGES.beforeApt,
      afterImage: ASSET_IMAGES.afterApt,
    },
    {
      id: 'ba-2',
      title: {
        ru: 'Кухня-гостиная в ЖК «Роял Парк»',
        ky: '«Роял Парк» ТК ашкана-конок бөлмөсү',
        en: 'Kitchen & Living Suite at Royal Park',
      },
      location: 'Бишкек, Южная магистраль',
      areaSqm: 84,
      durationDays: 64,
      budgetKgs: 1480000,
      beforeImage: ASSET_IMAGES.beforeApt,
      afterImage: ASSET_IMAGES.heroKitchen,
    },
    {
      id: 'ba-3',
      title: {
        ru: 'Мастер-спальня и панорамная гостиная в ЖК «Манас»',
        ky: '«Манас» ТК мастер-уктоочу жана конок бөлмө',
        en: 'Panoramic Residence at Manas Complex',
      },
      location: 'Бишкек, Центр',
      areaSqm: 126,
      durationDays: 88,
      budgetKgs: 2350000,
      beforeImage: ASSET_IMAGES.beforeApt,
      afterImage: ASSET_IMAGES.heroLiving,
    },
  ],
  instagramPosts: [
    {
      id: 'ig-1',
      image: ASSET_IMAGES.heroLiving,
      caption: {
        ru: 'Сдали пентхаус 126 м² в ЖК «Авангард Сити». Дубовая ёлочка, парящий свет 3000K и венецианская штукатурка.',
        ky: '«Авангард Сити» ТК 126 м² пентхаусту тапшырдык. Эмен паркети жана 3000K жарыктандыруу.',
        en: 'Handed over a 126 m² penthouse in Avangard City. Herringbone oak, 3000K cove LEDs, Venetian plaster.',
      },
      date: '14.11.2026',
      likes: 418,
      url: 'https://instagram.com/readyhome.kg',
    },
    {
      id: 'ig-2',
      image: ASSET_IMAGES.heroKitchen,
      caption: {
        ru: 'Скульптурный остров из травертина и шпон американского ореха — наш новый проект в Орто-Сае.',
        ky: 'Травертинден ашкана аралы жана жаңгак шпону — Орто-Сайдагы жаңы долбоорубуз.',
        en: 'Sculpted travertine kitchen island with fluted American walnut cabinetry in Orto-Sai.',
      },
      date: '09.11.2026',
      likes: 532,
      url: 'https://instagram.com/readyhome.kg',
    },
    {
      id: 'ig-3',
      image: ASSET_IMAGES.serviceBath,
      caption: {
        ru: 'Ванная в стиле тёплого спа: керамогранит 120×60, латунная сантехника Grohe и скрытая подсветка зеркала.',
        ky: 'Жылуу спа стилиндеги ванна: 120×60 керамогранит, Grohe латунь сантехникасы.',
        en: 'Warm spa bathroom with 120×60 travertine porcelain slabs, brushed brass Grohe fixtures, and backlit mirror.',
      },
      date: '02.11.2026',
      likes: 374,
      url: 'https://instagram.com/readyhome.kg',
    },
    {
      id: 'ig-4',
      image: ASSET_IMAGES.serviceBedroom,
      caption: {
        ru: 'Мастер-спальня с акустическими дубовыми рейками и скрытым карнизом для штор. Тишина и уют.',
        ky: 'Акустикалык эмен рейкалары жана жашыруун карниз менен мастер-уктоочу бөлмө.',
        en: 'Master bedroom featuring fluted oak acoustic panels and recessed curtain cove lighting.',
      },
      date: '27.10.2026',
      likes: 289,
      url: 'https://instagram.com/readyhome.kg',
    },
  ],
  faqs: [
    {
      id: 'faq-1',
      question: {
        ru: 'Помогаете ли вы с согласованием перепланировки в Бишкеке?',
        ky: 'Бишкекте кайра пландоону макулдашууга жардам бересиздерби?',
        en: 'Do you assist with apartment layout modification permits in Bishkek?',
      },
      answer: {
        ru: 'Да. Наши архитекторы готовят проект перепланировки с соблюдением сейсмических норм КР (несущие конструкции и мокрые зоны не нарушаются) и сопровождают согласование в Бишкекглавархитектуре и Госрегистре.',
        ky: 'Ооба. Биздин архитекторлор КР сейсмикалык нормаларын сактоо менен долбоор даярдап, Бишкекбашкыархитектурада макулдашууга көмөктөшөт.',
        en: 'Yes. Our architects design seismic-compliant layouts under Kyrgyz building codes and assist with approvals through Bishkek Chief Architecture Office and Gosregistr.',
      },
    },
    {
      id: 'faq-2',
      question: {
        ru: 'Как формируется цена и может ли смета вырасти в процессе?',
        ky: 'Баа кантип түзүлөт жана иш учурунда смета өсүп кетиши мүмкүнбү?',
        en: 'How is pricing fixed and can the estimate change mid-renovation?',
      },
      answer: {
        ru: 'После бесплатного лазерного замера мы фиксируем подробную смету и график работ в официальном договоре. Стоимость работ не меняется, если вы сами не добавляете новые позиции. Оплата проходит поэтапно — только после приёмки каждого этапа.',
        ky: 'Акысыз лазердик өлчөөдөн кийин так смета жана мөөнөт расмий келишимде бекитилет. Төлөм ар бир этапты кабыл алгандан кийин гана жүргүзүлөт.',
        en: 'After a complimentary laser measurement, we lock the itemized estimate and timeline into a binding contract. Payments are split into milestones paid only after you approve each stage.',
      },
    },
    {
      id: 'faq-3',
      question: {
        ru: 'Насколько точен ваш 3D-конструктор ремонта на сайте?',
        ky: 'Сайтыңыздагы 3D-конструктор канчалык так?',
        en: 'How accurate is the online 3D renovation visualizer?',
      },
      answer: {
        ru: 'Онлайн 3D-студия позволяет сразу примерить сочетания стен, полов, потолков и освещения и получить ориентировочный бюджет с точностью ~85%. Выбранный 3D-проект передаётся архитектору для разработки точных рабочих чертежей под вашу планировку.',
        ky: 'Онлайн 3D-студия дубал, пол, шып жана жарык айкалыштарын дароо көрүп, ~85% тактыкта бюджетти билүүгө мүмкүндүк берет. Тандалган долбоор архитекторго өткөрүлөт.',
        en: 'The interactive 3D studio lets you test real material combinations and gives an ~85% accurate preliminary budget. Your saved 3D preset transfers directly to our architect for exact construction drawings.',
      },
    },
    {
      id: 'faq-4',
      question: {
        ru: 'Какую гарантию предоставляет READY HOME на выполненный ремонт?',
        ky: 'READY HOME аткарылган оңдоо иштерине кандай кепилдик берет?',
        en: 'What warranty does READY HOME provide on completed renovations?',
      },
      answer: {
        ru: 'Мы выдаём именной гарантийный сертификат сроком до 5 лет на инженерные сети (электрика, сантехника, гидроизоляция) и до 3–5 лет на отделочные работы. После завершения ремонта сертификат доступен для скачивания и печати в вашем личном кабинете.',
        ky: 'Инженердик тармактарга 5 жылга чейин жана жасалгалоо иштерине 3–5 жылга чейин кепилдик сертификатын беребиз. Сертификат жеке кабинетиңизде жеткиликтүү болот.',
        en: 'We issue an official warranty certificate covering up to 5 years on electrical, plumbing, and waterproofing, and 3–5 years on finishing. Completed clients can print it anytime from their portal.',
      },
    },
  ],
  contacts: {
    address: {
      ru: 'г. Бишкек, ул. Байтик Баатыра 70, БЦ «Авангард», шоурум READY HOME',
      ky: 'Бишкек ш., Байтик Баатыр көч. 70, «Авангард» ББ, READY HOME шоуруму',
      en: '70 Baitik Baatyr St, Avangard Business Center, READY HOME Showroom, Bishkek',
    },
    phone: '+996 555 780 900',
    whatsapp: '996555780900',
    telegram: 'readyhome_kg',
    instagram: 'readyhome.kg',
    workHours: {
      ru: 'Пн–Сб: 09:00 – 19:00, Вс: по записи',
      ky: 'Дш–Иш: 09:00 – 19:00, Жш: жазылуу боюнча',
      en: 'Mon–Sat: 09:00 – 19:00, Sun: by appointment',
    },
    twoGisUrl: 'https://2gis.kg/bishkek/search/Байтик%20Баатыра%2070',
    yandexMapsUrl: 'https://yandex.com/maps/10309/bishkek/?text=Байтик+Баатыра+70+Бишкек',
  },
};

export const DEFAULT_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    author: 'Нурлан Кыдыралиев',
    projectInfo: 'ЖК «Авангард Сити», 94 м² · Дизайнерский под ключ',
    rating: 5,
    text: 'Сначала собрали с супругой примерный 3D-ремонт прямо на сайте READY HOME, а уже на следующий день приехал прораб Бакыт с лазерным уровнем. Сдали квартиру за 74 дня точно по смете без единой скрытой доплаты.',
    createdAt: '2026-10-18',
  },
  {
    id: 'rev-2',
    author: 'Алина Султанова',
    projectInfo: 'ЖК «Роял Парк», 72 м² · Капитальный ПСО',
    rating: 5,
    text: 'Очень удобно отслеживать этапы ремонта в личном кабинете — каждый этап принимали спокойно, электрику и санузел сделали идеально. Гарантийный сертификат на 5 лет уже сохранили.',
    createdAt: '2026-10-04',
  },
  {
    id: 'rev-3',
    author: 'Эрмек Осмонов',
    projectInfo: 'Коттедж в Орто-Сае, 185 м² · Комплексная отделка',
    rating: 5,
    text: 'Ребята помогли и с проектом, и с закупкой керамогранита и сантехники Grohe по оптовым ценам. Чистота на объекте удивила — строительный мусор вывозили регулярно.',
    createdAt: '2026-09-21',
  },
];
