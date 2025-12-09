const Hebcal = require('hebcal');

const LATITUDE = 54.9833;
const LONGITUDE = 82.8964;
const CHAPTERS = {
  "Bereshit": 'Берешит',
  "Noach": 'Ноах',
  "Lech-Lecha": 'Лех Леха',
  "Vayera": 'Ваера',
  "Chayei Sara": 'Хаей Сара',
  "Toldot": 'Толдот',
  "Vayetzei": 'Ваеце',
  "Vayishlach": 'Ваишлах',
  "Vayeshev": 'Ваешев',
  "Miketz": 'Ми-Кец',
  "Vayigash": 'Ваигаш',
  "Vayechi": 'Ваехи',
  "Shemot": 'Шмот',
  "Vaera": 'Ваэра',
  "Bo": 'Бо',
  "Beshalach": 'Бешалах',
  "Yitro": 'Итро',
  "Mishpatim": 'Мишпатим',
  "Terumah": 'Трума',
  "Tetzaveh": 'Тецаве',
  "Ki Tisa": 'Ки Тиса',
  "Vayakhel": 'Ва-якхел',
  "Pekudei": 'Пкудей',
  "Vayikra": 'Ва-Йикра',
  "Tzav": 'Цав',
  "Shmini": 'Шмини',
  "Tazria": 'Тазриа',
  "Metzora": 'Мецора',
  "Achrei Mot": 'Ахарей Мот',
  "Kedoshim": 'Кдошим',
  "Emor": 'Эмор',
  "Behar": 'Бе-Хар',
  "Bechukotai": 'Бе-Хукотай',
  "Bamidbar": 'Бе-Мидбар',
  "Nasso": 'Насо',
  "Beha'alotcha": 'Бе-Хаалотха',
  "Sh'lach": 'Шлах Леха',
  "Korach": 'Корах',
  "Chukat": 'Хукат',
  "Balak": 'Балак',
  "Pinchas": 'Пинхас',
  "Matot": 'Матот',
  "Masei": 'Масей',
  "Devarim": 'Дварим',
  "Vaetchanan": 'Ва-Этханан',
  "Eikev": 'Экев',
  "Re'eh": 'Реэ',
  "Shoftim": 'Шофтим',
  "Ki Teitzei": 'Ки Теце',
  "Ki Tavo": 'Ки Таво',
  "Nitzavim": 'Ниццавим',
  "Vayeilech": 'Ва-Йелех',
  "Ha'Azinu": 'Хаазину',
};

const GREGORIAN_NOW = new Date();
const GREGORIAN_YEAR_START = new Date(GREGORIAN_NOW.getFullYear(), 0, 0);
const FULL_GREGORIAN_DAY = 1000 * 60 * 60 * 24;

function gregorianDayOfYear(month, dateInMonth) {
  const date = new Date(
    GREGORIAN_NOW.getFullYear(),
    month - 1,
    dateInMonth
  );

  const diff = (date - GREGORIAN_YEAR_START)
    + ((GREGORIAN_YEAR_START.getTimezoneOffset()
      - date.getTimezoneOffset()) * 60 * 1000);

  return Math.floor(diff / FULL_GREGORIAN_DAY);
}

function translit(original) {
  let result = '';

  for (let index = 0; index < original.length; index++) {
    const char = original[index].toLowerCase();

    switch (char) {
      case 'а':
        result += 'a'
        break;

      case 'б':
        result += 'b'
        break;

      case 'в':
        result += 'v'
        break;

      case 'г':
        result += 'g'
        break;

      case 'д':
        result += 'd'
        break;

      case 'е':
        result += 'e'
        break;

      case 'ё':
        result += 'e'
        break;

      case 'ж':
        result += 'g'
        break;

      case 'з':
        result += 'z'
        break;

      case 'и':
        result += 'i'
        break;

      case 'й':
        result += 'j'
        break;

      case 'к':
        result += 'k'
        break;

      case 'л':
        result += 'l'
        break;

      case 'м':
        result += 'm'
        break;

      case 'н':
        result += 'n'
        break;

      case 'о':
        result += 'o'
        break;

      case 'п':
        result += 'p'
        break;

      case 'р':
        result += 'r'
        break;

      case 'с':
        result += 's'
        break;

      case 'т':
        result += 't'
        break;

      case 'у':
        result += 'u'
        break;

      case 'ф':
        result += 'f'
        break;

      case 'х':
        result += 'h'
        break;

      case 'ц':
        result += 'c'
        break;

      case 'ч':
        result += 'ch'
        break;

      case 'ш':
        result += 'sh'
        break;

      case 'щ':
        result += 'sh'
        break;

      case 'ъ':
        result += 'j'
        break;

      case 'ы':
        result += 'y'
        break;

      case 'ь':
        result += '\''
        break;

      case 'э':
        result += 'e'
        break;

      case 'ю':
        result += 'ju'
        break;

      case 'я':
        result += 'ja'
        break;

      default:
        result += ' ';
        break;
    }
  }

  return result;
}

function translitSplit(string) {
  return translit(string)
    .split(' ')
    .map(component => component.trim())
    .filter(component => component.length > 0)
}

module.exports = {
  configureNovosibirsk: () => {
    const data = (typeof window !== 'undefined' && window.data) || {};
    const lat = (data.location && data.location.lat) || LATITUDE;
    const long = (data.location && data.location.long) || LONGITUDE;
    const city = (data.location && data.location.city) || 'Novosibirsk';

    Hebcal.cities.addCity(city, [lat, long, false]);
    Hebcal.defaultCity = city;
    Hebcal.defaultLocation = [lat, long];
    Hebcal.parshiot.forEach((chapter) => {
      const name = chapter[0];
      const translation = CHAPTERS[name];

      if (!translation) {
        // throw new Error(`Missing "${name}" chapter translation`);
        // Don't crash if translation missing, just use English
        return;
      }

      chapter[0] = translation;
    });
  },

  formatHebrewDate: (hewbrewDate) => {
    const lang = (typeof window !== 'undefined' && window.data && window.data.language) || 'ru';
    let result = `${hewbrewDate.getDate()} `;
    const month = hewbrewDate.getMonth();

    if (lang === 'en') {
      const months = ['', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul', 'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar II'];
      result += months[month];
    } else {
      switch (month) {
        case 1: result += 'Нисана'; break;
        case 2: result += 'Ияра'; break;
        case 3: result += 'Сивана'; break;
        case 4: result += 'Тамуза'; break;
        case 5: result += 'Ава'; break;
        case 6: result += 'Элула'; break;
        case 7: result += 'Тишрея'; break;
        case 8: result += 'Хешвана'; break;
        case 9: result += 'Кислева'; break;
        case 10: result += 'Тевета'; break;
        case 11: result += 'Швата'; break;
        case 12: result += 'Адара'; break;
        case 13: result += 'Адара Бет'; break;
      }
    }

    result += ` ${hewbrewDate.getFullYear()}`;
    return result;
  },

  formatGregorianDate: (gregorianDate) => {
    const lang = (typeof window !== 'undefined' && window.data && window.data.language) || 'ru';
    let result = `${gregorianDate.getDate()} `;
    const month = gregorianDate.getMonth();

    if (lang === 'en') {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      result += months[month];
    } else {
      switch (month) {
        case 0: result += 'Января'; break;
        case 1: result += 'Февраля'; break;
        case 2: result += 'Марта'; break;
        case 3: result += 'Апреля'; break;
        case 4: result += 'Мая'; break;
        case 5: result += 'Июня'; break;
        case 6: result += 'Июля'; break;
        case 7: result += 'Августа'; break;
        case 8: result += 'Сентября'; break;
        case 9: result += 'Октября'; break;
        case 10: result += 'Ноября'; break;
        case 11: result += 'Декабря'; break;
      }
    }

    result += ` ${gregorianDate.getFullYear()}`;
    return result;
  },

  CURRENT_DAY_OF_YEAR: gregorianDayOfYear(
    GREGORIAN_NOW.getMonth() + 1,
    GREGORIAN_NOW.getDate()
  ),

  DAYS_IN_YEAR: gregorianDayOfYear(
    12,
    31
  ),

  gregorianDayOfYear,

  translit,

  translitSplit,
};
