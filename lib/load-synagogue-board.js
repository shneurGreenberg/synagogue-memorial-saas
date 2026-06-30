const Synagogue = require('../models/Synagogue');
const { normalizeBoardFeatures } = require('./board-features');
const { normalizePublicSubmission } = require('./public-submission');
const { normalizeTitles } = require('./admin-theme');
const { getBoardCache, setBoardCache } = require('./board-cache');

async function loadSynagogueBoard(slug) {
  const cached = getBoardCache(slug);
  if (cached) {
    return cached;
  }

  const synagogue = await Synagogue.findOne({ slug }).lean();

  if (!synagogue) {
    return null;
  }

  synagogue.baseUrl = `/s/${slug}`;
  const { normalizeSynagogueLocation } = require('./normalize-location');
  synagogue.location = normalizeSynagogueLocation(synagogue.location);
  synagogue.titles = normalizeTitles(synagogue);
  synagogue.title = synagogue.titles.ru || synagogue.title || synagogue.name || '';
  synagogue.boardFeatures = normalizeBoardFeatures(synagogue.boardFeatures);
  synagogue.publicSubmission = normalizePublicSubmission(synagogue.publicSubmission, synagogue.provisioning);
  const { normalizeMemorialQrPanel } = require('./memorial-qr-panel');
  const { normalizeFontScales } = require('./theme-typography');
  const { normalizeFontScaleBaselines } = require('./typography-baseline');
  synagogue.memorialQrPanel = normalizeMemorialQrPanel(synagogue.memorialQrPanel);
  synagogue.theme = synagogue.theme || {};
  synagogue.theme.fontScales = normalizeFontScales(synagogue.theme.fontScales);
  synagogue.theme.fontScaleBaselines = normalizeFontScaleBaselines(synagogue.theme.fontScaleBaselines);
  const { normalizeCandlePalette } = require('./candle-palette');
  synagogue.theme.candlePalette = normalizeCandlePalette(synagogue.theme.candlePalette);

  setBoardCache(slug, synagogue);
  return synagogue;
}

module.exports = {
  loadSynagogueBoard,
};
