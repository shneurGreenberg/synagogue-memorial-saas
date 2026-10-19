const RETURN_TO_TEXT_PATTERNS = [
  /\(\s*Вернуться к тексту\s*\)/gi,
  /\(\s*Return to text\s*\)/gi,
  /\bReturn to text\b/gi,
  /\(\s*חזרה לטקסט\s*\)/g,
];

const SOURCE_REF_PATTERNS = [
  /\s*Сравните\s+[A-Za-z\u0590-\u05FF][^.;]{0,80}:\s*\d*[^.;]*/gi,
  /\s*Compare\s+[A-Za-z][^.;]{0,80}:\s*\d*[^.;]*/gi,
  /\s*Cf\.?\s+[A-Za-z][^.;]{0,60}:\s*\d+[^.;]*/gi,
  /\s*See\s+[A-Za-z][^.;]{0,60}:\s*\d+[^.;]*/gi,
];

const FOOTNOTE_PATTERNS = [
  /\(\s*Footnotes?\s*\d*\s*\)/gi,
  /\bFootnotes?\s*\d*\b/gi,
  /\[\s*\d+\s*\]/g,
  /(?:^|\s)\(\s*\d{1,2}\s*\)(?=\s|$)/g,
  /(?:^|\s)\*\s*\d{1,2}(?=\s|$)/g,
];

function sanitizeHayomYomText(text) {
  let cleaned = String(text || '');

  RETURN_TO_TEXT_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, ' ');
  });

  SOURCE_REF_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, ' ');
  });

  FOOTNOTE_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, ' ');
  });

  return cleaned
    .replace(/\s+/g, ' ')
    .replace(/\s+([.!?,:;])/g, '$1')
    .replace(/([.!?])\s*([.!?])+/g, '$1')
    .trim();
}

module.exports = {
  sanitizeHayomYomText,
};
