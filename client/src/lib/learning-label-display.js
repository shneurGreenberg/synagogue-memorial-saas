import { sanitizeRussianLearningText } from '../../../lib/russian-learning-sanitize.js';

export function formatLearningLabelForDisplay(label, lang) {
  const value = String(label || '').trim();
  if (!value) {
    return '';
  }
  if (lang === 'ru') {
    return sanitizeRussianLearningText(value);
  }
  return value;
}
