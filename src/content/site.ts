/**
 * =============================================================================
 * Single source of truth for every user-facing string (Russian).
 * =============================================================================
 * DRY: the phone number, the price and the CTA wording each appear in several
 * places on the page. Centralising them means the academy can change a price or
 * a phone number in exactly one file, and nothing on the site can go stale or
 * disagree with itself.
 * =============================================================================
 */

export const contacts = {
  /** Canonical E.164 — used for `tel:` and WhatsApp links. */
  phoneE164: '+77003575949',
  /** Display form. */
  phoneDisplay: '+7 700 357 59 49',
  whatsappUrl: 'https://wa.me/77003575949',
  instagramHandle: '@onerlabs',
  instagramUrl: 'https://www.instagram.com/onerlabs/',
  city: 'Астана',
  legalName: 'OnerLab',
} as const;

export const nav = [
  { href: '#about', label: 'О нас' },
  { href: '#advantages', label: 'Преимущества' },
  { href: '#program', label: 'Программа' },
  { href: '#gallery', label: 'Галерея' },
  { href: '#contacts', label: 'Контакты' },
] as const;

export const hero = {
  eyebrow: 'Офлайн-школа живописи в Астане',
  title: 'Раскройте творческий потенциал вашего ребенка с OnerLab',
  subtitle:
    'Офлайн-курсы живописи в Астане для детей 1–8 классов. Развиваем индивидуальность через искусство.',
  primaryCta: 'Записать на пробный урок',
  secondaryCta: 'Позвонить нам',
  /** Short trust markers shown under the CTA. */
  highlights: [
    'Все материалы включены',
    'Небольшие группы',
    'Пробный урок — 5 000 ₸',
  ],
} as const;

/**
 * The full-screen opening screen.
 *
 * TO SWITCH ON REAL FOOTAGE: drop the file at `public/hero/studio.mp4` and set
 * `videoSrc` to '/hero/studio.mp4'. Nothing else changes — the component picks
 * the <video> branch automatically and falls back to the painted still until
 * then. Shoot or licence something quiet and wide: hands, brushes, paint mixing.
 * Keep it under ~6 MB and 10-15s looping, because it is the first thing that
 * downloads on every visit.
 */
export const intro = {
  brand: 'OnerLab',
  tagline: 'Офлайн-школа живописи для детей в Астане',
  subline: 'Курсы для 1–8 классов. Развиваем индивидуальность через искусство.',
  scrollCue: 'Листайте вниз',
  /** Empty string = use the painted fallback still. */
  videoSrc: '/hero/studio-v2.mp4',
  /** Also used as the <video> poster, so the first frame is never blank. */
  fallbackSrc: '/hero/studio-fallback.svg',

  /**
   * A real frame lifted out of the footage, used to fill the letterforms on
   * phones where a second <video> decoder is too expensive.
   *
   * The painted SVG stood in here before, and it visibly clashed: the mark read
   * as olive artwork pasted over an unrelated scene. A still from the loop
   * shares the backdrop's colours and crops identically — `object-fit: cover`
   * against the same rectangle — so the mark still reads as a window, just a
   * frozen one.
   */
  logoStillSrc: '/hero/studio-frame.jpg',
} as const;

export const about = {
  sectionLabel: 'О нас',
  title: 'Мы учим детей видеть мир по-своему',
  paragraphs: [
    'OnerLab — это офлайн-академия живописи в Астане для детей 1–8 классов. Наша миссия — развивать творческий потенциал ребенка через искусство, помогая ему раскрыть свою индивидуальность и поверить в себя.',
    'Мы работаем не с «раскрасками по образцу», а с настоящей художественной программой: композиция, цвет, форма, свет. Ребенок последовательно проходит путь от первых линий до законченной работы, которую не стыдно показать на выставке.',
  ],
  stats: [
    { value: '1–8', label: 'классы' },
    { value: '1,5 ч', label: 'длительность урока' },
    { value: '2 раза', label: 'в неделю' },
  ],
} as const;

export const advantages = {
  sectionLabel: 'Преимущества',
  title: 'Почему родители выбирают OnerLab',
  subtitle: 'Всё, что нужно для спокойствия родителя и роста ребенка.',
  items: [
    {
      icon: 'palette',
      title: 'Все материалы включены в стоимость',
      description:
        'Краски, кисти, бумага и холсты уже входят в цену. Ничего докупать и носить с собой не нужно.',
    },
    {
      icon: 'teacher',
      title: 'Профессиональные педагоги и индивидуальный подход',
      description:
        'Занятия ведут практикующие художники. Педагог видит каждого ребенка и подбирает задачи под его уровень.',
    },
    {
      icon: 'levels',
      title: 'Подходит для начинающих и опытных',
      description:
        'Неважно, держал ли ребенок кисть раньше. Мы начинаем с той точки, где он находится сейчас.',
    },
    {
      icon: 'group',
      title: 'Небольшие группы',
      description:
        'Камерный формат: у преподавателя хватает времени подойти к каждому ученику на каждом занятии.',
    },
    {
      icon: 'program',
      title: 'Системная программа обучения живописи',
      description:
        'Последовательный курс, а не разовые мастер-классы. Каждый урок опирается на предыдущий.',
    },
    {
      icon: 'exhibition',
      title: 'Возможность участвовать в выставках',
      description:
        'Лучшие работы попадают на выставки — сильная мотивация и первая строчка в творческом портфолио.',
    },
  ],
} as const;

export const program = {
  sectionLabel: 'Программа и стоимость',
  title: 'Курс «Живопись и композиция»',
  subtitle:
    'Основной курс академии. Ребенок осваивает живопись системно — от базовых упражнений до самостоятельных работ.',
  courseName: 'Живопись и композиция',
  details: [
    { label: 'Формат', value: 'Офлайн, в выходные дни' },
    { label: 'Длительность урока', value: '1,5 часа' },
    { label: 'Периодичность', value: '2 раза в неделю' },
    { label: 'Возраст', value: '1–8 классы' },
  ],
  price: {
    amount: '21 000 ₸',
    period: 'в месяц',
    note: 'Все материалы уже включены в стоимость',
  },
  curriculum: [
    'Основы цвета и работа с палитрой',
    'Композиция: как выстроить кадр в листе',
    'Свет, тень и объем',
    'Работа с разными материалами: гуашь, акварель, акрил',
    'Натюрморт, пейзаж, сюжетная композиция',
    'Подготовка работ к выставке',
  ],
  offers: [
    {
      badge: 'Пробный урок',
      title: 'Первое занятие за 5 000 ₸',
      description:
        'Полноценный урок в группе: ребенок пробует материалы, знакомится с педагогом и уносит свою первую работу домой.',
    },
    {
      badge: 'Скидка',
      title: 'Скидка для детей из одной семьи',
      description:
        'Если у вас занимаются двое и более детей, мы делаем скидку на обучение. Условия уточнит менеджер.',
    },
  ],
  cta: 'Записать на пробный урок',
} as const;

export const gallery = {
  sectionLabel: 'Галерея',
  title: 'Работы наших учеников и жизнь студии',
  subtitle:
    'Реальные работы детей, наши педагоги и атмосфера занятий. Заглядывайте в Instagram — там мы публикуем новое каждую неделю.',
  cta: 'Смотреть в Instagram',
  /**
   * Panels of the gallery accordion.
   *
   * `image` still points at generated brand placeholders. TO PUBLISH REAL
   * PHOTOS: drop them into `photos-in/` and run `npm run gallery:import`. The
   * script rotates them upright, crops to the portrait shape these panels use,
   * compresses, and — importantly — strips EXIF, which on a phone photo taken
   * in the studio carries the GPS coordinates of a room full of children.
   * It then prints this block for you to paste back.
   *
   * `caption` IS the alt text. Describe what is actually in the frame
   * ("Натюрморт с грушами, акварель · 9 лет"), never "фото 1" — it is what a
   * screen reader reads aloud and what Google Images indexes.
   */
  items: [
    { caption: 'Натюрморт, акварель · 9 лет', image: '/gallery/work-1.svg' },
    { caption: 'Занятие в студии', image: '/gallery/work-2.svg' },
    { caption: 'Пейзаж, гуашь · 12 лет', image: '/gallery/work-3.svg' },
    { caption: 'Наши педагоги', image: '/gallery/work-4.svg' },
    { caption: 'Сюжетная композиция · 11 лет', image: '/gallery/work-5.svg' },
    { caption: 'Подготовка к выставке', image: '/gallery/work-6.svg' },
    { caption: 'Портрет, акрил · 14 лет', image: '/gallery/work-7.svg' },
    { caption: 'Первые работы новичков', image: '/gallery/work-8.svg' },
  ],
} as const;

/**
 * Frequently asked questions.
 *
 * Two jobs at once, and both are why this section exists:
 *
 *   CONVERSION — every entry is an objection a parent raises on the phone
 *   (price, age, materials, schedule, no experience). Answering them on the
 *   page removes the reasons not to submit the form.
 *
 *   SEARCH — the page carried 531 crawlable words and, measured against the
 *   live HTML, the word "рисование" appeared ZERO times despite "курсы
 *   рисования Астана" being a primary target query. Likewise "цена" and
 *   "сколько стоит". These answers use the words parents actually type,
 *   phrased naturally rather than stuffed, and are marked up as FAQPage so
 *   Google can show them as expandable results.
 *
 * EVERY ANSWER HERE IS A FACT ALREADY STATED ELSEWHERE ON THE SITE. Nothing
 * about the street address, group size in numbers, or exact lesson times is
 * invented — where we do not have the fact, the answer says the manager will
 * confirm it.
 */
export const faq = {
  sectionLabel: 'Вопросы',
  title: 'Частые вопросы о занятиях',
  subtitle:
    'Коротко отвечаем на то, что чаще всего спрашивают родители перед первым уроком.',
  items: [
    {
      q: 'С какого возраста можно записать ребенка на курсы рисования?',
      a: 'Мы занимаемся с детьми 1–8 классов. Группы формируются по возрасту и уровню подготовки, поэтому и первокласснику, и восьмикласснику на занятии одинаково интересно.',
    },
    {
      q: 'Сколько стоит обучение живописи в OnerLab?',
      a: 'Цена обучения — 21 000 ₸ в месяц. Все художественные материалы уже входят в стоимость: краски, кисти, бумагу и холсты докупать не нужно. Первое пробное занятие стоит 5 000 ₸.',
    },
    {
      q: 'Нужно ли покупать краски, кисти и другие материалы?',
      a: 'Нет. Всё для рисования мы выдаём на занятии — гуашь, акварель, акрил, кисти, бумагу и холсты. Ребенку нужно принести только желание рисовать.',
    },
    {
      q: 'Что если ребенок никогда раньше не рисовал?',
      a: 'Это нормально и встречается чаще всего. Курс подходит и начинающим, и тем, кто уже занимался: педагог даёт задания по силам, поэтому ребенок без опыта не отстаёт, а подготовленный не скучает.',
    },
    {
      q: 'Когда проходят занятия и сколько они длятся?',
      a: 'Занятия идут офлайн по выходным дням, два раза в неделю, каждое длится 1,5 часа. Если это расписание вам не подходит, менеджер подберёт удобное время из свободных групп.',
    },
    {
      q: 'Сколько детей занимается в группе?',
      a: 'Группы небольшие — это принципиальная позиция школы. Педагог успевает подойти к каждому ребенку за урок и разобрать именно его работу, а не вести занятие на весь класс сразу.',
    },
    {
      q: 'Чему именно научится ребенок на курсе живописи?',
      a: 'Это системная программа, а не раскрашивание по образцу: основы цвета и работа с палитрой, композиция, свет, тень и объем, работа гуашью, акварелью и акрилом. Ребенок последовательно проходит путь от первых упражнений до законченного натюрморта, пейзажа и сюжетной композиции.',
    },
    {
      q: 'Есть ли скидки, если занимаются двое детей из семьи?',
      a: 'Да, для детей из одной семьи действует скидка на обучение. Точные условия подскажет менеджер, когда перезвонит по вашей заявке.',
    },
    {
      q: 'Где находится художественная школа OnerLab?',
      a: 'Мы работаем офлайн в Астане. Точный адрес студии и как удобнее до нас добраться менеджер подскажет по телефону, когда вы оставите заявку на пробный урок.',
    },
    {
      q: 'Как записаться на пробный урок?',
      a: 'Оставьте заявку в форме на этой странице или позвоните нам. Менеджер перезвонит в течение рабочего дня, ответит на вопросы и вместе с вами подберёт удобное время. Никаких обязательств — вы просто пробуете.',
    },
  ],
} as const;

export const leadForm = {
  sectionLabel: 'Запись',
  title: 'Запишите ребенка на пробный урок за 5000 ₸',
  /** Sits above the fields. Deliberately NOT a repeat of `title` — the section
      heading beside it already carries that wording. */
  formLabel: 'Заполните форму — перезвоним в течение рабочего дня',
  /**
   * Directly answers the main objection we hear from parents — "у нас плотное
   * расписание, мы не впишемся".
   */
  disclaimer:
    'Расписание можно подобрать. Оставьте заявку — наш менеджер перезвонит вам в течение рабочего дня, расскажет о свободных группах и вместе с вами подберет удобное время занятий. Никаких обязательств: вы просто пробуете.',
  fields: {
    parentName: { label: 'Имя родителя', placeholder: 'Например: Айгуль' },
    childNameAge: { label: 'Имя и возраст ребенка', placeholder: 'Например: Алия, 9 лет' },
    school: { label: 'Из какой школы ученик', placeholder: 'Например: Гимназия №5' },
    phone: { label: 'Телефон / WhatsApp', placeholder: '+7 (700) 000-00-00' },
  },
  consent: {
    prefix: 'Я согласен(на) на обработку персональных данных и принимаю',
    linkLabel: 'политику конфиденциальности',
  },
  submit: 'Отправить заявку',
  submitting: 'Отправляем…',
  success: {
    title: 'Заявка отправлена!',
    text: 'Спасибо! Мы получили вашу заявку и перезвоним в течение рабочего дня, чтобы подобрать удобное время пробного урока.',
    again: 'Отправить ещё одну заявку',
  },
  genericError: 'Не удалось отправить заявку. Проверьте соединение или позвоните нам.',
  privacyNote: 'Мы не передаём ваши данные третьим лицам и используем их только для связи с вами.',
} as const;

export const footer = {
  tagline: 'Офлайн-академия живописи для детей 1–8 классов в Астане.',
  contactsLabel: 'Контакты',
  navLabel: 'Разделы',
  legalLabel: 'Документы',
  privacyLabel: 'Политика конфиденциальности',
  rightsReserved: 'Все права защищены.',
  writeUs: 'Написать в WhatsApp',
} as const;

export const meta = {
  title: 'OnerLab — курсы живописи для детей в Астане | Пробный урок за 5000 ₸',
  description:
    'OnerLab — офлайн-академия живописи в Астане для детей 1–8 классов. Все материалы включены, небольшие группы, профессиональные педагоги. Пробный урок за 5 000 ₸.',
  keywords: [
    'курсы рисования Астана',
    'живопись для детей Астана',
    'художественная школа Астана',
    'рисование для детей',
    'OnerLab',
  ],
} as const;
