const Hebcal = require('hebcal');

const CHABAD_DATES = [
  {
    hMonth: 9,
    hDay: 19,
    title: {
      he: 'Ч™ЧґЧ Ч›ЧЎЧњЧ• вЂ“ Ч—Ч’ Ч”Ч’ЧђЧ•ЧњЧ”',
      ru: '19 РљРёСЃР»РµРІ вЂ” РїСЂР°Р·РґРЅРёРє РѕСЃРІРѕР±РѕР¶РґРµРЅРёСЏ',
      en: '19 Kislev вЂ” Festival of Liberation',
    },
  },
  {
    hMonth: 11,
    hDay: 10,
    title: {
      he: 'Ч™Чі Ч©Ч‘Ч вЂ“ Ч™Ч•Чќ Ч”Ч”Ч™ЧњЧ•ЧњЧђ',
      ru: '10 РЁРІР°С‚ вЂ” РґРµРЅСЊ РёСЃС†РµР»РµРЅРёСЏ',
      en: '10 Shevat вЂ” yahrzeit',
    },
  },
  {
    hMonth: 11,
    hDay: 22,
    title: {
      he: 'Ч›ЧґЧ‘ Ч©Ч‘Ч вЂ“ Ч™Ч•Чќ Ч”Ч•ЧњЧ“ЧЄ Ч”ЧЁЧ‘Ч Ч™ЧЄ',
      ru: '22 РЁРІР°С‚ вЂ” РґРµРЅСЊ СЂРѕР¶РґРµРЅРёСЏ Р Р°Р±Р°РЅРёС‚',
      en: '22 Shevat вЂ” Rebbetzin\'s birthday',
    },
  },
  {
    hMonth: 1,
    hDay: 11,
    title: {
      he: 'Ч™ЧґЧђ Ч Ч™ЧЎЧџ вЂ“ Ч™Ч•Чќ Ч”Ч•ЧњЧ“ЧЄ Ч”ЧЁЧ‘Ч™',
      ru: '11 РќРёСЃР°РЅ вЂ” РґРµРЅСЊ СЂРѕР¶РґРµРЅРёСЏ Р РµР±Рµ',
      en: '11 Nissan вЂ” the Rebbe\'s birthday',
    },
  },
  {
    hMonth: 1,
    hDay: 28,
    title: {
      he: 'Ч›ЧґЧ— Ч Ч™ЧЎЧџ',
      ru: '28 РќРёСЃР°РЅ',
      en: '28 Nissan',
    },
  },
  {
    hMonth: 4,
    hDay: 3,
    title: {
      he: 'Ч’Чі ЧЄЧћЧ•Ч– вЂ“ Ч™Ч•Чќ Ч”Ч”Ч™ЧњЧ•ЧњЧђ',
      ru: '3 РўР°РјРјСѓР· вЂ” РґРµРЅСЊ РёСЃС†РµР»РµРЅРёСЏ',
      en: '3 Tammuz вЂ” yahrzeit',
    },
  },
  {
    hMonth: 4,
    hDay: 12,
    title: {
      he: 'Ч™ЧґЧ‘ ЧЄЧћЧ•Ч– вЂ“ Ч™Ч•Чќ Ч”Ч’ЧђЧ•ЧњЧ”',
      ru: '12 РўР°РјРјСѓР· вЂ” РґРµРЅСЊ РѕСЃРІРѕР±РѕР¶РґРµРЅРёСЏ',
      en: '12 Tammuz вЂ” liberation day',
    },
  },
  {
    hMonth: 4,
    hDay: 13,
    title: {
      he: 'Ч™ЧґЧ’ ЧЄЧћЧ•Ч– вЂ“ Ч™Ч•Чќ Ч”Ч’ЧђЧ•ЧњЧ”',
      ru: '13 РўР°РјРјСѓР· вЂ” РґРµРЅСЊ РѕСЃРІРѕР±РѕР¶РґРµРЅРёСЏ',
      en: '13 Tammuz вЂ” liberation day',
    },
  },
  {
    hMonth: 5,
    hDay: 20,
    title: {
      he: 'Ч›Чі ЧћЧ Ч—Чќ ЧђЧ‘',
      ru: '20 РњРµРЅР°С…РµРј РђРІ',
      en: '20 Menachem Av',
    },
  },
  {
    hMonth: 10,
    hDay: 24,
    title: {
      he: 'Ч›ЧґЧ“ ЧЧ‘ЧЄ вЂ“ Ч™Ч•Чќ Ч”Ч”Ч™ЧњЧ•ЧњЧђ Ч©Чњ Ч”ЧЁЧ‘Ч Ч™ЧЄ',
      ru: '24 РўРµРІРµС‚ вЂ” РґРµРЅСЊ РёСЃС†РµР»РµРЅРёСЏ Р Р°Р±Р°РЅРёС‚',
      en: '24 Tevet вЂ” Rebbetzin\'s yahrzeit',
    },
  },
  {
    hMonth: 2,
    hDay: 18,
    title: {
      he: 'ЧњЧґЧ’ Ч‘ЧўЧ•ЧћЧЁ',
      ru: 'Р›Р°Рі Р±Р°-РћРјРµСЂ',
      en: 'Lag BaOmer',
    },
  },
];

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function pickLang(labels, lang) {
  if (!labels) {
    return '';
  }

  if (lang === 'he' && labels.he) {
    return labels.he;
  }

  if (lang === 'en' && labels.en) {
    return labels.en;
  }

  return labels.ru || labels.en || labels.he || '';
}

function endOfNextCalendarMonth(fromDate) {
  const start = startOfDay(fromDate);
  const year = start.getFullYear();
  const month = start.getMonth();
  return new Date(year, month + 2, 0);
}

function daysAheadThroughEndOfNextMonth(fromDate = new Date()) {
  const start = startOfDay(fromDate);
  const end = startOfDay(endOfNextCalendarMonth(fromDate));
  let days = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    days += 1;
  }
  return days;
}

function getUpcomingChabadDates(lang = 'ru', fromDate = new Date(), daysAhead) {
  const start = startOfDay(fromDate);
  const ahead = Number.isFinite(daysAhead) ? daysAhead : daysAheadThroughEndOfNextMonth(fromDate);
  const end = new Date(start);
  end.setDate(end.getDate() + ahead);
  const todayIso = formatIsoDate(start);

  const hToday = new Hebcal.HDate(start);
  const results = [];
  const seen = new Set();

  CHABAD_DATES.forEach((entry) => {
    for (let yearOffset = 0; yearOffset <= 1; yearOffset += 1) {
      const hYear = hToday.getFullYear() + yearOffset;

      try {
        const hdate = new Hebcal.HDate(entry.hDay, entry.hMonth, hYear);
        const gdate = startOfDay(hdate.greg());

        if (gdate < start || gdate > end) {
          continue;
        }

        const date = formatIsoDate(gdate);
        const key = `${date}:${entry.hMonth}:${entry.hDay}`;

        if (seen.has(key) || date < todayIso) {
          continue;
        }

        seen.add(key);
        results.push({
          date,
          title: pickLang(entry.title, lang),
          hebrew: entry.title.he || '',
          category: 'chabad',
        });
      } catch {
        /* skip invalid Hebrew dates in this year */
      }
    }
  });

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = {
  CHABAD_DATES,
  getUpcomingChabadDates,
  daysAheadThroughEndOfNextMonth,
  endOfNextCalendarMonth,
};
