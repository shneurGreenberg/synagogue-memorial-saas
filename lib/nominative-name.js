/**
 * I87: Russian given names after бен/бат were left in the genitive by the сын/дочь → бен/бат run
 * («бен Александра», «бат Моисея и Хаи»). Convert each parent name after бен/бат to the nominative
 * («бен Александр», «бат Моисей и Хая»).
 *
 * Deterministic and conservative:
 *   - a word already in the nominative dictionary and not a genitive of another known name stays;
 *   - a word whose genitive→nominative candidate is a known name (or an explicit irregular) converts;
 *   - a word that is both a known nominative and a genitive of a known name (Лейба: Лейба / Лейб;
 *     Эли: Эли / Эля), or that is not known at all, is reported as uncertain and never changed.
 * Hebrew/Latin names and text inside parentheses are left alone.
 */
'use strict';
const { FATHER_NAMES } = require('./normalize-patronymic');

const words = (s) => s.split(/\s+/).filter(Boolean);
const MALE = new Set([...FATHER_NAMES, ...words(
  'авраам аарон ерухим исроэль исраэль шмуиль шмуэль тевель копель идель идел мендел менделе янкел хайм '
  + 'дувид меир меер гершон пинхас нусин ханон маркус цудик элияс озяс шимон нисон сэм шлема шлёма липа '
  + 'мойше лейба лейб эли кузьма лука фома савва шая ишаягу йосиф шулем бер берл зус зуся хона нота '
  + 'эля элиэзер ицко шолом шломо моше мотель мотл айзик айзек евель евсей герцель гилель гирш гершель '
  + 'шахна шахно иче хацкель хацкл файвель файвиш фейвель шимшон шебсель бейниш бениамин беньямин',
)]);
const FEMALE = new Set(words(
  'анна мария роза рива ривка хая хая-геня геня берта розалия эсфирь рахель рахиль малка чарна сара '
  + 'циля раиса энта любовь фаина фрида двойра дебора ента лея лия гися гита голда мина мира нехама '
  + 'песя рейзя рейза соня софья софия сура сима таубе фейга хана цирля эстер эстера юдифь блюма браня '
  + 'бейля бася дора ида ита злата зина зинаида клара лиза лидия ольга полина ревекка ребекка рая '
  + 'фаня хиена шейна шифра этля этель белла елена евгения екатерина татьяна надежда вера галина '
  + 'людмила валентина нина зоя тамара',
));
const KNOWN = (w) => MALE.has(w) || FEMALE.has(w);

// Genitive → nominative irregulars (fleeting vowel, soft sign, -ии/-ови).
const IRREGULAR = {
  льва: 'Лев', павла: 'Павел', петра: 'Петр', пётра: 'Пётр', любови: 'Любовь', эсфири: 'Эсфирь',
  рахили: 'Рахиль', юдифи: 'Юдифь', ильи: 'Илья', никиты: 'Никита', моисея: 'Моисей', евсея: 'Евсей',
};
// Known-ambiguous words: nominative form exists AND looks like a genitive of another name.
// suggest = the form shown in the approval list (never applied automatically).
const AMBIGUOUS = {
  лейба: { note: 'Лейба or Лейб (both forms are used)', suggest: 'Лейб' },
  эли: { note: 'Эли (Hebrew Eli) or Эля', suggest: 'Эли' },
  самойла: { note: 'Самойла (nominative) or Самойл', suggest: 'Самойл' },
  сэма: { note: 'Сэм or Сэма', suggest: 'Сэм' },
};
const TYPOS = { араама: 'Авраам', абрамаса: 'Абрамас' };

const cap = (s) => s.split('-').map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join('-');
const CONS = 'бвгджзйклмнпрстфхцчшщ';
const VELAR_SIB = 'гкхжшчщ';

/** Possible nominatives for a genitive-looking lower-case word. */
function genitiveCandidates(w) {
  const out = [];
  const stem = w.slice(0, -1);
  const last = w.slice(-1);
  const prev = stem.slice(-1);
  if (last === 'а' && CONS.includes(prev)) out.push(stem); // Абрама → Абрам
  if (last === 'я') {
    if ('еи'.includes(prev)) out.push(`${stem}й`); // Моисея → Моисей, Матвея → Матвей
    else out.push(`${stem}ь`); // Лазаря → Лазарь, Израиля → Израиль
  }
  if (last === 'ы') out.push(`${stem}а`); // Розы → Роза, Ривы → Рива
  if (last === 'и') {
    if ('иаеу'.includes(prev) || prev === 'л' || prev === 'н' || prev === 'с' || prev === 'т') out.push(`${stem}я`); // Марии, Хаи, Цили, Гени
    if (VELAR_SIB.includes(prev)) out.push(`${stem}а`); // Малки → Малка
    out.push(`${stem}ь`); // Рахили → Рахиль
  }
  return out;
}

/**
 * One name word (no punctuation). @returns {{ word, nominative, changed, confidence, note }}
 *  confidence: 'keep' | 'high' | 'uncertain'
 */
function nominativeWord(word) {
  if (word.includes('-')) {
    const parts = word.split('-').map(nominativeWord);
    const unc = parts.filter((p) => p.confidence === 'uncertain');
    const nominative = parts.map((p) => p.nominative).join('-');
    // A known whole (Хая-Геня, Борух-Бендит, Аврам-Иосиф) never needs a second look.
    return {
      word, nominative, suggest: parts.map((p) => p.suggest || p.nominative).join('-'), changed: nominative !== word,
      confidence: unc.length ? 'uncertain' : (nominative !== word ? 'high' : 'keep'),
      note: unc.map((p) => p.note).join('; '),
    };
  }
  const w = word.toLowerCase();
  if (!/^[а-яё]+$/.test(w)) return { word, nominative: word, changed: false, confidence: 'keep', note: 'not Cyrillic' };
  if (AMBIGUOUS[w]) return { word, nominative: word, suggest: AMBIGUOUS[w].suggest, changed: false, confidence: 'uncertain', note: AMBIGUOUS[w].note };
  if (TYPOS[w]) return { word, nominative: word, suggest: TYPOS[w], changed: false, confidence: 'uncertain', note: `typo or rare name? suggest ${TYPOS[w]}` };
  if (IRREGULAR[w]) return { word, nominative: IRREGULAR[w], changed: true, confidence: 'high', note: 'irregular' };
  const cands = genitiveCandidates(w).filter(KNOWN);
  if (KNOWN(w) && cands.length) {
    return { word, nominative: word, suggest: cap(cands[0]), changed: false, confidence: 'uncertain', note: `both «${word}» and «${cap(cands[0])}» are names` };
  }
  if (KNOWN(w)) return { word, nominative: word, changed: false, confidence: 'keep', note: 'nominative' };
  if (cands.length === 1) return { word, nominative: cap(cands[0]), changed: true, confidence: 'high', note: 'rule' };
  if (cands.length > 1) return { word, nominative: word, suggest: cap(cands[0]), changed: false, confidence: 'uncertain', note: `several: ${cands.map(cap).join('/')}` };
  const guess = genitiveCandidates(w)[0];
  return {
    word, nominative: word, suggest: guess ? cap(guess) : word, changed: false, confidence: 'uncertain',
    note: guess ? `unknown name, maybe ${cap(guess)}` : 'unknown word (surname or other text?)',
  };
}

/**
 * Convert the parent part after every бен/бат (outside parentheses) of a Russian board name.
 * @returns {null | { name, newName, proposedName, changes: [{from,to}], uncertain, note }}
 */
const TAIL_RE = /(^|[\s,(])(бен|бат)(\s+)([^(),]+)/gi;
function proposeNominativeParents(person = {}) {
  const name = String(person.name || '');
  if (!name.trim() || /[\u0590-\u05FF]/.test(name)) return null;
  let proposed = '';
  let suggested = '';
  let last = 0;
  const changes = [];
  const notes = [];
  let m;
  TAIL_RE.lastIndex = 0;
  while ((m = TAIL_RE.exec(name))) {
    // Parentheses are included: «(бат Абрамаса)»; the tail stops at «)», so «(Йосиф)» after it stays.
    const tailStart = m.index + m[1].length + m[2].length + m[3].length;
    const tail = m[4];
    const TOK = /[A-Za-zА-ЯЁа-яё]+(?:-[A-Za-zА-ЯЁа-яё]+)*/g;
    const newTail = tail.replace(TOK, (tok) => {
      if (/^и$/i.test(tok)) return tok;
      const r = nominativeWord(tok);
      if (r.confidence === 'uncertain') notes.push(`«${tok}»: ${r.note}`);
      if (r.changed) changes.push({ from: tok, to: r.nominative });
      return r.nominative;
    });
    const sugTail = tail.replace(TOK, (tok) => (/^и$/i.test(tok) ? tok : (nominativeWord(tok).suggest || nominativeWord(tok).nominative)));
    proposed += name.slice(last, tailStart) + newTail;
    suggested += name.slice(last, tailStart) + sugTail;
    last = tailStart + tail.length;
  }
  proposed += name.slice(last);
  suggested += name.slice(last);
  if (!changes.length && !notes.length) return null;
  const uncertain = notes.length > 0;
  return {
    name, newName: uncertain ? name : proposed, proposedName: uncertain ? suggested : proposed, changes, uncertain, note: notes.join('; '),
  };
}

/** For new input: the father's-name field (Russian) → nominative when clear-cut, else as typed. */
function nominativeFatherField(father) {
  const value = String(father || '');
  if (!/[А-Яа-яЁё]/.test(value) || /[\u0590-\u05FF]/.test(value)) return value;
  return value.replace(/[А-ЯЁа-яё]+(?:-[А-ЯЁа-яё]+)*/g, (tok) => {
    if (/^и$/i.test(tok)) return tok;
    const r = nominativeWord(tok);
    return r.confidence === 'high' ? r.nominative : tok;
  });
}

module.exports = { nominativeWord, proposeNominativeParents, nominativeFatherField, genitiveCandidates, MALE, FEMALE };
