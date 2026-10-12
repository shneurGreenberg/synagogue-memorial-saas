const { performance } = require('perf_hooks');

function isAdminTimingEnabled() {
  const v = process.env.ADMIN_TIMING;
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * @param {import('express').Response} res
 * @param {string} routeLabel
 */
function createAdminTiming(res, routeLabel) {
  const enabled = isAdminTimingEnabled();
  const startedAt = performance.now();
  const marks = [{ name: 'start', at: startedAt }];

  return {
    mark(name) {
      if (!enabled) return;
      marks.push({ name, at: performance.now() });
    },
    finish() {
      if (!enabled) return;
      const segments = [];
      for (let i = 1; i < marks.length; i += 1) {
        const dur = marks[i].at - marks[i - 1].at;
        segments.push(`${marks[i].name};dur=${dur.toFixed(1)}`);
      }
      const total = performance.now() - startedAt;
      segments.push(`total;dur=${total.toFixed(1)}`);
      const header = segments.join(', ');
      try {
        res.setHeader('Server-Timing', header);
      } catch (err) {
        // ignore if headers already sent
      }
      console.log(`[admin-timing] ${routeLabel}: ${header}`);
    },
  };
}

module.exports = {
  isAdminTimingEnabled,
  createAdminTiming,
};
