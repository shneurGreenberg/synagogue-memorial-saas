const HEBREW_CHAR = /[\u0590-\u05FF]/;

const PATRONYMIC_RE = /(ович|евич|овна|евна|ич|на)$/i;

const GIVEN_TO_HE = {
  абрам: 'אברהם',
  аврам: 'אברהם',
  авраам: 'אברהם',
  яков: 'יעקב',
  иаков: 'יעקב',
  моисей: 'משה',
  мoses: 'משה',
  аарон: 'אהרן',
  иосиф: 'יוסף',
  йосеф: 'יוסף',
  david: 'דוד',
  давид: 'דוד',
  соломон: 'שלמה',
  шломо: 'שלמה',
  исаак: 'יצחק',
  ицхак: 'יצחק',
  израиль: 'ישראל',
  борис: 'בוריס',
  григорий: 'גריגורי',
  гриша: 'הרש',
  михаил: 'מיכאל',
  марк: 'מרדכי',
  мордехай: 'מרדכי',
  лейб: 'אריה ליב',
  арие: 'אריה',
  лев: 'אריה ליב',
  лёва: 'אריה ליב',
  евгений: 'הרש',
  ефим: 'חיים',
  хаим: 'חיים',
  chaim: 'חיים',
  менахем: 'מנחם',
  менахеммендель: 'מנחם מנדל',
  мендель: 'מנחם מנדל',
  шмуэль: 'שמואל',
  самуил: 'שמואל',
  симха: 'שמחה',
  рахамим: 'רחמים',
  рахель: 'רחל',
  сара: 'שרה',
  rivka: 'רבקה',
  ривка: 'רבקה',
  miryam: 'מרים',
  мария: 'מרים',
  esther: 'אסתר',
  эстер: 'אסתר',
};

const FAMILY_TO_HE = {
  левин: 'לוין',
  levin: 'לוין',
  левина: 'לוין',
  коэн: 'כהן',
  коган: 'כהן',
  кац: 'כץ',
  кацн: 'כץ',
  goldberg: 'גולדברג',
  голдберг: 'גולדברג',
  шапиро: 'שפירא',
  shapiro: 'שפירא',
  перельман: 'פרלמן',
  гордон: 'גורדון',
  рубин: 'רובין',
  фридман: 'פרידמן',
};

const CYRILLIC_TO_HE = {
  а: 'א',
  б: 'ב',
  в: 'ב',
  г: 'ג',
  д: 'ד',
  е: 'ה',
  ё: 'ה',
  ж: 'ז',
  з: 'ז',
  и: 'י',
  й: 'י',
  к: 'כ',
  л: 'ל',
  м: 'מ',
  н: 'נ',
  о: 'ו',
  п: 'פ',
  р: 'ר',
  с: 'ס',
  т: 'ת',
  у: 'ו',
  ф: 'פ',
  х: 'ח',
  ц: 'צ',
  ч: 'צ',
  ш: 'ש',
  щ: 'ש',
  ъ: '',
  ы: 'י',
  ь: '',
  э: 'א',
  ю: 'יו',
  я: 'יה',
};

function normalizeToken(token) {
  return (token || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я]/gi, '')
    .trim();
}

function tokenToHebrew(token) {
  const key = normalizeToken(token);
  if (!key) {
    return '';
  }

  if (GIVEN_TO_HE[key]) {
    return GIVEN_TO_HE[key];
  }

  if (FAMILY_TO_HE[key]) {
    return FAMILY_TO_HE[key];
  }

  if (!/[а-я]/.test(key)) {
    return token.trim();
  }

  let out = '';
  for (const char of key) {
    out += CYRILLIC_TO_HE[char] || '';
  }

  return out || token.trim();
}

function isPatronymic(part) {
  return PATRONYMIC_RE.test(part);
}

function stripPatronymic(patronymic) {
  if (!patronymic) {
    return '';
  }

  return patronymic
    .replace(/ович$/i, '')
    .replace(/евич$/i, '')
    .replace(/овна$/i, '')
    .replace(/евна$/i, '')
    .replace(/ич$/i, '')
    .replace(/на$/i, '')
    .trim();
}

function isFemalePatronymic(patronymic) {
  return /овна$|евна$|на$/i.test(patronymic || '');
}

export function parsePersonName(fullName) {
  const parts = (fullName || '')
    .replace(/,/g, ' ')
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { given: '', family: '', patronymic: '', father: '', female: false };
  }

  let patronymicIdx = -1;
  for (let i = 0; i < parts.length; i += 1) {
    if (isPatronymic(parts[i])) {
      patronymicIdx = i;
      break;
    }
  }

  const patronymic = patronymicIdx >= 0 ? parts[patronymicIdx] : '';
  const father = stripPatronymic(patronymic);
  const others = parts.filter((_, i) => i !== patronymicIdx);

  let family = '';
  let given = '';

  if (parts.length === 3 && patronymicIdx === 2) {
    family = parts[0];
    given = parts[1];
  } else if (parts.length === 3 && patronymicIdx === 1) {
    given = parts[0];
    family = parts[2];
  } else if (others.length >= 2) {
    family = others[others.length - 1];
    given = others.slice(0, -1).join(' ');
  } else if (others.length === 1) {
    given = others[0];
  }

  return {
    given,
    family,
    patronymic,
    father,
    female: isFemalePatronymic(patronymic),
  };
}

export function formatPersonName(fullName, lang) {
  const raw = (fullName || '').trim();
  if (!raw) {
    return '';
  }

  if (HEBREW_CHAR.test(raw)) {
    return raw;
  }

  if (lang !== 'he') {
    return raw;
  }

  const parsed = parsePersonName(raw);
  const givenHe = tokenToHebrew(parsed.given);
  const fatherHe = tokenToHebrew(parsed.father);
  const familyHe = tokenToHebrew(parsed.family);

  const connector = parsed.female ? 'בת' : 'בן';

  const segments = [givenHe];

  if (fatherHe) {
    segments.push(connector, fatherHe);
  }

  if (familyHe) {
    segments.push(familyHe);
  }

  if (segments.length === 1 && !fatherHe && !familyHe) {
    return raw
      .split(/\s+/)
      .map(tokenToHebrew)
      .filter(Boolean)
      .join(' ');
  }

  return segments.filter(Boolean).join(' ');
}

export function getDisplayLanguage() {
  if (typeof window === 'undefined') {
    return 'ru';
  }

  try {
    const stored = sessionStorage.getItem('boardLang');
    if (stored) {
      return stored;
    }
  } catch {
    /* ignore */
  }

  return (window.data && window.data.language) || 'ru';
}

export function setDisplayLanguage(lang) {
  try {
    sessionStorage.setItem('boardLang', lang);
  } catch {
    /* ignore */
  }
}
