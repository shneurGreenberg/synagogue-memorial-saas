/* 1.31.0 I23: editable, gender-aware yahrzeit message templates.
 * Template syntax: {salutation} {deceased} {community} {donationLine} and gendered pairs {male|female}.
 * Unknown gender renders "male/female" style (e.g. "שלו/שלה"). */

const GENDER_PAIRS = {
  he: [['שלו', 'שלה'], ['נשמתו', 'נשמתה'], ['זכרו', 'זכרה'], ['אותו', 'אותה'], ['הנפטר', 'הנפטרת'], ['נפטר', 'נפטרה'], ['אביו', 'אביה']],
  en: [['his', 'her'], ['him', 'her'], ['he', 'she']],
  ru: [['него', 'неё'], ['его', 'её'], ['он', 'она'], ['ушедшего', 'ушедшей']],
};

const DEFAULT_TEMPLATES = {
  he: {
    regular: '{salutation},\n\nהיום ב{community}בית הכנסת הזכרנו את {deceased} לתפילה לרגל יום השנה {שלו|שלה}. נזכרנו את {נשמתו|נשמתה} בתפילה ובקדיש, ומבקשים כי {זכרו|זכרה} יהיה לברכה.\n\n{donationLine}',
    missed: '{salutation},\n\nבשבוע האחרון, ביום השנה של {deceased}, זכרנו {אותו|אותה} בתפילה{communityAt}. נזכרנו את {נשמתו|נשמתה} בתפילה ובקדיש, ומבקשים כי {זכרו|זכרה} יהיה לברכה.\n\n{donationLine}',
  },
  en: {
    regular: '{salutation},\n\nToday at {communityOr} we remembered {deceased} in prayer on the occasion of {his|her} yahrzeit. We prayed for the elevation of {his|her} soul and that {his|her} memory be for a blessing.\n\n{donationLine}',
    missed: '{salutation},\n\nEarlier this week, on the yahrzeit of {deceased}, we remembered {him|her} in prayer{communityAt}. We prayed for the elevation of {his|her} soul and that {his|her} memory be for a blessing.\n\n{donationLine}',
  },
  ru: {
    regular: '{salutation},\n\nСегодня в {communityOr} мы помянули {deceased} в молитве в день годовщины кончины. Мы молились об упокоении души и о том, чтобы память о {нем|ней} была благословением.\n\n{donationLine}',
    missed: '{salutation},\n\nНа этой неделе, в день годовщины {deceased}, мы помянули {его|её} в молитве{communityAt}. Мы молились об упокоении души и о том, чтобы память о {нем|ней} была благословением.\n\n{donationLine}',
  },
};

function donationLine(lang, url) {
  if (lang === 'he') return url ? `נהוג ביום השנה לתת צדקה לעילוי נשמת הנפטר. ניתן לתרום כאן: ${url}` : 'נהוג ביום השנה לתת צדקה לעילוי נשמת הנפטר.';
  if (lang === 'en') return url ? `It is customary to give charity on a yahrzeit. You may contribute here: ${url}` : 'It is customary to give charity on a yahrzeit for the elevation of the soul.';
  return url ? `В день годовщины принято давать цдаку. Пожертвование можно сделать по ссылке: ${url}` : 'В день годовщины принято давать цдаку для вознесения души.';
}

/** Gender of the deceased: explicit field, else inferred from "בן/בת", "ben/bat", Russian patronymic. */
function inferDeceasedGender(person) {
  const g = String((person && person.gender) || '').toLowerCase();
  if (g === 'male' || g === 'female') return g;
  const name = ` ${String((person && person.name) || '').toLowerCase()} `;
  if (/[\s"״'](בת|bat|бат)\s/.test(name) || /\s(ז"ל|ע"ה)?\s*בת\s/.test(name)) return 'female';
  if (/[\s"״'](בן|ben|бен)\s/.test(name)) return 'male';
  if (/(овна|евна|ична|инична)\s/.test(name)) return 'female';
  if (/(ович|евич|ич)\s/.test(name)) return 'male';
  return '';
}

function renderGendered(text, gender) {
  return String(text || '').replace(/\{([^{}|]+)\|([^{}|]+)\}/g, (_, m, f) => {
    if (gender === 'male') return m;
    if (gender === 'female') return f;
    return `${m}/${f}`;
  });
}

function renderTemplate(template, vars, gender) {
  const filled = String(template || '').replace(/\{(salutation|deceased|community|communityAt|communityOr|donationLine)\}/g,
    (_, k) => (vars[k] != null ? vars[k] : ''));
  return renderGendered(filled, gender);
}

function templateVars({ lang, salutation, deceasedName, synagogueName, donationUrl }) {
  const c = synagogueName || '';
  return {
    salutation,
    deceased: deceasedName || '',
    community: c ? `${c} ` : '',
    communityAt: c ? (lang === 'he' ? ` ב${c}` : lang === 'en' ? ` at ${c}` : ` в ${c}`) : '',
    communityOr: c || (lang === 'en' ? 'our synagogue' : 'нашей общине'),
    donationLine: donationLine(lang, donationUrl),
  };
}

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Turn an admin-edited, rendered message back into a reusable, gender-neutral template. */
function toTemplate(message, { lang, vars, gender }) {
  let t = String(message || '').replace(/\r\n/g, '\n');
  const order = ['donationLine', 'salutation', 'deceased'];
  order.forEach((k) => {
    const v = vars[k];
    if (v && v.length > 1) t = t.split(v).join(`{${k}}`);
  });
  if (vars.communityOr && vars.communityOr.length > 1) t = t.split(vars.communityOr).join('{communityOr}');
  const pairs = GENDER_PAIRS[lang] || [];
  // Slash forms first ("שלו/שלה", "שלו/ה"), then the word of the current gender.
  pairs.forEach(([m, f]) => {
    const token = `{${m}|${f}}`;
    t = t.replace(new RegExp(`${escapeRe(m)}/${escapeRe(f)}|${escapeRe(m)}/ה(?![\\u0590-\\u05FF])`, 'g'), token);
    const word = gender === 'female' ? f : gender === 'male' ? m : '';
    if (!word) return;
    const re = new RegExp(`(^|[^\\p{L}{|])${escapeRe(word)}(?=$|[^\\p{L}|}])`, 'gu');
    t = t.replace(re, (all, pre) => `${pre}${token}`);
  });
  return t.slice(0, 4000);
}

function getTemplate(synagogue, lang, kind) {
  const saved = synagogue && synagogue.yahrzeitMessageTemplates && synagogue.yahrzeitMessageTemplates[lang];
  const own = saved && typeof saved[kind] === 'string' && saved[kind].trim() ? saved[kind] : '';
  return own || (DEFAULT_TEMPLATES[lang] || DEFAULT_TEMPLATES.ru)[kind];
}

module.exports = {
  DEFAULT_TEMPLATES, GENDER_PAIRS, inferDeceasedGender, renderTemplate, renderGendered, templateVars, toTemplate, getTemplate, donationLine,
};
