const Synagogue = require('../models/Synagogue');
const { normalizeBoardFeatures } = require('./board-features');
const { normalizePublicSubmission } = require('./public-submission');
const { normalizeTitles } = require('./admin-theme');
const { getBoardCache, setBoardCache } = require('./board-cache');
const {
  applyBoardSynagogueProjection,
  BOARD_LITE_SELECT,
} = require('./board-synagogue-projection');
const { loadPeopleTextFingerprint } = require('./board-people-text');

function normalizeLoadedBoard(slug, synagogue) {
  synagogue.baseUrl = `/s/${slug}`;
  const { normalizeSynagogueLocation } = require('./normalize-location');
  synagogue.location = normalizeSynagogueLocation(synagogue.location);
  synagogue.titles = normalizeTitles(synagogue);
  synagogue.title = synagogue.titles.ru || synagogue.title || synagogue.name || '';
  synagogue.boardFeatures = normalizeBoardFeatures(synagogue.boardFeatures);
  synagogue.publicSubmission = normalizePublicSubmission(synagogue.publicSubmission, synagogue.provisioning);
  const { memorialQrPanelForBoard } = require('./memorial-qr-panel');
  const { normalizeFontScales, normalizeLogoBackground } = require('./theme-typography');
  const { normalizeBoardFont } = require('./board-fonts');
  const { normalizeFontScaleBaselines } = require('./typography-baseline');
  synagogue.memorialQrPanel = memorialQrPanelForBoard(synagogue.memorialQrPanel);
  synagogue.theme = synagogue.theme || {};
  synagogue.theme.fontScales = normalizeFontScales(synagogue.theme.fontScales);
  synagogue.theme.fontScaleBaselines = normalizeFontScaleBaselines(synagogue.theme.fontScaleBaselines);
  const { normalizeCandlePalette } = require('./candle-palette');
  synagogue.theme.candlePalette = normalizeCandlePalette(synagogue.theme.candlePalette);
  synagogue.theme.logoBackground = normalizeLogoBackground(synagogue.theme.logoBackground);
  synagogue.theme.boardFont = normalizeBoardFont(synagogue.theme.boardFont);
  const { normalizeThemeBorders } = require('./theme-borders');
  Object.assign(synagogue.theme, normalizeThemeBorders(synagogue.theme));

  if (synagogue.slideshow && Array.isArray(synagogue.slideshow.images)) {
    synagogue.slideshow.images = synagogue.slideshow.images.map((slide, index) => {
      if (slide && !slide._id && !slide.id) {
        return { ...slide, id: `slide-${index}` };
      }
      return slide;
    });
  }

  return synagogue;
}

async function loadSynagogueBoard(slug, options = {}) {
  const includePeopleText = options.includePeopleText === true;
  const cached = getBoardCache(slug);

  if (cached && (!includePeopleText || cached.__hasPeopleText)) {
    return cached;
  }

  let query = Synagogue.findOne({ slug });
  query = applyBoardSynagogueProjection(query, { includePeopleText });
  const synagogue = await query.lean();

  if (!synagogue) {
    return null;
  }

  normalizeLoadedBoard(slug, synagogue);

  if (includePeopleText) {
    synagogue.__hasPeopleText = true;
  } else {
    synagogue.__peopleTextFingerprint = await loadPeopleTextFingerprint(slug);
  }

  setBoardCache(slug, synagogue);
  return synagogue;
}

async function loadSynagogueLocation(slug) {
  const lite = await loadSynagogueLite(slug);
  return lite ? lite.location : null;
}

async function loadSynagogueLite(slug) {
  const cached = getBoardCache(slug);
  if (cached && cached.location) {
    return {
      slug: cached.slug,
      location: cached.location,
      language: cached.language || 'ru',
    };
  }

  const doc = await Synagogue.findOne({ slug }).select(BOARD_LITE_SELECT).lean();
  if (!doc) {
    return null;
  }

  const { normalizeSynagogueLocation } = require('./normalize-location');
  return {
    slug: doc.slug,
    location: normalizeSynagogueLocation(doc.location),
    language: doc.language || 'ru',
  };
}

module.exports = {
  loadSynagogueBoard,
  loadSynagogueLocation,
  loadSynagogueLite,
};
