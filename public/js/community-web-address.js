(function (root) {
  var CYRILLIC_TO_LATIN = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };

  var HEBREW_TO_LATIN = {
    א: 'a', ב: 'b', ג: 'g', ד: 'd', ה: 'h', ו: 'v', ז: 'z', ח: 'ch', ט: 't',
    י: 'y', כ: 'k', ך: 'k', ל: 'l', מ: 'm', ם: 'm', נ: 'n', ן: 'n', ס: 's',
    ע: 'a', פ: 'p', ף: 'p', צ: 'tz', ץ: 'tz', ק: 'k', ר: 'r', ש: 'sh', ת: 't',
    װ: 'v', ױ: 'oy', ײ: 'ey',
  };

  function transliterateToLatin(text) {
    var out = '';
    var str = String(text || '');
    for (var i = 0; i < str.length; i += 1) {
      var ch = str[i];
      var lower = ch.toLowerCase();
      if (CYRILLIC_TO_LATIN[lower] !== undefined) {
        out += CYRILLIC_TO_LATIN[lower];
        continue;
      }
      if (HEBREW_TO_LATIN[ch] !== undefined) {
        out += HEBREW_TO_LATIN[ch];
        continue;
      }
      out += ch;
    }
    return out;
  }

  function normalizeSlugValue(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function webAddressFromCommunityName(name) {
    var latin = transliterateToLatin(name).toLowerCase();
    var hyphenated = latin
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    var normalized = normalizeSlugValue(hyphenated) || hyphenated;
    return normalized.slice(0, 64);
  }

  function normalizeWebAddressInput(raw) {
    var trimmed = String(raw || '').trim();
    if (!trimmed) {
      return '';
    }
    if (/^[a-z0-9-]+$/.test(trimmed)) {
      return normalizeSlugValue(trimmed).slice(0, 64);
    }
    return webAddressFromCommunityName(trimmed);
  }

  root.communityWebAddress = {
    transliterateToLatin: transliterateToLatin,
    webAddressFromCommunityName: webAddressFromCommunityName,
    normalizeWebAddressInput: normalizeWebAddressInput,
  };
}(typeof window !== 'undefined' ? window : globalThis));
