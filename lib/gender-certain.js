/**
 * 1.36.2 I64b: strict gender inference for deceased names WITHOUT a son/daughter word.
 * Collects every signal in the name and answers only when all of them agree:
 *   - Russian female patronymic -овна/-евна/-ична/-инична (anywhere);
 *   - Russian male patronymic -ович/-евич/-ич only when it is not the first word of a 3+ word name
 *     (a first-word -ович is a surname: Рабинович, Абрамович — same for both genders);
 *   - first names from the Hebrew/Russian/Yiddish/English lists (lib/deceased-gender + extras);
 *   - surname endings: -ова/-ева/-ина/-ына/-ская/-цкая (female), -ов/-ев/-ский/-цкий (male);
 *     -ин/-ын (Левин) is only a supporting signal, never enough alone.
 * Any conflict, or no signal → '' (uncertain, leave unchanged).
 */
'use strict';
const { inferGenderFromName } = require('./deceased-gender');

// Extra first names (Yiddish/Russian/Hebrew diminutives and transliterations) not in deceased-gender.
const EXTRA_FEMALE = new Set(('фейга фейгл фейгель сима циля цивья цирл цыпа бейла брайна гися геся гинда добра '
  + 'ента ента зельда зисл ита итта либа либа малке мера мирра нехама песя переле рейза рива рися сарра '
  + 'тайба туба фаня фрейдл фрейда хиня хьена шейва шифра эйдл элька этя юдит голда '
  + 'мириям мирьям софа берта маня рая рахиль рахель хася клара фира дора бэла бела полина ').split(/\s+/).filter(Boolean));
const EXTRA_MALE = new Set(('берко беркo боря гирш гершл герш давыд ейна залман зелик зуся иосель ицик ицко '
  + 'йосл калман кива лейзер лейба лейб мендл мойша мотя моисей мордко нисель носон нохем ошер пейся сендер '
  + 'срул сруль файвл фишель фроим хаскл хацкель цаля шая шлойме шмерл шолем элья элиэзер юдель янкель '
  + 'семен семён эфроим фима ефим изя гриша миша саша').split(/\s+/).filter(Boolean));
// Names used for both genders in Russian diminutives — never a signal.
const NEUTRAL = new Set(['саша', 'женя', 'валя', 'шура', 'слава']);
EXTRA_FEMALE.delete('саша'); EXTRA_MALE.delete('саша');

function tokens(name) {
  return String(name || '').toLowerCase().replace(/[()[\],.;:!?"״׳'`\/–—]/g, ' ').split(/\s+/).filter(Boolean);
}

function listGender(t) {
  if (NEUTRAL.has(t)) return '';
  const m = inferGenderFromName(t);
  // inferGenderFromName on a single word: list match or surname/patronymic ending. Only trust list here.
  const inList = (g) => (g === 'male' ? EXTRA_MALE.has(t) : EXTRA_FEMALE.has(t));
  if (EXTRA_MALE.has(t) && !EXTRA_FEMALE.has(t)) return 'male';
  if (EXTRA_FEMALE.has(t) && !EXTRA_MALE.has(t)) return 'female';
  if (m !== 'unknown' && !/^[а-яё]{3,}(ов|ев|ин|ын|ский|цкий|ова|ева|ина|ына|ская|цкая|ович|евич|ич|овна|евна|ична)$/.test(t)) return m;
  return inList(m) ? m : '';
}

/** @returns {{ gender: 'male'|'female'|'', reason: string }} */
function inferGenderCertain(name) {
  const w = tokens(name);
  if (!w.length) return { gender: '', reason: 'empty' };
  const signals = []; // { g, why, strong }
  w.forEach((full, i) => {
    // Hyphenated words (Марк-Перкальскене, Борух-Бендитовна): only the last part's ending counts,
    // and they are never matched against first-name lists.
    const hyphen = full.includes('-');
    const t = hyphen ? full.split('-').filter(Boolean).pop() || '' : full;
    if (/^[а-яё]{3,}(овна|евна|ична|инична)$/.test(t)) { signals.push({ g: 'female', why: `patronymic ${t}`, strong: true }); return; }
    if (/^[а-яё]{3,}(ович|евич|ьич)$/.test(t) || /^[а-яё]{4,}ич$/.test(t)) {
      if (i > 0 && w.length >= 3) signals.push({ g: 'male', why: `patronymic ${t}`, strong: true });
      else signals.push({ g: '', why: `-ич surname ${t}` });
      return;
    }
    if (hyphen) {
      if (/^[а-яё]{3,}(ова|ева|ская|цкая)$/.test(t)) signals.push({ g: 'female', why: `surname ${full}`, strong: true });
      else if (/^[а-яё]{3,}(ов|ев|ский|цкий)$/.test(t)) signals.push({ g: 'male', why: `surname ${full}`, strong: true });
      return;
    }
    const lg = listGender(t);
    if (lg) { signals.push({ g: lg, why: `first name ${t}`, strong: true }); return; }
    if (/^[а-яё]{3,}(ова|ева|ина|ына|ская|цкая)$/.test(t)) { signals.push({ g: 'female', why: `surname ${t}`, strong: true }); return; }
    if (/^[а-яё]{3,}(ов|ев|ский|цкий)$/.test(t)) { signals.push({ g: 'male', why: `surname ${t}`, strong: true }); return; }
    if (/^[а-яё]{3,}(ин|ын)$/.test(t)) signals.push({ g: 'male', why: `surname ${t}`, strong: false });
  });
  const gs = new Set(signals.filter((s) => s.g).map((s) => s.g));
  if (gs.size > 1) return { gender: '', reason: `conflict: ${signals.filter((s) => s.g).map((s) => `${s.g} (${s.why})`).join(', ')}` };
  const strong = signals.filter((s) => s.g && s.strong);
  // «Шварцман Зельма Ошевич»: a male patronymic next to an unknown given name ending in -а/-я is not
  // enough (the given name may be female). Needs a known male first name or male surname too.
  if (strong.length && strong.every((s) => s.why.startsWith('patronymic')) && strong[0].g === 'male') {
    const given = w.length >= 3 ? w[1] : '';
    if (/[ая]$/.test(given)) return { gender: '', reason: `male patronymic but given name ${given} may be female` };
  }
  if (!strong.length) return { gender: '', reason: signals.length ? `weak only: ${signals.map((s) => s.why).join(', ')}` : 'no signal' };
  return { gender: strong[0].g, reason: strong.map((s) => s.why).join(', ') };
}

module.exports = { inferGenderCertain, listGender };
