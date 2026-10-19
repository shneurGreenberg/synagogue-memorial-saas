function combineDeceasedDisplayName(surname, firstName) {
  const family = String(surname || '').trim();
  const given = String(firstName || '').trim();
  if (family && given) {
    return `${family} ${given}`.trim();
  }
  return family || given || '';
}

function splitDeceasedDisplayName(fullName) {
  const value = String(fullName || '').trim();
  if (!value) {
    return { surname: '', firstName: '' };
  }
  const space = value.indexOf(' ');
  if (space === -1) {
    return { surname: value, firstName: '' };
  }
  return {
    surname: value.slice(0, space).trim(),
    firstName: value.slice(space + 1).trim(),
  };
}

module.exports = {
  combineDeceasedDisplayName,
  splitDeceasedDisplayName,
};
