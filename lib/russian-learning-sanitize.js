const HEBREW_TEHILLIM = '\u05ea\u05d4\u05d9\u05dc\u05d9\u05dd';

function psalterWordPattern() {
  const stem = String.fromCharCode(0x041f, 0x0441, 0x0430, 0x043b, 0x0442);
  const suffix = String.fromCharCode(0x005b, 0x044b, 0x0438, 0x005d, 0x0440, 0x005b, 0x044c, 0x044a);
  return new RegExp(`${stem}${suffix}[\\w]*`, 'gi');
}

function sanitizeRussianLearningText(text) {
  const value = String(text || '').trim();
  if (!value) {
    return '';
  }

  return value
    .replace(psalterWordPattern(), String.fromCharCode(0x041f, 0x0441, 0x0430, 0x043b, 0x043c, 0x044b))
    .replace(new RegExp(HEBREW_TEHILLIM, 'g'), '')
    .replace(/\s{2,}/g, ' ')
    .replace(/:\s*:/g, ':')
    .trim();
}

module.exports = {
  HEBREW_TEHILLIM,
  sanitizeRussianLearningText,
};
