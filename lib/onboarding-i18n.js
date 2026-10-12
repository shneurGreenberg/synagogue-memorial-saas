const STRINGS = {
  en: {
    page_title: 'Open a memorial board community',
    intro: 'Complete the steps below. A platform administrator will review your request and create your community.',
    step_basics: 'Community details',
    step_location: 'Location',
    step_logo: 'Logo',
    step_contact: 'Contact & admin',
    step_review: 'Review',
    step_import_hint: 'After approval you can import names in Admin → People → Import (JSON).',
    name_label: 'Community name (English)',
    slug_label: 'Board URL slug',
    slug_help: 'Lowercase letters, numbers, and hyphens only — used in your board link.',
    title_he_label: 'Hebrew / local display name',
    title_en_label: 'English board title (optional)',
    city_label: 'City',
    timezone_label: 'Timezone',
    search_place: 'Search for a city',
    logo_label: 'Community logo',
    logo_bg_label: 'Background behind logo',
    logo_bg_none: 'Transparent',
    logo_bg_white: 'White',
    logo_bg_black: 'Black',
    contact_name: 'Contact person',
    contact_phone: 'Phone',
    admin_email: 'Admin email',
    admin_password: 'Admin login password',
    admin_password_help: 'You will use this with your community slug at the admin login page.',
    board_language: 'Board language',
    admin_language: 'Admin panel language',
    notes_label: 'Notes for the platform team (optional)',
    back: 'Back',
    next: 'Continue',
    submit: 'Submit request',
    success_title: 'Request submitted',
    success_body: 'Thank you! We will email you when your community is ready. You can import memorial names later from the admin People page.',
    invalid_token: 'This invitation link is invalid or has expired.',
    error_missing: 'Please fill in all required fields.',
    error_slug: 'Choose a valid, unique slug.',
    error_upload: 'Logo must be JPEG, PNG, WebP, GIF, or SVG.',
    error_invalid_svg: 'The SVG logo could not be accepted for security reasons.',
    language_label: 'Language',
    lang_en: 'English',
    lang_ru: 'Russian',
    lang_he: 'Hebrew',
  },
  he: {
    page_title: 'פתיחת קהילה ללוח הנצחה',
    intro: 'מלאו את השלבים. מנהל המערכת יאשר את הבקשה ויפתח את הקהילה.',
    step_basics: 'פרטי קהילה',
    step_location: 'מיקום',
    step_logo: 'לוגו',
    step_contact: 'איש קשר וניהול',
    step_review: 'סיכום',
    step_import_hint: 'אחרי האישור אפשר לייבא שמות בניהול → אנשים → ייבוא (JSON).',
    name_label: 'שם הקהילה (אנגלית)',
    slug_label: 'כתובת (slug)',
    slug_help: 'אותיות קטנות, מספרים ומקפים — לקישור הלוח.',
    title_he_label: 'שם בעברית / מקומי',
    title_en_label: 'כותרת באנגלית (אופציונלי)',
    city_label: 'עיר',
    timezone_label: 'אזור זמן',
    search_place: 'חיפוש עיר',
    logo_label: 'לוגו הקהילה',
    logo_bg_label: 'רקע מאחורי הלוגו',
    logo_bg_none: 'שקוף',
    logo_bg_white: 'לבן',
    logo_bg_black: 'שחור',
    contact_name: 'איש קשר',
    contact_phone: 'טלפון',
    admin_email: 'אימייל מנהל',
    admin_password: 'סיסמת כניסה לניהול',
    admin_password_help: 'תשמשו בה יחד עם ה-slug בדף הכניסה לניהול.',
    board_language: 'שפת הלוח',
    admin_language: 'שפת ממשק הניהול',
    notes_label: 'הערות לצוות (אופציונלי)',
    back: 'חזרה',
    next: 'המשך',
    submit: 'שליחת בקשה',
    success_title: 'הבקשה נשלחה',
    success_body: 'תודה! נעדכן כשהקהילה תהיה מוכנה. ייבוא שמות יתאפשר מאוחר יותר מדף האנשים בניהול.',
    invalid_token: 'קישור ההזמנה לא תקף או שפג תוקפו.',
    error_missing: 'נא למלא את כל השדות הנדרשים.',
    error_slug: 'בחרו slug תקף וייחודי.',
    error_upload: 'הלוגו חייב להיות JPEG, PNG, WebP, GIF או SVG.',
    error_invalid_svg: 'קובץ SVG לא התקבל מסיבות אבטחה.',
    language_label: 'שפה',
    lang_en: 'אנגלית',
    lang_ru: 'רוסית',
    lang_he: 'עברית',
  },
  ru: {
    page_title: 'Заявка на новую общину',
    intro: 'Заполните шаги. Администратор платформы проверит заявку и создаст общину.',
    step_basics: 'Данные общины',
    step_location: 'Местоположение',
    step_logo: 'Логотип',
    step_contact: 'Контакт и админ',
    step_review: 'Проверка',
    step_import_hint: 'После одобрения имена можно импортировать: Админ → Люди → Импорт (JSON).',
    name_label: 'Название (англ.)',
    slug_label: 'Slug для URL',
    slug_help: 'Строчные буквы, цифры и дефисы — для ссылки на доску.',
    title_he_label: 'Название на иврите / локальное',
    title_en_label: 'Заголовок на английском (необяз.)',
    city_label: 'Город',
    timezone_label: 'Часовой пояс',
    search_place: 'Поиск города',
    logo_label: 'Логотип общины',
    logo_bg_label: 'Фон за логотипом',
    logo_bg_none: 'Прозрачный',
    logo_bg_white: 'Белый',
    logo_bg_black: 'Чёрный',
    contact_name: 'Контактное лицо',
    contact_phone: 'Телефон',
    admin_email: 'Email администратора',
    admin_password: 'Пароль входа в админку',
    admin_password_help: 'Используется вместе со slug на странице входа.',
    board_language: 'Язык доски',
    admin_language: 'Язык админ-панели',
    notes_label: 'Заметки для команды (необяз.)',
    back: 'Назад',
    next: 'Далее',
    submit: 'Отправить заявку',
    success_title: 'Заявка отправлена',
    success_body: 'Спасибо! Мы сообщим, когда община будет готова. Импорт имён — позже в разделе «Люди».',
    invalid_token: 'Ссылка приглашения недействительна или истекла.',
    error_missing: 'Заполните обязательные поля.',
    error_slug: 'Укажите корректный уникальный slug.',
    error_upload: 'Логотип: JPEG, PNG, WebP, GIF или SVG.',
    error_invalid_svg: 'SVG не принят по соображениям безопасности.',
    language_label: 'Язык',
    lang_en: 'Английский',
    lang_ru: 'Русский',
    lang_he: 'Иврит',
  },
};

const ONBOARDING_LANG_COOKIE = 'onboarding_lang';

function normalizeOnboardingLangCode(raw) {
  const lang = String(raw || '').trim().toLowerCase();
  if (lang === 'he' || lang === 'ru' || lang === 'en') {
    return lang;
  }
  return '';
}

function resolveOnboardingLang(queryLang, cookieLang) {
  const fromQuery = normalizeOnboardingLangCode(queryLang);
  if (fromQuery) {
    return fromQuery;
  }
  const fromCookie = normalizeOnboardingLangCode(cookieLang);
  if (fromCookie) {
    return fromCookie;
  }
  return 'en';
}

function readOnboardingLangCookie(req) {
  const header = String((req && req.headers && req.headers.cookie) || '');
  const match = header.match(/(?:^|;\s*)onboarding_lang=([^;]*)/);
  if (!match) {
    return '';
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function buildOnboardingLangCookie(lang) {
  const safe = resolveOnboardingLang(lang);
  return `${ONBOARDING_LANG_COOKIE}=${encodeURIComponent(safe)}; Path=/join; Max-Age=31536000; SameSite=Lax`;
}

function getOnboardingTranslator(lang) {
  const key = resolveOnboardingLang(lang);
  const table = STRINGS[key] || STRINGS.en;
  return (messageKey) => table[messageKey] || STRINGS.en[messageKey] || messageKey;
}

module.exports = {
  ONBOARDING_LANG_COOKIE,
  resolveOnboardingLang,
  readOnboardingLangCookie,
  buildOnboardingLangCookie,
  getOnboardingTranslator,
};
