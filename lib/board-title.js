const CYRILLIC_TO_LATIN = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

const CYRILLIC_TO_HE = {
  а: 'א', ב: 'ב', ג: 'ג', ד: 'ד', ה: 'ה', ו: 'ו', ז: 'ז', ח: 'ח', ט: 'ט',
  י: 'י', כ: 'כ', ל: 'ל', מ: 'מ', נ: 'נ', ס: 'ס', ע: 'ע', פ: 'פ', צ: 'צ',
  ק: 'ק', ר: 'ר', ש: 'ש', ת: 'ת',
};

function transliterateCyrillic(text, map) {
  return String(text || '')
    .split('')
    .map((char) => {
      const lower = char.toLowerCase();
      const mapped = map[lower];
      if (mapped === undefined) {
        return char;
      }
      return char === lower ? mapped : mapped;
    })
    .join('');
}

function autoTitleEnglish(baseTitle) {
  const words = String(baseTitle || '').trim().split(/\s+/);
  return words
    .map((word) => transliterateCyrillic(word, CYRILLIC_TO_LATIN))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function autoTitleHebrew(baseTitle) {
  return transliterateCyrillic(String(baseTitle || '').trim(), CYRILLIC_TO_HE)
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveBoardTitle(synagogue, lang) {
  if (!synagogue) {
    return '';
  }

  const titles = synagogue.titles || {};
  const base = String(synagogue.title || synagogue.name || '').trim();
  const custom = titles[lang] && String(titles[lang]).trim();

  if (custom) {
    return custom;
  }

  if (lang === 'en') {
    return autoTitleEnglish(base) || base;
  }

  if (lang === 'he') {
    return autoTitleHebrew(base) || base;
  }

  return titles.ru && String(titles.ru).trim() ? String(titles.ru).trim() : base;
}

module.exports = {
  resolveBoardTitle,
  autoTitleEnglish,
  autoTitleHebrew,
};
