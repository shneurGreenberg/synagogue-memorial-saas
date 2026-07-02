import { buildSidebarApiUrl } from './settings';
import { prepareCommunityEvents } from './announcements';

export async function fetchSidebarPayload(settings, lang) {
  const url = buildSidebarApiUrl(settings, lang);
  if (!url) {
    return null;
  }

  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Server ${response.status}`);
  }

  const payload = await response.json();
  return {
    ...payload,
    communityEvents: prepareCommunityEvents(payload.communityEvents, lang),
  };
}
