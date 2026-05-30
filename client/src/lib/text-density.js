export function getNameDensityClass(name) {
  const len = (name || '').trim().length;

  if (len > 48) {
    return 'card-text-dense';
  }

  if (len > 32) {
    return 'card-text-compact';
  }

  return '';
}

export function getBiographyDensityClass(text) {
  const plain = (text || '').replace(/<[^>]+>/g, '').trim();
  const len = plain.length;

  if (len > 1200) {
    return 'inner-text-dense';
  }

  if (len > 500) {
    return 'inner-text-compact';
  }

  return '';
}
