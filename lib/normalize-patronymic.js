/**
 * 1.37.0 I65: turn a Russian patronymic inside a deceased name into бен/бат + the father's name:
 *   «Орень Белла Ефимовна» → «Орень Белла бат Ефим», «Аникштейн Григорий Моисеевич» → «… бен Моисей».
 *
 * Deterministic and conservative. A name is converted only when
 *   - it has no бен/бат/сын/дочь/בן/בת/ben/bat already and no Hebrew letters;
 *   - exactly one word (outside parentheses, not the first word = surname) ends in
 *     -ович/-евич/-ич (бен) or -овна/-евна/-ична/-инична (бат);
 *   - that word is the last word outside parentheses (text after it → uncertain);
 *   - the father's name derived from it is a known given name (FATHER_NAMES) or an explicit
 *     irregular form (IRREGULAR) — otherwise the row is reported as uncertain and never applied;
 *   - the first-name gender and the gender on record do not contradict the suffix.
 * Only the patronymic word is replaced; surnames, parentheses, nicknames and extra text stay put.
 */
'use strict';
const { listGender } = require('./gender-certain');

const FATHER_NAMES = new Set((
  'абрам авраам аврам абель адольф александр анатолий андрей аркадий арон аарон архип асхат ахат '
  + 'бенедикт бенциан беньямин вениамин веньямин борис борух бендит валерий василий виктор виталий витольд '
  + 'владимир вульф вольф генах генох генрих геннадий георгий герман герц герш гирш григорий давид давыд '
  + 'данил даниил дмитрий евгений евсей елизар ефим ефрем залман залмон захар зелик зельман зиновий зорох '
  + 'зямa иван израиль израил илья иосиф исаак исак исай карл константин кушель лазарь лейб лейба лейзер '
  + 'леонид леонтий липман лев максим марк марлен матвей меер мейер мейр мендель менахем михаил мордух '
  + 'мордко мориц натан наум нахман никита николай нисон нисан нисель ошер павел петр пётр рафаил рахмиль '
  + 'рувим савелий самуил самсон семен семён сергей соломон сроль сруль станислав тимофей федор фёдор '
  + 'феликс филипп фишель фройм фроим хаим цви шевель шмиль шмуль шмулик шнеер шая эдмунд элик эммануил '
  + 'эрвин юзеф юлий юрий яков янкель замвель занвел эфраим мовша мойша моисей мендель гершон гедалья '
  + 'лазар юда юдель эля элья ицхак ицик калман кальман копель нохим пинхас симха шолом шлема хаскель '
  + 'игорь эдуард олег роман вадим вячеслав остап гесель насон ихиль арутюн луис нухим михель есель симон'
).split(/\s+/).filter(Boolean));

// Irregular patronymic stems (lower case, without the -ович/-евич/-ич/-овна/-евна/-ична ending).
const IRREGULAR = {
  male: {
    льв: 'Лев', павл: 'Павел', петр: 'Петр', пётр: 'Пётр', михайл: 'Михаил', яковл: 'Яков',
    иль: 'Илья', никит: 'Никита', кузьм: 'Кузьма', лук: 'Лука', фом: 'Фома', савв: 'Савва',
    исаев: 'Исай', шаев: 'Шая', мовшев: 'Мовша', мойшев: 'Мойша', самойл: 'Самуил',
  },
  female: {
    льв: 'Лев', павл: 'Павел', петр: 'Петр', пётр: 'Пётр', михайл: 'Михаил', яковл: 'Яков',
    иль: 'Илья', ильин: 'Илья', никит: 'Никита', кузьм: 'Кузьма', кузьмин: 'Кузьма', лук: 'Лука', лукин: 'Лука',
    фом: 'Фома', фомин: 'Фома', савв: 'Савва', исаев: 'Исай', шаев: 'Шая', мовшев: 'Мовша', мойшев: 'Мойша',
    самойл: 'Самуил',
  },
};
// Irregular forms that are standard but worth a second look in the approval list.
const MEDIUM_IRREGULAR = new Set(['самойл', 'исаев', 'шаев']);

// Common Jewish surnames ending in -ович/-евич/-ич: never treated as a patronymic in a two-word name,
// and only when the father's name is known in a longer one.
const SURNAME_LIKE = new Set(('рабинович равинович абрамович гуревич беркович берлович лейбович мошкович '
  + 'мордкович шахнович фалькович фолькович велькович итскович рубанович цифринович радашкевич марткович '
  + 'перлович шумелович майофич силич хунович борисевич каценелебогович ').split(/\s+/).filter(Boolean));

const WORD_RE = /[A-Za-zА-ЯЁа-яё][A-Za-zА-ЯЁа-яё'’-]*/g;
const MARKER_RE = /(^|[^A-Za-zА-ЯЁа-яё])(бен|бат|ben|bat|сын|дочь|son|daughter)(?![A-Za-zА-ЯЁа-яё])/i;
const HEBREW_RE = /[\u0590-\u05FF]/;
const VOWELS = 'аеёиоуыэюя';
const SIBILANTS = 'жшчщц';

function suffixOf(lower) {
  // Returns { gender, stem, kind } for a patronymic-looking word, or null.
  let m;
  if ((m = /^(.{2,}?)инична$/.exec(lower))) return { gender: 'female', stem: m[1], kind: 'ична-ин', raw: `${m[1]}ин` };
  if ((m = /^(.{2,}?)ична$/.exec(lower))) return { gender: 'female', stem: m[1], kind: 'ична' };
  if ((m = /^(.{2,}?)овна$/.exec(lower))) return { gender: 'female', stem: m[1], kind: 'ов' };
  if ((m = /^(.{2,}?)евна$/.exec(lower))) return { gender: 'female', stem: m[1], kind: 'ев' };
  if ((m = /^(.{2,}?)ович$/.exec(lower))) return { gender: 'male', stem: m[1], kind: 'ов' };
  if ((m = /^(.{2,}?)евич$/.exec(lower))) return { gender: 'male', stem: m[1], kind: 'ев' };
  if ((m = /^(.{2,}?)ич$/.exec(lower))) return { gender: 'male', stem: m[1], kind: 'ич' };
  return null;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/** Derive the father's given name from one (non-hyphenated) patronymic part. */
function deriveFather(part) {
  const lower = part.toLowerCase();
  const sfx = suffixOf(lower);
  if (!sfx) return null;
  const { gender, stem, kind } = sfx;
  const irr = IRREGULAR[gender];
  const irrKey = kind === 'ев' ? `${stem}ев` : (sfx.raw || stem);
  for (const key of [irrKey, stem]) {
    if (irr[key]) {
      return { gender, father: irr[key], confidence: MEDIUM_IRREGULAR.has(key) ? 'medium' : 'high', how: 'irregular' };
    }
  }
  // Keep the original spelling of the stem (Семёновна → Семён).
  const origStem = part.slice(0, stem.length);
  let candidates;
  if (kind === 'ов') candidates = [origStem];
  else if (kind === 'ична' || kind === 'ична-ин' || kind === 'ич') candidates = [`${origStem}а`];
  else {
    const last = stem.slice(-1);
    if (last === 'ь') candidates = [`${origStem.slice(0, -1)}ий`, origStem];
    else if (VOWELS.includes(last)) candidates = [`${origStem}й`, origStem];
    else if (SIBILANTS.includes(last)) candidates = [origStem, `${origStem}а`];
    else candidates = [`${origStem}ь`, origStem];
  }
  const hit = candidates.find((c) => FATHER_NAMES.has(c.toLowerCase()));
  if (hit) return { gender, father: cap(hit), confidence: 'high', how: 'rule' };
  return { gender, father: cap(candidates[0]), confidence: 'uncertain', how: 'unknown father name' };
}

/** Hyphenated patronymics (Аврам-Иосифович): derive the last part, keep the earlier ones. */
function deriveFatherWord(word) {
  const parts = word.split('-');
  const d = deriveFather(parts[parts.length - 1]);
  if (!d) return null;
  if (parts.length === 1) return d;
  const head = parts.slice(0, -1);
  const known = head.every((p) => FATHER_NAMES.has(p.toLowerCase()));
  return {
    ...d,
    father: [...head.map(cap), d.father].join('-'),
    confidence: known ? d.confidence : 'uncertain',
    how: known ? d.how : 'unknown part in a double name',
  };
}

function normalizeGender(g) {
  const v = String(g == null ? '' : g).toLowerCase();
  return v === 'male' || v === 'female' ? v : '';
}

/**
 * @returns {null | { name, newName, father, patronymic, oldGender, newGender, confidence, note, uncertain }}
 *   null when the name has no patronymic to convert (or is Hebrew / already has бен/бат).
 *   uncertain rows carry newName === name and must not be applied.
 */
function proposePatronymic(person = {}, { firstNameGender = listGender } = {}) {
  const name = String(person.name || '');
  if (!name.trim()) return null;
  if (HEBREW_RE.test(name)) return null;
  if (MARKER_RE.test(name)) return null;
  const rawGender = person.gender == null ? '' : String(person.gender);
  const oldGender = normalizeGender(rawGender);

  const words = [];
  let m;
  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(name))) {
    const before = name.slice(0, m.index);
    const depth = (before.match(/\(/g) || []).length - (before.match(/\)/g) || []).length;
    words.push({ text: m[0].replace(/[-'’]+$/, ''), index: m.index, inParens: depth > 0 });
  }
  const outside = words.filter((w) => !w.inParens);
  const cands = words
    .map((w) => ({ ...w, pos: outside.indexOf(w), sfx: suffixOf(w.text.toLowerCase().split('-').pop()) }))
    .filter((w) => w.sfx);
  // A first-word -ович is the surname (Рабинович …), and a word in parentheses is a maiden name or
  // nickname: ignore both. A patronymic only inside parentheses is listed as uncertain.
  const real = cands.filter((w) => !w.inParens && w.pos > 0);
  const notes = [];
  let pick = real[real.length - 1];
  if (!pick) {
    pick = cands.find((w) => w.inParens && !SURNAME_LIKE.has(w.text.toLowerCase()));
    if (!pick) return null;
  }
  if (real.length > 1) notes.push(`more than one patronymic-like word (${real.map((w) => w.text).join(', ')})`);
  if (pick.inParens) notes.push('patronymic is inside parentheses');
  if (!pick.inParens && outside[outside.length - 1] !== words.find((w) => w.index === pick.index)) {
    notes.push('text after the patronymic');
  }
  const d = deriveFatherWord(pick.text);
  if (!d) return null;
  const lowerWord = pick.text.toLowerCase();
  if (SURNAME_LIKE.has(lowerWord)) {
    if (outside.length < 3) notes.push(`«${pick.text}» is a common surname`);
  }
  if (d.confidence === 'uncertain') notes.push(`father's name unclear (${d.how}: ${d.father}?)`);
  if (oldGender && oldGender !== d.gender) notes.push(`gender on record is ${oldGender}, the patronymic says ${d.gender}`);
  if (typeof firstNameGender === 'function') {
    const given = outside[pick.pos - 1];
    const fg = given && pick.pos >= 1 ? firstNameGender(given.text) : '';
    if (fg && fg !== d.gender) notes.push(`first name «${given.text}» looks ${fg}`);
  }

  const word = d.gender === 'male' ? 'бен' : 'бат';
  const replacement = `${word} ${d.father}`;
  const uncertain = notes.length > 0;
  const newName = uncertain ? name : name.slice(0, pick.index) + replacement + name.slice(pick.index + pick.text.length);
  return {
    name,
    newName,
    proposedName: name.slice(0, pick.index) + replacement + name.slice(pick.index + pick.text.length),
    patronymic: pick.text,
    father: d.father,
    oldGender: rawGender,
    newGender: oldGender || d.gender,
    suffixGender: d.gender,
    confidence: uncertain ? 'uncertain' : d.confidence,
    note: notes.join('; ') || d.how,
    uncertain,
  };
}

/**
 * 1.36.5 I66: a name that has BOTH a Russian patronymic and бен/бат + father («Немировский Абрам
 * Исаакович бен Исаака») keeps only the бен/бат part: the patronymic word is removed, nothing else
 * changes, spaces collapse. Clear-cut only when exactly one patronymic word sits outside parentheses
 * (not the first word, not a common -ович surname), its gender matches бен/бат, and it is directly
 * followed either by бен/бат outside parentheses, or by a final parenthesised «Имя бен/бат Отец»
 * (the person's Jewish name) or «бен/бат Отец». Everything else that has both is listed as ambiguous, never changed.
 * @returns {null | { name, newName, proposedName, patronymic, uncertain, note }}
 */
const DUP_MARK_RE = /^(бен|бат)$/i;
function proposeDropPatronymicDup(person = {}) {
  const name = String(person.name || '');
  if (!name.trim() || HEBREW_RE.test(name)) return null;
  const words = [];
  let m;
  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(name))) {
    const before = name.slice(0, m.index);
    const depth = (before.match(/\(/g) || []).length - (before.match(/\)/g) || []).length;
    words.push({ text: m[0].replace(/[-'’]+$/, ''), index: m.index, inParens: depth > 0 });
  }
  const marks = words.filter((w) => DUP_MARK_RE.test(w.text));
  if (!marks.length) return null;
  const outside = words.filter((w) => !w.inParens);
  // Paren groups with a single word are maiden names / nicknames — never a patronymic signal.
  const groups = [...name.matchAll(/\(([^()]*)\)/g)].map((g) => ({ start: g.index, end: g.index + g[0].length, inner: g[1] }));
  const groupOf = (w) => groups.find((g) => w.index > g.start && w.index < g.end);
  const cands = words
    .map((w, i) => ({ ...w, i, pos: outside.indexOf(w), sfx: suffixOf(w.text.toLowerCase().split('-').pop()) }))
    .filter((w) => w.sfx && w.pos !== 0)
    .filter((w) => !(w.inParens && groupOf(w) && groupOf(w).inner.trim().split(/\s+/).length === 1));
  if (!cands.length) return null;
  const notes = [];
  const pick = cands.find((w) => !w.inParens) || cands[0];
  const proposedName = (name.slice(0, pick.index) + name.slice(pick.index + pick.text.length))
    .replace(/\s+([),.])/g, '$1').replace(/\(\s+/g, '(').replace(/\s{2,}/g, ' ').trim();
  if (cands.length > 1) notes.push(`more than one patronymic-like word (${cands.map((w) => w.text).join(', ')})`);
  if (pick.inParens) notes.push('patronymic is inside parentheses');
  if (SURNAME_LIKE.has(pick.text.toLowerCase())) notes.push(`«${pick.text}» is a common surname`);
  const next = words[pick.i + 1];
  const markGender = (w) => (/^бен$/i.test(w.text) ? 'male' : 'female');
  if (!notes.length) {
    if (next && !next.inParens && DUP_MARK_RE.test(next.text)) {
      if (markGender(next) !== pick.sfx.gender) notes.push(`${pick.text} is ${pick.sfx.gender}, «${next.text}» is not`);
      if (!words[pick.i + 2]) notes.push('nothing after бен/бат');
    } else if (next && next.inParens) {
      const g = groupOf(next);
      const between = name.slice(pick.index + pick.text.length, g.start);
      const inner = g.inner.trim().split(/\s+/);
      // «(Авраам бен Ишаягу)» — the person's Jewish name — or «(бат Абрамаса)» — the same father in бен/бат form.
      const at = DUP_MARK_RE.test(inner[0]) ? 0 : 1;
      const ok = !between.trim() && inner.length >= at + 2 && DUP_MARK_RE.test(inner[at]) && !name.slice(g.end).trim()
        && markGender({ text: inner[at] }) === pick.sfx.gender && inner.slice(at + 1).every((t) => !DUP_MARK_RE.test(t));
      if (!ok) notes.push('бен/бат in parentheses does not look like the same person\'s Jewish name');
    } else {
      notes.push('patronymic is not directly before the бен/бат part');
    }
    if (/\(/.test(name) && !(next && next.inParens) && groups.some((g) => g.start > pick.index && suffixOf((g.inner.trim().split(/\s+/).pop() || '').toLowerCase()))) {
      notes.push('another person/patronymic in parentheses');
    }
  }
  const uncertain = notes.length > 0;
  return {
    name,
    newName: uncertain ? name : proposedName,
    proposedName,
    patronymic: pick.text,
    uncertain,
    note: notes.join('; ') || 'patronymic next to бен/бат',
  };
}

module.exports = { proposePatronymic, proposeDropPatronymicDup, deriveFatherWord, FATHER_NAMES, SURNAME_LIKE };
