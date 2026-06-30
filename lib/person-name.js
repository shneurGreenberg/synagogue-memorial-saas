function extractFamilyName(deceasedName) {
  const trimmed = String(deceasedName || '').trim();
  if (!trimmed) {
    return '';
  }

  const parts = trimmed
    .split(/\s+/)
    .map((part) => part.replace(/[(),]/g, '').trim())
    .filter(Boolean);

  if (!parts.length) {
    return '';
  }

  const hasCyrillic = /[\u0400-\u04FF]/.test(trimmed);
  const hasHebrew = /[\u0590-\u05FF]/.test(trimmed);

  if (hasCyrillic) {
    return parts[0];
  }

  if (hasHebrew) {
    return parts[parts.length - 1];
  }

  return parts[parts.length - 1];
}

module.exports = {
  extractFamilyName,
};
