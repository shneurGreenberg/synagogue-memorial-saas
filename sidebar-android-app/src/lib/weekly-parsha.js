import Hebcal from 'hebcal';

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

export function getWeeklyParshaName(hebrewDate, lang = 'ru') {
  const parsha = hebrewDate.parsha?.[0];
  if (!parsha) {
    return null;
  }

  const entry = PARSHA[parsha];
  return entry?.[lang] || entry?.ru || parsha;
}

export function createHebrewDate(gregorianDate = new Date()) {
  return new Hebcal.HDate(gregorianDate);
}
