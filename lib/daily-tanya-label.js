const { gematriaDay } = require('./hebrew-date-format');

const CHAPTER_WORD = {
  en: 'ch.',
  he: 'פרק',
  ru: 'гл.',
};

/** @type {Array<{ pattern: RegExp, labels: { en: string, he: string, ru: string } }>} */
const TANYA_SECTIONS = [
  {
    pattern: /likk?utei\s+amarim/i,
    labels: {
      en: 'Likkutei Amarim',
      he: 'ליקוטי אמרים',
      ru: 'Ликутей Амарим',
    },
  },
  {
    pattern: /sha['']?ar\s+ha[\s-]?yichud\s+veha?emunah/i,
    labels: {
      en: "Sha'ar HaYichud VehaEmunah",
      he: 'שער היחוד והאמונה',
      ru: 'Шаар ха-Йихуд ве-ха-Эмуна',
    },
  },
  {
    pattern: /iggeret\s+hateshuvah/i,
    labels: {
      en: 'Iggeret HaTeshuvah',
      he: 'אגרת התשובה',
      ru: 'Игерет а-Тешува',
    },
  },
  {
    pattern: /iggeret\s+hakodesh/i,
    labels: {
      en: 'Iggeret HaKodesh',
      he: 'אגרת הקודש',
      ru: 'Игерет а-Кодеш',
    },
  },
  {
    pattern: /kuntres\s+acharon/i,
    labels: {
      en: 'Kuntres Acharon',
      he: 'קונטרס אחרון',
      ru: 'Кунтрес Ахарон',
    },
  },
];

const PART_SECTION_FALLBACK = {
  i: 'likkutei amarim',
  ii: "sha'ar haYichud vehaEmunah",
  iii: 'iggeret hateshuvah',
  iv: 'iggeret hakodesh',
  v: 'kuntres acharon',
};

const ENGLISH_HEBREW_MONTHS = [
  'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul', 'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar',
];
const ENGLISH_HEBREW_MONTHS_ALT = ['Adar I', 'Adar II', 'Adar 2'];

const HEBREW_MONTH_NAMES = [
  'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשון', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב',
];

const RUSSIAN_HEBREW_MONTHS = [
  'Нисана', 'Ияра', 'Сивана', 'Тамуза', 'Ава', 'Элула', 'Тишрея', 'Хешвана', 'Кислева', 'Тевета', 'Швата', 'Адара',
];
const RUSSIAN_HEBREW_MONTHS_SHORT = [
  'Нисан', 'Ияр', 'Сиван', 'Тамуз', 'Ав', 'Элул', 'Тишрей', 'Хешван', 'Кислев', 'Тевет', 'Шват', 'Адар',
];

function normalizeLang(lang) {
  if (lang === 'he' || lang === 'ru') {
    return lang;
  }
  return 'en';
}

function cleanUnknownRef(ref) {
  return String(ref || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*;\s*/g, '; ')
    .trim();
}

function findSectionLabels(sectionText) {
  const haystack = String(sectionText || '');
  for (const entry of TANYA_SECTIONS) {
    if (entry.pattern.test(haystack)) {
      return entry.labels;
    }
  }
  return null;
}

function labelsFromPartNumber(refText) {
  const partMatch = String(refText || '').match(/Part\s+([IVX]+|\d+)/i);
  if (!partMatch) {
    return null;
  }
  const token = partMatch[1].toLowerCase();
  const romanMap = { i: 'i', ii: 'ii', iii: 'iii', iv: 'iv', v: 'v' };
  const key = romanMap[token] || null;
  if (!key || !PART_SECTION_FALLBACK[key]) {
    return null;
  }
  return findSectionLabels(PART_SECTION_FALLBACK[key]);
}

function parseChapterNumber(sectionTail) {
  const match = String(sectionTail || '').match(/(\d+)\s*(?::\d+)?\s*$/);
  if (!match) {
    return null;
  }
  const chapter = parseInt(match[1], 10);
  return Number.isFinite(chapter) && chapter > 0 ? chapter : null;
}

function stripChapterSuffix(sectionTail) {
  return String(sectionTail || '').replace(/\s*\d+\s*(?::\d+)?\s*$/, '').trim();
}

function formatChapter(chapter, lang) {
  if (!chapter) {
    return '';
  }
  if (lang === 'he') {
    return `${CHAPTER_WORD.he} ${gematriaDay(chapter)}`;
  }
  return `${CHAPTER_WORD[lang]} ${chapter}`;
}

function formatTanyaRef(ref, lang) {
  try {
    const cleaned = cleanUnknownRef(ref);
    if (!cleaned) {
      return '';
    }

    const normalizedLang = normalizeLang(lang);

    let sectionTail = cleaned;
    const semi = cleaned.indexOf(';');
    if (semi >= 0) {
      sectionTail = cleaned.slice(semi + 1).trim();
    } else {
      sectionTail = cleaned.replace(/^Tanya,?\s*/i, '').trim();
    }

    const chapter = parseChapterNumber(sectionTail);
    const sectionNamePart = stripChapterSuffix(sectionTail);
    let sectionLabels = findSectionLabels(sectionNamePart) || labelsFromPartNumber(cleaned);

    if (!sectionLabels) {
      if (sectionNamePart) {
        const pieces = [sectionNamePart];
        if (chapter) {
          pieces.push(formatChapter(chapter, normalizedLang));
        }
        return pieces.join(', ');
      }
      return cleaned;
    }

    const sectionLabel = sectionLabels[normalizedLang];
    const pieces = [sectionLabel];
    if (chapter) {
      pieces.push(formatChapter(chapter, normalizedLang));
    }
    return pieces.join(', ');
  } catch {
    return cleanUnknownRef(ref);
  }
}

function isDateOnlyLabel(text) {
  const value = String(text || '').trim();
  if (!value) {
    return false;
  }

  const enMonths = [...ENGLISH_HEBREW_MONTHS, ...ENGLISH_HEBREW_MONTHS_ALT].join('|');
  const enDayMonth = new RegExp(`^(\\d{1,2})\\s+(${enMonths})\\.?$`, 'i');
  const enMonthDay = new RegExp(`^(${enMonths})\\s+(\\d{1,2})\\.?$`, 'i');
  if (enDayMonth.test(value) || enMonthDay.test(value)) {
    return true;
  }

  const heMonths = HEBREW_MONTH_NAMES.join('|');
  const hePattern = new RegExp(`^([א-ת"'״]+)\\s+(${heMonths})$`);
  if (hePattern.test(value)) {
    return true;
  }

  const ruMonths = [...RUSSIAN_HEBREW_MONTHS, ...RUSSIAN_HEBREW_MONTHS_SHORT].join('|');
  const ruPattern = new RegExp(`^(\\d{1,2})\\s+(${ruMonths})\\.?$`, 'i');
  if (ruPattern.test(value)) {
    return true;
  }

  return false;
}

function resolveDailyTanyaLabel({
  sefariaItem,
  lessons5786Tanya,
  hayomYomTanyaLabel,
  lang,
}) {
  const normalizedLang = normalizeLang(lang);

  if (sefariaItem?.ref) {
    const fromRef = formatTanyaRef(sefariaItem.ref, normalizedLang);
    if (fromRef && !isDateOnlyLabel(fromRef)) {
      return fromRef;
    }
  }

  const candidates = [lessons5786Tanya, hayomYomTanyaLabel];
  for (const candidate of candidates) {
    const text = String(candidate || '').trim();
    if (!text || isDateOnlyLabel(text)) {
      continue;
    }
    return text;
  }

  return '';
}

module.exports = {
  formatTanyaRef,
  isDateOnlyLabel,
  resolveDailyTanyaLabel,
};
