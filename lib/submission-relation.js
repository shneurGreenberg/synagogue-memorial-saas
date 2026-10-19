const RELATION_KEYS = [
  'av',
  'em',
  'baal',
  'esha',
  'ben',
  'bat',
  'ach',
  'achot',
  'saba',
  'savta',
  'other',
];

const RELATION_LABELS = {
  he: {
    av: 'אב',
    em: 'אם',
    baal: 'בעל',
    esha: 'אשה',
    ben: 'בן',
    bat: 'בת',
    ach: 'אח',
    achot: 'אחות',
    saba: 'סבא',
    savta: 'סבתא',
    other: 'אחר',
  },
  ru: {
    av: 'отец',
    em: 'мать',
    baal: 'муж',
    esha: 'жена',
    ben: 'сын',
    bat: 'дочь',
    ach: 'брат',
    achot: 'сестра',
    saba: 'дедушка',
    savta: 'бабушка',
    other: 'другое',
  },
  en: {
    av: 'father',
    em: 'mother',
    baal: 'husband',
    esha: 'wife',
    ben: 'son',
    bat: 'daughter',
    ach: 'brother',
    achot: 'sister',
    saba: 'grandfather',
    savta: 'grandmother',
    other: 'other',
  },
};

function normalizeLang(lang) {
  return ['he', 'ru', 'en'].includes(lang) ? lang : 'ru';
}

function getRelationOptions(lang) {
  const safe = normalizeLang(lang);
  const table = RELATION_LABELS[safe] || RELATION_LABELS.ru;
  return RELATION_KEYS.map((value) => ({
    value,
    label: table[value] || value,
  }));
}

function normalizeRelationKey(raw) {
  const key = String(raw || '').trim().toLowerCase();
  return RELATION_KEYS.includes(key) ? key : '';
}

function formatRelationLabel(relationKey, relationOther, lang) {
  const key = normalizeRelationKey(relationKey);
  if (!key) {
    return String(relationOther || '').trim().slice(0, 120);
  }
  if (key === 'other') {
    const other = String(relationOther || '').trim().slice(0, 120);
    return other || (RELATION_LABELS[normalizeLang(lang)] || RELATION_LABELS.ru).other;
  }
  const table = RELATION_LABELS[normalizeLang(lang)] || RELATION_LABELS.ru;
  return table[key] || key;
}

function parseRelationFromBody(fields, lang) {
  const relationKey = normalizeRelationKey(fields && fields.relationKey);
  const relationOther = String((fields && fields.relationOther) || '').trim().slice(0, 120);
  const relation = formatRelationLabel(relationKey, relationOther, lang);
  return { relationKey, relationOther, relation };
}

module.exports = {
  RELATION_KEYS,
  getRelationOptions,
  normalizeRelationKey,
  formatRelationLabel,
  parseRelationFromBody,
};
