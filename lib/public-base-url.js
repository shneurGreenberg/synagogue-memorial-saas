const DEFAULT_PUBLIC_BASE_URL = 'https://synagogue-kadish-waw-shneur.waw0.amvera.tech';

const RUSSIAN_TIMEZONES = new Set([
  'Europe/Moscow',
  'Europe/Kaliningrad',
  'Europe/Samara',
  'Europe/Volgograd',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Barnaul',
  'Asia/Tomsk',
  'Asia/Novokuznetsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Chita',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Sakhalin',
  'Asia/Kamchatka',
  'Asia/Anadyr',
  'Asia/Srednekolymsk',
  'Asia/Khandyga',
  'Asia/Ust-Nera',
  'Europe/Astrakhan',
  'Europe/Saratov',
  'Europe/Ulyanovsk',
  'Europe/Kirov',
]);

function stripTrailingSlashes(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function resolvePublicBaseUrl(env = process.env) {
  const raw = stripTrailingSlashes(env.PUBLIC_BASE_URL);
  if (raw) {
    return raw;
  }
  return DEFAULT_PUBLIC_BASE_URL;
}

function resolveIntlBaseUrl(env = process.env) {
  const intl = stripTrailingSlashes(env.PUBLIC_BASE_URL_INTL);
  if (intl) {
    return intl;
  }
  return resolvePublicBaseUrl(env);
}

function resolveRuBaseUrl(env = process.env) {
  return stripTrailingSlashes(env.PUBLIC_BASE_URL_RU);
}

function isRussianTimezone(timezone) {
  return RUSSIAN_TIMEZONES.has(String(timezone || '').trim());
}

function normalizePublicLinkRegion(value) {
  const region = String(value || '').trim();
  if (region === 'ru' || region === 'intl' || region === 'auto') {
    return region;
  }
  return 'auto';
}

function resolveCommunityBaseUrl(community, env = process.env) {
  const intl = resolveIntlBaseUrl(env);
  const ru = resolveRuBaseUrl(env);
  if (!ru) {
    return intl;
  }
  const region = normalizePublicLinkRegion(community && community.publicLinkRegion);
  if (region === 'ru') {
    return ru;
  }
  if (region === 'intl') {
    return intl;
  }
  const timezone = community && community.location ? community.location.timezone : '';
  if (isRussianTimezone(timezone)) {
    return ru;
  }
  return intl;
}

function communityPublicPath(slug, subPath = '', env = process.env, community = null) {
  const base = community ? resolveCommunityBaseUrl(community, env) : resolvePublicBaseUrl(env);
  const pathPart = String(subPath || '').replace(/^\/+/, '');
  return pathPart ? `${base}/s/${slug}/${pathPart}` : `${base}/s/${slug}`;
}

module.exports = {
  DEFAULT_PUBLIC_BASE_URL,
  RUSSIAN_TIMEZONES,
  resolvePublicBaseUrl,
  resolveIntlBaseUrl,
  resolveRuBaseUrl,
  resolveCommunityBaseUrl,
  normalizePublicLinkRegion,
  isRussianTimezone,
  communityPublicPath,
};
