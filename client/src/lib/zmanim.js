import Hebcal from 'hebcal';

/** 1.29: halachic times for the combined board, computed from the community location. */
export const ZMANIM_KEYS = [
  ['alot_hashachar', 'zman_alot'],
  ['neitz_hachama', 'zman_netz'],
  ['sof_zman_shma', 'zman_sof_shma'],
  ['sof_zman_tfilla', 'zman_sof_tefila'],
  ['chatzot', 'zman_chatzot'],
  ['mincha_gedola', 'zman_mincha_gedola'],
  ['plag_hamincha', 'zman_plag'],
  ['shkiah', 'zman_shkia'],
  ['tzeit', 'zman_tzeit'],
];

export function computeZmanim({ year, month, day, lat, lng }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return [];
  }
  const hdate = new Hebcal.HDate(new Date(year, month - 1, day, 12, 0, 0));
  hdate.setLocation(lat, lng);
  const z = hdate.getZemanim();
  return ZMANIM_KEYS
    .map(([key, labelKey]) => ({ key, labelKey, at: z[key] }))
    .filter((row) => row.at instanceof Date && !Number.isNaN(row.at.getTime()));
}

export function isPermanentActive(person, now = new Date()) {
  if (!person || !person.permanent) return false;
  if (!person.permanentUntil) return true;
  const until = new Date(person.permanentUntil);
  return Number.isNaN(until.getTime()) || until.getTime() >= now.getTime();
}

/**
 * Today's yahrzeits first (existing order), then permanent names, then everyone else.
 */
export function orderWithPermanent(people) {
  const lead = [];
  const permanent = [];
  const rest = [];
  (people || []).forEach((person) => {
    if (person.passedToday || person.gregorianDayOfMemory === 0) lead.push(person);
    else if (person.isPermanent) permanent.push(person);
    else rest.push(person);
  });
  return [...lead, ...permanent, ...rest];
}

/** Combined board: pinned (today + permanent) stay, remaining slots rotate. */
// 1.29.6 I9: fixed set, no paging — today/permanent first, then nearest upcoming.
export function combinedSlots(people, slotCount) {
  const list = people || [];
  const pinned = list.filter((p) => p.passedToday || p.isPermanent);
  const others = list.filter((p) => !(p.passedToday || p.isPermanent));
  return [...pinned, ...others].slice(0, slotCount);
}
