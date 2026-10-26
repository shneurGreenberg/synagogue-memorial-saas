/**
 * 1.29: "permanent" deceased (e.g. donors) are shown on the board every day.
 * An optional end date (inclusive, by calendar day) stops the pinning.
 */
function parsePermanentUntil(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isPersonPermanentActive(person, now = new Date()) {
  if (!person || !person.permanent) return false;
  if (!person.permanentUntil) return true;
  const until = new Date(person.permanentUntil);
  if (Number.isNaN(until.getTime())) return true;
  return until.getTime() >= now.getTime();
}

function parsePermanentFromBody(body = {}) {
  const raw = body.permanent;
  const values = Array.isArray(raw) ? raw : [raw];
  const permanent = values.some((v) => ['1', 'on', 'true', true].includes(v));
  return {
    permanent,
    permanentUntil: permanent ? parsePermanentUntil(body.permanentUntil) : null,
  };
}

function formatPermanentUntilInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

module.exports = {
  parsePermanentUntil,
  isPersonPermanentActive,
  parsePermanentFromBody,
  formatPermanentUntilInput,
};
