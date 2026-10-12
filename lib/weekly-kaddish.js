const Hebcal = require('hebcal');
const {
  getGregorianDateInTimezone,
  resolveSynagogueTimezone,
  resolveYahrzeitOptions,
  isYahrzeitOnDate,
} = require('./yahrzeit');
const { getPersonContacts } = require('./person-contact');

const HEBREW_MONTHS = ['', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב'];
const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const WHATSAPP_MESSAGE_INTRO = 'שלום, אלה האנשים שיש להם יום שנה בשבוע הקרוב, וניתן להזמין אותם לומר קדיש או להצטרף להתוועדות:';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// Week = Sunday..Shabbat (inclusive) containing "now" in the community timezone.
function getKaddishWeek(timezone, now = new Date()) {
  const today = getGregorianDateInTimezone(timezone, now);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return {
    weekKey: dateKey(start),
    start: days[0],
    end: days[6],
    days,
  };
}

function formatYahrzeitDay(date) {
  const h = new Hebcal.HDate(date);
  return {
    dateKey: dateKey(date),
    gregorianLabel: `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`,
    hebrewLabel: `${h.getDate()} ${HEBREW_MONTHS[h.getMonth()] || ''}`.trim(),
    weekdayHe: HEBREW_WEEKDAYS[date.getDay()],
    isShabbat: date.getDay() === 6,
  };
}

function contactHasReachableInfo(c) {
  return !!(c && (c.phone || c.email));
}

function getWeeklyKaddishEntries(synagogue, now = new Date()) {
  const timezone = resolveSynagogueTimezone(synagogue);
  const options = resolveYahrzeitOptions(synagogue);
  const week = getKaddishWeek(timezone, now);
  const seen = new Set();
  const entries = [];

  week.days.forEach((day) => {
    ((synagogue && synagogue.people) || []).forEach((person) => {
      const key = person.id != null ? person.id : person.name;
      if (seen.has(key)) return;
      if (!isYahrzeitOnDate(person, day, options)) return;
      seen.add(key);
      const contacts = getPersonContacts(person).map((c) => ({
        name: c.name, phone: c.phone, email: c.email, platform: c.platform,
      }));
      const missingContact = !contacts.some(contactHasReachableInfo);
      entries.push({
        id: person.id,
        name: person.name || '',
        searchQuery: encodeURIComponent(person.name || ''),
        ...formatYahrzeitDay(day),
        contacts,
        missingContact,
      });
    });
  });

  return {
    ...week,
    weekStartKey: dateKey(week.start),
    weekEndKey: dateKey(week.end),
    entries,
    missingCount: entries.filter((e) => e.missingContact).length,
  };
}

function formatContactLine(c) {
  return [c.name, c.phone || c.email].filter(Boolean).join(' – ');
}

function buildWeeklyKaddishMessage(entries) {
  const lines = [WHATSAPP_MESSAGE_INTRO, ''];
  (entries || []).forEach((e, i) => {
    lines.push(`${i + 1}. ${e.name} – יום ${e.weekdayHe} ${e.gregorianLabel} (${e.hebrewLabel})`);
    if (e.contacts && e.contacts.length) {
      e.contacts.forEach((c) => {
        const line = formatContactLine(c);
        if (line) lines.push(`   איש קשר: ${line}`);
      });
    } else {
      lines.push('   איש קשר: אין פרטים');
    }
  });
  return lines.join('\n');
}

function normalizeWhatsappNumber(raw) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15 ? digits : '';
}

function buildWhatsappUrl(number, text) {
  const n = normalizeWhatsappNumber(number);
  if (!n) return '';
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

function isWeekConfirmed(synagogue, weekKey) {
  const c = synagogue && synagogue.weeklyKaddishConfirmation;
  return !!(c && c.weekKey === weekKey && c.confirmedAt);
}

module.exports = {
  WHATSAPP_MESSAGE_INTRO,
  getKaddishWeek,
  getWeeklyKaddishEntries,
  buildWeeklyKaddishMessage,
  normalizeWhatsappNumber,
  buildWhatsappUrl,
  isWeekConfirmed,
};
