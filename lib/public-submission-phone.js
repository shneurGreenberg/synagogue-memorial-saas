const PUBLIC_PHONE_DIAL_OPTIONS = [
  { dial: '+7', label: '+7', country: 'RU' },
  { dial: '+972', label: '+972', country: 'IL' },
  { dial: '+375', label: '+375', country: 'BY' },
  { dial: '+380', label: '+380', country: 'UA' },
  { dial: '+1', label: '+1', country: 'US' },
  { dial: '+44', label: '+44', country: 'GB' },
  { dial: '+49', label: '+49', country: 'DE' },
  { dial: '+33', label: '+33', country: 'FR' },
  { dial: '+39', label: '+39', country: 'IT' },
  { dial: '+34', label: '+34', country: 'ES' },
];

const DIAL_SORTED = [...PUBLIC_PHONE_DIAL_OPTIONS].sort((a, b) => b.dial.length - a.dial.length);

function normalizeDialCode(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    return '';
  }
  const withPlus = value.startsWith('+') ? value : `+${value.replace(/\D/g, '')}`;
  const match = DIAL_SORTED.find((entry) => withPlus.startsWith(entry.dial));
  return match ? match.dial : withPlus;
}

function defaultDialForSynagogue(synagogue) {
  const lang = synagogue && synagogue.language;
  if (lang === 'he') {
    return '+972';
  }
  if (lang === 'en') {
    return '+1';
  }
  return '+7';
}

function nationalDigitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '');
}

function formatPhoneE164(dialCode, nationalNumber) {
  const dial = normalizeDialCode(dialCode);
  const digits = nationalDigitsOnly(nationalNumber);
  if (!dial || !digits) {
    return '';
  }
  return `${dial}${digits}`;
}

function parsePhoneE164(e164) {
  const value = String(e164 || '').trim();
  if (!value) {
    return { dial: '', national: '', e164: '' };
  }
  const normalized = value.startsWith('+') ? value : `+${nationalDigitsOnly(value)}`;
  const match = DIAL_SORTED.find((entry) => normalized.startsWith(entry.dial));
  if (!match) {
    return { dial: '', national: nationalDigitsOnly(normalized), e164: normalized };
  }
  const national = normalized.slice(match.dial.length);
  return {
    dial: match.dial,
    national,
    e164: `${match.dial}${national}`,
  };
}

function resolvePhoneFromBody(body) {
  const source = body || {};
  const explicit = String(source.contactPhone || '').trim();
  const dial = normalizeDialCode(source.contactPhoneDial || source.contactPhoneCountry);
  const national = String(source.contactPhoneNational || '').trim();

  if (dial && national) {
    return formatPhoneE164(dial, national);
  }

  if (explicit.startsWith('+')) {
    return parsePhoneE164(explicit).e164;
  }

  return explicit;
}

function resolvePublicSubmissionPhonePlaceholder(synagogueLang, formLang) {
  const communityLang = ['he', 'ru', 'en'].includes(synagogueLang) ? synagogueLang : 'ru';
  const lang = ['he', 'ru', 'en'].includes(formLang) ? formLang : communityLang;

  if (lang === 'he' || communityLang === 'he') {
    return '501234567';
  }
  if (lang === 'ru' || communityLang === 'ru') {
    return '9001234567';
  }
  if (communityLang === 'he') {
    return '501234567';
  }
  return '9001234567';
}

function buildPhoneFieldContext(synagogue, query) {
  const defaultDial = defaultDialForSynagogue(synagogue);
  const parsed = parsePhoneE164(query.contactPhone || '');
  const dial = parsed.dial || defaultDial;
  const national = parsed.national || (parsed.e164 && !parsed.dial ? parsed.e164 : '');
  return {
    phoneDialOptions: PUBLIC_PHONE_DIAL_OPTIONS,
    contactPhoneDial: dial,
    contactPhoneNational: national,
    contactPhoneE164: parsed.e164 || formatPhoneE164(dial, national),
  };
}

module.exports = {
  PUBLIC_PHONE_DIAL_OPTIONS,
  defaultDialForSynagogue,
  formatPhoneE164,
  parsePhoneE164,
  resolvePhoneFromBody,
  resolvePublicSubmissionPhonePlaceholder,
  buildPhoneFieldContext,
};
