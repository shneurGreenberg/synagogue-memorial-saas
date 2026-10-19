const { parseOptionalDeathDate } = require('./death-date');

/**
 * Parse dd.mm.yyyy (European / Israeli day-first). Rejects slash-separated US-style input.
 */
function parseDdMmYyyy(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }
  if (raw.includes('/')) {
    return null;
  }
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(raw);
  if (!match) {
    return null;
  }
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }
  return parseOptionalDeathDate({ month, date: day, year });
}

function formatDdMmYyyy(death) {
  if (!death || !death.year || !death.month || !death.date) {
    return '';
  }
  const day = String(death.date).padStart(2, '0');
  const month = String(death.month).padStart(2, '0');
  const year = String(death.year);
  return `${day}.${month}.${year}`;
}

function formatDdMmYyyyFromIso(iso) {
  const value = String(iso || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return '';
  }
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const date = Number.parseInt(match[3], 10);
  return formatDdMmYyyy({ year, month, date });
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

/** Apply dd.mm.yyyy mask while typing (digits only, max 8). */
function maskDdMmYyyyInput(digits) {
  const d = digitsOnly(digits).slice(0, 8);
  if (d.length <= 2) {
    return d;
  }
  if (d.length <= 4) {
    return `${d.slice(0, 2)}.${d.slice(2)}`;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

module.exports = {
  parseDdMmYyyy,
  formatDdMmYyyy,
  formatDdMmYyyyFromIso,
  maskDdMmYyyyInput,
  digitsOnly,
};
