const PARSHA = {
  Bereshit: { ru: 'Берешит', en: 'Bereshit', he: 'בראשית' },
  Noach: { ru: 'Ноах', en: 'Noach', he: 'נח' },
  'Lech-Lecha': { ru: 'Лех Леха', en: 'Lech-Lecha', he: 'לך לך' },
  Vayera: { ru: 'Ваера', en: 'Vayera', he: 'וירא' },
  'Chayei Sara': { ru: 'Хаей Сара', en: 'Chayei Sara', he: 'חיי שרה' },
  Toldot: { ru: 'Толдот', en: 'Toldot', he: 'תולדות' },
  Vayetzei: { ru: 'Ваеце', en: 'Vayetzei', he: 'ויצא' },
  Vayishlach: { ru: 'Ваишлах', en: 'Vayishlach', he: 'וישלח' },
  Vayeshev: { ru: 'Ваешев', en: 'Vayeshev', he: 'וישב' },
  Miketz: { ru: 'Ми-Кец', en: 'Miketz', he: 'מקץ' },
  Vayigash: { ru: 'Ваигаш', en: 'Vayigash', he: 'ויגש' },
  Vayechi: { ru: 'Ваехи', en: 'Vayechi', he: 'ויחי' },
  Shemot: { ru: 'Шмот', en: 'Shemot', he: 'שמות' },
  Vaera: { ru: 'Ваэра', en: 'Vaera', he: 'וארא' },
  Bo: { ru: 'Бо', en: 'Bo', he: 'בא' },
  Beshalach: { ru: 'Бешалах', en: 'Beshalach', he: 'בשלח' },
  Yitro: { ru: 'Итро', en: 'Yitro', he: 'יתרו' },
  Mishpatim: { ru: 'Мишпатим', en: 'Mishpatim', he: 'משפטים' },
  Terumah: { ru: 'Трума', en: 'Terumah', he: 'תרומה' },
  Tetzaveh: { ru: 'Тецаве', en: 'Tetzaveh', he: 'תצוה' },
  'Ki Tisa': { ru: 'Ки Тиса', en: 'Ki Tisa', he: 'כי תשא' },
  Vayakhel: { ru: 'Ва-якхел', en: 'Vayakhel', he: 'ויקהל' },
  Pekudei: { ru: 'Пкудей', en: 'Pekudei', he: 'פקודי' },
  Vayikra: { ru: 'Ва-Йикра', en: 'Vayikra', he: 'ויקרא' },
  Tzav: { ru: 'Цав', en: 'Tzav', he: 'צו' },
  Shmini: { ru: 'Шмини', en: 'Shmini', he: 'שמיני' },
  Tazria: { ru: 'Тазриа', en: 'Tazria', he: 'תזריע' },
  Metzora: { ru: 'Мецора', en: 'Metzora', he: 'מצורע' },
  'Achrei Mot': { ru: 'Ахарей Мот', en: 'Achrei Mot', he: 'אחרי מות' },
  Kedoshim: { ru: 'Кдошим', en: 'Kedoshim', he: 'קדושים' },
  Emor: { ru: 'Эмор', en: 'Emor', he: 'אמור' },
  Behar: { ru: 'Бе-Хар', en: 'Behar', he: 'בהר' },
  Bechukotai: { ru: 'Бе-Хукотай', en: 'Bechukotai', he: 'בחוקותי' },
  Bamidbar: { ru: 'Бе-Мидбар', en: 'Bamidbar', he: 'במדבר' },
  Nasso: { ru: 'Насо', en: 'Nasso', he: 'נשא' },
  "Beha'alotcha": { ru: 'Бе-Хаалотха', en: "Beha'alotcha", he: 'בהעלותך' },
  "Sh'lach": { ru: 'Шлах Леха', en: "Sh'lach", he: 'שלח לך' },
  Korach: { ru: 'Корах', en: 'Korach', he: 'קרח' },
  Chukat: { ru: 'Хукат', en: 'Chukat', he: 'חוקת' },
  Balak: { ru: 'Балак', en: 'Balak', he: 'בלק' },
  Pinchas: { ru: 'Пинхас', en: 'Pinchas', he: 'פינחס' },
  Matot: { ru: 'Матот', en: 'Matot', he: 'מטות' },
  Masei: { ru: 'Масей', en: 'Masei', he: 'מסעי' },
  Devarim: { ru: 'Дварим', en: 'Devarim', he: 'דברים' },
  Vaetchanan: { ru: 'Ва-Этханан', en: 'Vaetchanan', he: 'ואתחנן' },
  Eikev: { ru: 'Экев', en: 'Eikev', he: 'עקב' },
  "Re'eh": { ru: 'Реэ', en: "Re'eh", he: 'ראה' },
  Shoftim: { ru: 'Шофтим', en: 'Shoftim', he: 'שופטים' },
  'Ki Teitzei': { ru: 'Ки Теце', en: 'Ki Teitzei', he: 'כי תצא' },
  'Ki Tavo': { ru: 'Ки Таво', en: 'Ki Tavo', he: 'כי תבוא' },
  Nitzavim: { ru: 'Ниццавим', en: 'Nitzavim', he: 'נצבים' },
  Vayeilech: { ru: 'Ва-Йелех', en: 'Vayeilech', he: 'וילך' },
  "Ha'Azinu": { ru: 'Хаазину', en: "Ha'Azinu", he: 'האזינו' },
};

const HOLIDAYS = {
  'Rosh Hashana': { ru: 'Рош ха-Шана', en: 'Rosh Hashana', he: 'ראש השנה' },
  'Rosh Hashana 5787': { ru: 'Рош ха-Шана 5787', en: 'Rosh Hashana 5787', he: 'ראש השנה תשפ״ז' },
  'Rosh Hashana II': { ru: 'Второй день Рош ха-Шана', en: 'Rosh Hashana II', he: 'יום שני של ראש השנה' },
  'Erev Rosh Hashana': { ru: 'Канун Рош ха-Шана', en: 'Erev Rosh Hashana', he: 'ערב ראש השנה' },
  'Yom Kippur': { ru: 'Йом Кипур', en: 'Yom Kippur', he: 'יום כיפור' },
  'Erev Yom Kippur': { ru: 'Канун Йом Кипура', en: 'Erev Yom Kippur', he: 'ערב יום כיפור' },
  Sukkot: { ru: 'Суккот', en: 'Sukkot', he: 'סוכות' },
  'Sukkot I': { ru: 'Суккот, 1-й день', en: 'Sukkot I', he: 'סוכות א׳' },
  'Sukkot II': { ru: 'Суккот, 2-й день', en: 'Sukkot II', he: 'סוכות ב׳' },
  'Sukkot III (CH\'\'M)': { ru: 'Суккот, Холь ха-Моэд', en: "Sukkot III (CH''M)", he: 'חול המועד סוכות' },
  'Sukkot IV (CH\'\'M)': { ru: 'Суккот, Холь ха-Моэд', en: "Sukkot IV (CH''M)", he: 'חול המועד סוכות' },
  'Sukkot V (CH\'\'M)': { ru: 'Суккот, Холь ха-Моэд', en: "Sukkot V (CH''M)", he: 'חול המועד סוכות' },
  'Sukkot VI (CH\'\'M)': { ru: 'Суккот, Холь ха-Моэд', en: "Sukkot VI (CH''M)", he: 'חול המועד סוכות' },
  'Sukkot VII (Hoshana Raba)': { ru: 'Хошана Раба', en: 'Sukkot VII (Hoshana Raba)', he: 'הושענא רבה' },
  'Erev Sukkot': { ru: 'Канун Суккот', en: 'Erev Sukkot', he: 'ערב סוכות' },
  'Chol hamoed Sukkot': { ru: 'Холь ха-Моэд Суккот', en: 'Chol hamoed Sukkot', he: 'חול המועד סוכות' },
  'Shmini Atzeret': { ru: 'Шмини Ацерет', en: 'Shmini Atzeret', he: 'שמיני עצרת' },
  'Simchat Torah': { ru: 'Симхат Тора', en: 'Simchat Torah', he: 'שמחת תורה' },
  'End-of-year: Simchat-Torah, Sukkot': { ru: 'Симхат Тора', en: 'Simchat Torah', he: 'שמחת תורה' },
  Pesach: { ru: 'Песах', en: 'Pesach', he: 'פסח' },
  'Chol hamoed Pesach': { ru: 'Холь ха-Моэд Песах', en: 'Chol hamoed Pesach', he: 'חול המועד פסח' },
  'Second days of Pesach': { ru: 'Второй день Песаха', en: 'Second day of Pesach', he: 'יום שני של פסח' },
  Shavuot: { ru: 'Шавуот', en: 'Shavuot', he: 'שבועות' },
  "Erev Tish'a B'Av": { ru: 'Канун Тиша бе-Ав', en: "Erev Tish'a B'Av", he: 'ערב תשעה באב' },
  "Tish'a B'Av": { ru: 'Тиша бе-Ав', en: "Tish'a B'Av", he: 'תשעה באב' },
  "Tu B'Av": { ru: 'Ту бе-Ав', en: "Tu B'Av", he: 'ט״ו באב' },
  "Erev Tish’a B’Av": { ru: 'Канун Тиша бе-Ав', en: "Erev Tish’a B’Av", he: 'ערב תשעה באב' },
  "Tish’a B’Av": { ru: 'Тиша бе-Ав', en: "Tish’a B’Av", he: 'תשעה באב' },
  "Tu B’Av": { ru: 'Ту бе-Ав', en: "Tu B’Av", he: 'ט״ו באב' },
  'Leil Selichot': { ru: 'Ночь Слихот', en: 'Leil Selichot', he: 'ליל סליחות' },
  'Chanukah: 1 Candle': { ru: 'Ханука, 1-я свеча', en: 'Chanukah: 1 Candle', he: 'חנוכה, נר א׳' },
  'Chanukah: 2 Candles': { ru: 'Ханука, 2-я свеча', en: 'Chanukah: 2 Candles', he: 'חנוכה, נר ב׳' },
  'Chanukah: 3 Candles': { ru: 'Ханука, 3-я свеча', en: 'Chanukah: 3 Candles', he: 'חנוכה, נר ג׳' },
  'Chanukah: 4 Candles': { ru: 'Ханука, 4-я свеча', en: 'Chanukah: 4 Candles', he: 'חנוכה, נר ד׳' },
  'Chanukah: 5 Candles': { ru: 'Ханука, 5-я свеча', en: 'Chanukah: 5 Candles', he: 'חנוכה, נר ה׳' },
  'Chanukah: 6 Candles': { ru: 'Ханука, 6-я свеча', en: 'Chanukah: 6 Candles', he: 'חנוכה, נר ו׳' },
  'Chanukah: 7 Candles': { ru: 'Ханука, 7-я свеча', en: 'Chanukah: 7 Candles', he: 'חנוכה, נר ז׳' },
  'Chanukah: 8 Candles': { ru: 'Ханука, 8-я свеча', en: 'Chanukah: 8 Candles', he: 'חנוכה, נר ח׳' },
  'Chanukah: 8th Day': { ru: 'Ханука, 8-й день', en: 'Chanukah: 8th Day', he: 'חנוכה, יום ח׳' },
  'Chag HaBanot': { ru: 'Праздник дочерей', en: 'Chag HaBanot', he: 'חג הבנות' },
  Sigd: { ru: 'Сигд', en: 'Sigd', he: 'סיגד' },
  'Rosh Hashana LaBehemot': { ru: 'Рош ха-Шана ла-беемот', en: 'Rosh Hashana LaBehemot', he: 'ראש השנה לבהמות' },
  'Lag BaOmer': { ru: 'Лаг ба-Омер', en: 'Lag BaOmer', he: 'ל״ג בעומר' },
  'Purim': { ru: 'Пурим', en: 'Purim', he: 'פורים' },
  'Shushan Purim': { ru: 'Шушан Пурим', en: 'Shushan Purim', he: 'שושן פורים' },
};

const HEBREW_MONTHS = {
  Tishrei: { ru: 'Тишрей', he: 'תשרי' },
  Cheshvan: { ru: 'Хешван', he: 'חשון' },
  Kislev: { ru: 'Кислев', he: 'כסלו' },
  Tevet: { ru: 'Тевет', he: 'טבת' },
  Shevat: { ru: 'Шват', he: 'שבט' },
  Adar: { ru: 'Адар', he: 'אדר' },
  'Adar I': { ru: 'Адар I', he: 'אדר א׳' },
  'Adar II': { ru: 'Адар II', he: 'אדר ב׳' },
  Nisan: { ru: 'Нисан', he: 'ניסן' },
  Iyar: { ru: 'Ияр', he: 'אייר' },
  Sivan: { ru: 'Сиван', he: 'סיון' },
  Tammuz: { ru: 'Таммуз', he: 'תמוז' },
  Av: { ru: 'Ав', he: 'אב' },
  Elul: { ru: 'Элул', he: 'אלול' },
};

const PORTION_NAMES = {
  'first parsha': { ru: 'первую часть', he: 'ראשון' },
  '1st portion': { ru: '1-я часть', he: 'ראשון' },
  '2nd portion': { ru: '2-я часть', he: 'שני' },
  '3rd portion': { ru: '3-я часть', he: 'שלישי' },
  '4th portion': { ru: '4-я часть', he: 'רביעי' },
  '5th portion': { ru: '5-я часть', he: 'חמישי' },
  '6th portion': { ru: '6-я часть', he: 'שישי' },
  '7th portion': { ru: '7-я часть', he: 'שביעי' },
  Sheini: { ru: '2-я часть', he: 'שני' },
  Shlishi: { ru: '3-я часть', he: 'שלישי' },
  "Revi'i": { ru: '4-я часть', he: 'רביעי' },
  Revii: { ru: '4-я часть', he: 'רביעי' },
  Chamishi: { ru: '5-я часть', he: 'חמישי' },
  Shishi: { ru: '6-я часть', he: 'שישי' },
  Shevi: { ru: '7-я часть', he: 'שביעי' },
};

function pickLang(values, lang) {
  if (!values) {
    return '';
  }

  if (lang === 'he' && values.he) {
    return values.he;
  }

  if (lang === 'ru' && values.ru) {
    return values.ru;
  }

  return values.en || values.he || values.ru || '';
}

function findParshaKey(name) {
  if (!name) {
    return null;
  }

  const direct = Object.keys(PARSHA).find((key) => key.toLowerCase() === name.toLowerCase());
  if (direct) {
    return direct;
  }

  return Object.keys(PARSHA).find((key) => (
    PARSHA[key].ru === name
    || PARSHA[key].en === name
    || PARSHA[key].he === name
  )) || null;
}

function translateHolidayTitle(title, lang) {
  if (!title) {
    return '';
  }

  if (HOLIDAYS[title]) {
    return pickLang(HOLIDAYS[title], lang);
  }

  const normalized = title.replace(/\(CH''M\)/g, '(CH\'\'M)');

  if (HOLIDAYS[normalized]) {
    return pickLang(HOLIDAYS[normalized], lang);
  }

  if (lang === 'he') {
    return title;
  }

  if (lang === 'ru') {
    let result = title;
    Object.entries(PARSHA).forEach(([key, labels]) => {
      result = result.replace(new RegExp(key, 'g'), labels.ru);
    });
    result = result
      .replace(/Erev /g, 'Канун ')
      .replace(/Chanukah/g, 'Ханука')
      .replace(/Sukkot/g, 'Суккот')
      .replace(/Pesach/g, 'Песах')
      .replace(/Shavuot/g, 'Шавуот')
      .replace(/Purim/g, 'Пурим')
      .replace(/Candle/g, 'свеча')
      .replace(/Candles/g, 'свечи');
    return result;
  }

  return title;
}

function translateParshaName(name, lang) {
  const key = findParshaKey(name);
  if (!key) {
    return name;
  }

  return pickLang(PARSHA[key], lang);
}

function translateLearningLine(line, lang) {
  if (!line || lang === 'en') {
    return line || '';
  }

  let result = line;

  Object.entries(PARSHA).forEach(([key, labels]) => {
    const target = labels[lang];
    if (target) {
      result = result.replace(new RegExp(`\\b${key}\\b`, 'g'), target);
    }
  });

  if (lang === 'ru') {
    result = result
      .replace(/\bChumash:\s*/i, 'Хумаш: ')
      .replace(/\bTehillim:\s*/i, 'Тегилим: ')
      .replace(/\bTanya:\s*/i, 'Тания: ')
      .replace(/\bCh\.\s*/gi, 'Гл. ')
      .replace(/\bwith Rashi\b/gi, 'с Раши')
      .replace(/\bPsalms\b/gi, 'Тегилим');

    Object.entries(HEBREW_MONTHS).forEach(([en, labels]) => {
      if (labels.ru) {
        result = result.replace(new RegExp(`\\b${en}\\b`, 'g'), labels.ru);
      }
    });

    Object.entries(PORTION_NAMES).forEach(([en, labels]) => {
      if (labels.ru) {
        result = result.replace(new RegExp(en, 'gi'), labels.ru);
      }
    });
  }

  if (lang === 'he') {
    result = result
      .replace(/\bChumash:\s*/i, 'חומש: ')
      .replace(/\bTehillim:\s*/i, 'תהילים: ')
      .replace(/\bTanya:\s*/i, 'תניא: ')
      .replace(/\bwith Rashi\b/gi, 'עם פירש"י')
      .replace(/\bCh\.\s*/gi, 'פרק ');

    Object.entries(PORTION_NAMES).forEach(([en, labels]) => {
      if (labels.he) {
        result = result.replace(new RegExp(en, 'gi'), labels.he);
      }
    });
  }

  return result;
}

function translateRambamLabel(label, lang) {
  if (!label || lang === 'en') {
    return label || '';
  }

  if (lang === 'he') {
    return label;
  }

  let result = label;
  const replacements = [
    ['Sabbath', 'Шаббат'],
    ['Second Tithes and Fourth Year\'s Fruit', 'Маасер шени ве-нета ревайи'],
    ['Forbidden Foods', 'Запрещённая пища'],
    ['Ritual Slaughter', 'Шхита'],
    ['Oaths', 'Швуот'],
    ['Vows', 'Недарим'],
    ['Nazariteship', 'Назир'],
    ['Appraisals and Devoted Property', 'Эракин'],
    ['Creditor and Debtor', 'Малве ве-love'],
    ['Hiring', 'Сехирут'],
    ['Borrowing and Deposit', 'Шеила у-фикадон'],
    ['Sales', 'Мехира'],
    ['Neighbors', 'Шхеним'],
    ['Agents and Partners', 'Шлухин ве-шутафин'],
    ['Slaves', 'Авадим'],
    ['Gifts to the Poor', 'Матнот аниим'],
    ['Heave Offerings', 'Трумот'],
    ['Tithes', 'Маасерот'],
    ['First Fruits', 'Биккурим'],
    ['Sabbatical Year and Jubilee', 'Шмита ве-йовел'],
    ['Daily Offerings and Additional Offerings', 'Тамидин у-мусафин'],
    ['Sacrificial Procedure', 'Аводат корбанот'],
    ['Things Forbidden on the Altar', 'Асур ле-габей мизбеах'],
    ['Admission into the Sanctuary', 'Биат микдаш'],
    ['Vessels of the Sanctuary', 'Клей микдаш'],
    ['Admission into the Sanctuary', 'Биат микдаш'],
    ['One Who Defiles Bed or Seat', 'Метаме мишкаб у-мошав'],
    ['Those Who Defile Bed or Seat', 'Метаме мишкаб у-мошав'],
    ['Other Sources of Defilement', 'Шэар авот ha-тума'],
    ['Defilement by a Corpse', 'Тумат мет'],
    ['Red Heifer', 'Пара адума'],
    ['Defilement of Foods', 'Тумат окелим'],
    ['Vessels', 'Келим'],
    ['Immersion Pools', 'Микваот'],
  ];

  replacements.forEach(([en, ru]) => {
    result = result.replace(new RegExp(en, 'g'), ru);
  });

  return result;
}

module.exports = {
  PARSHA,
  HOLIDAYS,
  pickLang,
  translateHolidayTitle,
  translateParshaName,
  translateLearningLine,
  translateRambamLabel,
};
