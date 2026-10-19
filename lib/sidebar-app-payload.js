const { getJewishFeed } = require('./jewish-feed');
const { resolvePublishedVersion } = require('./board-publish');
const { getVisibleCommunityEvents } = require('./community-events');
const { normalizeBoardFeatures } = require('./board-features');
const { BOARD_THEME_DEFAULTS } = require('./board-defaults');
const { resolveBoardTitleText } = require('./community-unified-copy');

async function buildSidebarAppPayload(synagogue, lang = 'ru') {
  const boardFeatures = normalizeBoardFeatures(synagogue.boardFeatures);
  const theme = synagogue.theme || {};
  const jewishFeed = await getJewishFeed(lang, synagogue);

  return {
    slug: synagogue.slug,
    publishedVersion: resolvePublishedVersion(synagogue.publishedVersion),
    title: resolveBoardTitleText(synagogue) || synagogue.title || synagogue.name || '',
    boardTitleText: resolveBoardTitleText(synagogue),
    language: synagogue.language || 'ru',
    location: synagogue.location || {},
    shabbatTimesEnabled: synagogue.shabbatTimesEnabled !== false,
    boardFeatures: {
      officialLogo: boardFeatures.officialLogo !== false,
      upcomingHolidays: boardFeatures.upcomingHolidays !== false,
      communityEvents: boardFeatures.communityEvents !== false,
      weather: boardFeatures.weather !== false,
    },
    theme: {
      primaryColor: theme.primaryColor || BOARD_THEME_DEFAULTS.primaryColor,
      textColor: theme.textColor || BOARD_THEME_DEFAULTS.textColor,
      accentColor: theme.accentColor || BOARD_THEME_DEFAULTS.accentColor,
    },
    dailyCites: synagogue.dailyCites || [],
    communityEvents: getVisibleCommunityEvents(synagogue.communityEvents || []),
    upcomingHolidays: jewishFeed.upcomingHolidays || [],
    chabadDates: jewishFeed.chabadDates || [],
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildSidebarAppPayload,
};
