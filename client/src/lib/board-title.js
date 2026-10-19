import { DEFAULT_BOARD_TITLES } from '../../../lib/default-board-titles';
import { normalizeDisplayLang, resolveBoardTitleText } from '../../../lib/community-unified-copy';

export function resolveBoardTitle(synagogue, lang) {
  const resolved = resolveBoardTitleText(synagogue);
  if (resolved) {
    return resolved;
  }

  const displayLang = normalizeDisplayLang(lang || synagogue?.language || 'ru');
  return DEFAULT_BOARD_TITLES[displayLang] || DEFAULT_BOARD_TITLES.ru;
}
