const { translateLearningLine } = require('./jewish-translations');

function mapSefariaLabel(item, lang) {
  if (!item) {
    return '';
  }

  const display = item.displayValue || {};
  if (lang === 'he' && display.he) {
    return display.he;
  }

  return display.en || display.he || '';
}

function resolveDailyChumashLabel({
  lessons5786Chumash,
  hayomYomChumashLabel,
  chokLeYisraelSefaria,
  lang,
}) {
  const from5786 = String(lessons5786Chumash || '').trim();
  if (from5786) {
    return translateLearningLine(from5786, lang);
  }

  const fromHayomYom = String(hayomYomChumashLabel || '').trim();
  if (fromHayomYom) {
    return fromHayomYom;
  }

  const fromSefaria = mapSefariaLabel(chokLeYisraelSefaria, lang === 'he' ? 'he' : 'en');
  if (fromSefaria) {
    return translateLearningLine(fromSefaria, lang);
  }

  return '';
}

module.exports = {
  mapSefariaLabel,
  resolveDailyChumashLabel,
};
