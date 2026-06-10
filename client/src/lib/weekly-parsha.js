import Hebcal from 'hebcal';
import { getDisplayLanguage } from './person-names';

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
  'Yom Kippur': { ru: 'Йом Кипур', en: 'Yom Kippur', he: 'יום כיפור' },
  Sukkot: { ru: 'Суккот', en: 'Sukkot', he: 'סוכות' },
  'Chol hamoed Sukkot': { ru: 'Холь ха-Моэд Суккот', en: 'Chol hamoed Sukkot', he: 'חול המועד סוכות' },
  'Shmini Atzeret': { ru: 'Шмини Ацерет', en: 'Shmini Atzeret', he: 'שמיני עצרת' },
  'End-of-year: Simchat-Torah, Sukkot': { ru: 'Симхат Тора', en: 'Simchat Torah', he: 'שמחת תורה' },
  Pesach: { ru: 'Песах', en: 'Pesach', he: 'פסח' },
  'Chol hamoed Pesach': { ru: 'Холь ха-Моэд Песах', en: 'Chol hamoed Pesach', he: 'חול המועד פסח' },
  'Second days of Pesach': { ru: 'Второй день Песаха', en: 'Second day of Pesach', he: 'יום שני של פסח' },
  Shavuot: { ru: 'Шавуот', en: 'Shavuot', he: 'שבועות' },
};

function resolveLabel(entry, lang) {
  if (!entry) {
    return null;
  }

  return entry[lang] || entry.ru || entry.en || null;
}

function findParshaKey(name) {
  if (!name) {
    return null;
  }

  const direct = Object.keys(PARSHA).find((key) => key === name);
  if (direct) {
    return direct;
  }

  return Object.keys(PARSHA).find((key) => (
    PARSHA[key].ru === name
    || PARSHA[key].en === name
    || PARSHA[key].he === name
  )) || null;
}

export function getWeeklyParshaName(hebrewDate, lang = getDisplayLanguage()) {
  const raw = hebrewDate.getParsha()[0];
  if (!raw) {
    return null;
  }

  if (HOLIDAYS[raw]) {
    return resolveLabel(HOLIDAYS[raw], lang);
  }

  const key = findParshaKey(raw);
  if (!key) {
    return raw;
  }

  return resolveLabel(PARSHA[key], lang);
}

export function getWeeklyParsha(hebrewDate, lang = getDisplayLanguage()) {
  const name = getWeeklyParshaName(hebrewDate, lang);
  if (!name || HOLIDAYS[hebrewDate.getParsha()[0]]) {
    return null;
  }

  return name;
}

export function getHolidayName(hebrewDate, lang = getDisplayLanguage()) {
  const raw = hebrewDate.getParsha()[0];
  if (!raw || !HOLIDAYS[raw]) {
    return null;
  }

  return resolveLabel(HOLIDAYS[raw], lang);
}

export function createHebrewDate() {
  return new Hebcal.HDate();
}
