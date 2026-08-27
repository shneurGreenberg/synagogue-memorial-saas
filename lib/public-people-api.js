const { buildPhotoUrl, buildPhotoThumbUrl } = require('./photo-url');
const { toPublicPersonPayload } = require('./public-board');
const { hebrewDateFromGregorian } = require('./yahrzeit');

const PHOTO_THUMB_WIDTH = 256;

const PUBLIC_PERSON_KEYS = [
  'id',
  'name',
  'title',
  'text',
  'gregorianDateOfDeath',
  'hebrewDateOfDeath',
  'photo',
  'photoUrl',
  'photoThumbUrl',
  'photoCrop',
  'cardUrl',
];

function configuredPublicOrigin() {
  return String(process.env.PUBLIC_ORIGIN || '').trim().replace(/\/+$/, '');
}

function getPublicOrigin(req) {
  const configured = configuredPublicOrigin();
  if (configured) {
    return configured;
  }

  if (!req || typeof req.get !== 'function') {
    return '';
  }

  const forwardedProto = String(req.get('X-Forwarded-Proto') || '')
    .split(',')[0]
    .trim();
  const proto = forwardedProto || req.protocol || 'http';
  const forwardedHost = String(req.get('X-Forwarded-Host') || '')
    .split(',')[0]
    .trim();
  const host = forwardedHost || String(req.get('Host') || '').trim();

  if (!host) {
    return '';
  }

  return `${proto}://${host}`;
}

function absoluteUrl(origin, path) {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!origin) {
    return normalized;
  }

  return `${origin}${normalized}`;
}

function toEmbedPerson(person, { origin = '', slug = '' } = {}) {
  const publicPerson = toPublicPersonPayload(person);
  const photoPath = buildPhotoUrl(publicPerson.photo);
  const thumbPath = publicPerson.photo
    ? buildPhotoThumbUrl(publicPerson.photo, PHOTO_THUMB_WIDTH)
    : '';
  const cardPath = slug && publicPerson.id != null
    ? `/s/${encodeURIComponent(slug)}/card/${encodeURIComponent(publicPerson.id)}`
    : '';

  return {
    id: publicPerson.id,
    name: publicPerson.name || '',
    title: publicPerson.title || '',
    text: publicPerson.text || '',
    gregorianDateOfDeath: publicPerson.gregorianDateOfDeath || null,
    hebrewDateOfDeath: hebrewDateFromGregorian(publicPerson.gregorianDateOfDeath),
    photo: publicPerson.photo || '',
    photoUrl: absoluteUrl(origin, photoPath),
    photoThumbUrl: absoluteUrl(origin, thumbPath),
    photoCrop: publicPerson.photoCrop || null,
    cardUrl: absoluteUrl(origin, cardPath),
  };
}

function toEmbedPeoplePayload(synagogue, { origin = '' } = {}) {
  const people = Array.isArray(synagogue && synagogue.people)
    ? synagogue.people.map((person) => toEmbedPerson(person, {
      origin,
      slug: synagogue.slug,
    }))
    : [];

  return {
    synagogue: {
      slug: synagogue && synagogue.slug ? synagogue.slug : '',
      name: (synagogue && synagogue.name) || '',
      title: (synagogue && synagogue.title) || '',
      language: (synagogue && synagogue.language) || 'ru',
    },
    count: people.length,
    people,
  };
}

module.exports = {
  PHOTO_THUMB_WIDTH,
  PUBLIC_PERSON_KEYS,
  configuredPublicOrigin,
  getPublicOrigin,
  absoluteUrl,
  toEmbedPerson,
  toEmbedPeoplePayload,
};
