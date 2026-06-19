const Hebcal = require('hebcal');

const CHABAD_DATES = [
  {
    hMonth: 9,
    hDay: 19,
    title: {
      he: 'י״ט כסלו – חג הגאולה',
      ru: '19 Кислев — праздник освобождения',
      en: '19 Kislev — Festival of Liberation',
    },
  },
  {
    hMonth: 11,
    hDay: 10,
    title: {
      he: 'י׳ שבט – יום ההילולא',
      ru: '10 Шват — день исцеления',
      en: '10 Shevat — yahrzeit',
    },
  },
  {
    hMonth: 11,
    hDay: 22,
    title: {
      he: 'כ״ב שבט – יום הולדת הרבנית',
      ru: '22 Шват — день рождения Рабанит',
      en: '22 Shevat — Rebbetzin\'s birthday',
    },
  },
  {
    hMonth: 1,
    hDay: 11,
    title: {
      he: 'י״א ניסן – יום הולדת הרבי',
      ru: '11 Нисан — день рождения Ребе',
      en: '11 Nissan — the Rebbe\'s birthday',
    },
  },
  {
    hMonth: 1,
    hDay: 28,
    title: {
      he: 'כ״ח ניסן',
      ru: '28 Нисан',
      en: '28 Nissan',
    },
  },
  {
    hMonth: 4,
    hDay: 3,
    title: {
      he: 'ג׳ תמוז – יום ההילולא',
      ru: '3 Таммуз — день исцеления',
      en: '3 Tammuz — yahrzeit',
    },
  },
  {
    hMonth: 4,
    hDay: 12,
    title: {
      he: 'י״ב תמוז – יום הגאולה',
      ru: '12 Таммуз — день освобождения',
      en: '12 Tammuz — liberation day',
    },
  },
  {
    hMonth: 4,
    hDay: 13,
    title: {
      he: 'י״ג תמוז – יום הגאולה',
      ru: '13 Таммуз — день освобождения',
      en: '13 Tammuz — liberation day',
    },
  },
  {
    hMonth: 5,
    hDay: 20,
    title: {
      he: 'כ׳ מנחם אב',
      ru: '20 Менахем Ав',
      en: '20 Menachem Av',
    },
  },
  {
    hMonth: 10,
    hDay: 24,
    title: {
      he: 'כ״ד טבת – יום ההילולא של הרבנית',
      ru: '24 Тевет — день исцеления Рабанит',
      en: '24 Tevet — Rebbetzin\'s yahrzeit',
    },
  },
  {
    hMonth: 2,
    hDay: 18,
    title: {
      he: 'ל״ג בעומר',
      ru: 'Лаг ба-Омер',
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

function getUpcomingChabadDates(lang = 'ru', fromDate = new Date(), daysAhead = 365) {
  const start = startOfDay(fromDate);
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);
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
};
