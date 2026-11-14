/**
 * 1.38.0 I85 safety net: a board that runs for many hours on a TV gets a quiet, automatic page
 * reload (same URL, so the board stays where it is). A reload frees everything the TV browser has
 * piled up (GPU tiles, memory), which is exactly what clears the "background over the clock"
 * glitch by hand.
 *
 * When: at night (02:00–05:00 on the screen's clock) once the page has been up for 1 hour, or at
 * any hour once it has been up for 6 hours. Never while the screen is hidden, offline, someone
 * touched the board in the last 2 minutes, a person's card / prayer / slideshow is open, or inside
 * the admin preview. Before reloading the page is fetched once to be sure the server answers, so
 * a reload can never blank the board. `?softReload=0` turns it off.
 */

export const SOFT_RELOAD_NIGHT_START_HOUR = 2;
export const SOFT_RELOAD_NIGHT_END_HOUR = 5;
export const SOFT_RELOAD_NIGHT_MIN_UPTIME_MS = 60 * 60 * 1000;
export const SOFT_RELOAD_MAX_UPTIME_MS = 6 * 60 * 60 * 1000;
export const SOFT_RELOAD_IDLE_MS = 2 * 60 * 1000;
export const SOFT_RELOAD_CHECK_MS = 60 * 1000;

/** Pure decision. */
export function shouldSoftReload({
  uptimeMs,
  hour,
  hidden = false,
  offline = false,
  sinceInteractionMs = Infinity,
  overlayOpen = false,
  disabled = false,
} = {}) {
  if (disabled || hidden || offline || overlayOpen) return false;
  if (!(sinceInteractionMs >= SOFT_RELOAD_IDLE_MS)) return false;
  const up = Number(uptimeMs) || 0;
  if (up >= SOFT_RELOAD_MAX_UPTIME_MS) return true;
  const night = hour >= SOFT_RELOAD_NIGHT_START_HOUR && hour < SOFT_RELOAD_NIGHT_END_HOUR;
  return night && up >= SOFT_RELOAD_NIGHT_MIN_UPTIME_MS;
}

export function softReloadDisabledByUrl(search) {
  try {
    const value = new URLSearchParams(search || '').get('softReload');
    return value === '0' || value === 'off' || value === 'false';
  } catch (_) {
    return false;
  }
}
