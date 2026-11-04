/**
 * 1.34.0 I53: a lightweight daily check that lives inside the running Node app.
 *
 * Rules it must obey:
 *  - never fire during the first seconds after boot (a deploy must not blast notifications);
 *  - run at most once per local day per community (the guard lives in yahrzeit-push.js);
 *  - be trivially disableable (`DISABLE_PUSH_SCHEDULER=1`) and never crash the app.
 */

const DEFAULT_CHECK_INTERVAL_MS = 15 * 60 * 1000; // look every 15 minutes
const DEFAULT_START_DELAY_MS = 90 * 1000;         // first look 90s after boot

function isSchedulerDisabled(env = process.env) {
  const raw = String(env.DISABLE_PUSH_SCHEDULER || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function resolveIntervalMs(env = process.env) {
  const n = Number(env.PUSH_SCHEDULER_INTERVAL_MS);
  if (Number.isFinite(n) && n >= 60 * 1000) return n;
  return DEFAULT_CHECK_INTERVAL_MS;
}

/**
 * Run the two daily channels once, each isolated from the other's failure.
 * Exported so the once-a-day email + push behaviour can be tested without a database.
 */
async function runDailyChecks({ now = new Date(), sendPush = null, sendEmail = null, logger = console } = {}) {
  const result = { push: null, email: null };

  if (typeof sendPush === 'function') {
    try {
      result.push = await sendPush(now);
    } catch (err) {
      logger.warn('[push] daily push check failed:', err && err.message ? err.message : err);
    }
  }

  if (typeof sendEmail === 'function') {
    try {
      result.email = await sendEmail(now);
    } catch (err) {
      logger.warn('[push] daily email check failed:', err && err.message ? err.message : err);
    }
  }

  return result;
}

/**
 * Start the scheduler. Returns a handle with `stop()`; a disabled scheduler returns a no-op handle
 * so callers never branch.
 */
function startPushScheduler({
  env = process.env,
  now = () => new Date(),
  run = null,
  logger = console,
  startDelayMs = DEFAULT_START_DELAY_MS,
  intervalMs = null,
} = {}) {
  const disabled = isSchedulerDisabled(env);
  if (disabled) {
    return { enabled: false, stop() {}, runNow: async () => null };
  }

  const every = intervalMs || resolveIntervalMs(env);
  let timer = null;
  let stopped = false;

  // One tick = both daily channels. Each channel is isolated: a broken email must never stop push,
  // and a broken push must never stop the email.
  const runDefault = () => runDailyChecks({
    now: now(),
    logger,
    sendPush: async (moment) => {
      const { isWebPushConfigured } = require('./web-push');
      if (!isWebPushConfigured()) return null; // no keys: nothing to do, and no warning spam
      const { sendDailyYahrzeitPush } = require('./yahrzeit-push');
      return sendDailyYahrzeitPush({ now: moment });
    },
    sendEmail: async (moment) => {
      // 1.34.0: before this the daily email reminder had no runner at all — it only fired when
      // somebody ran scripts/send-yahrzeit-reminders.js by hand.
      const { sendDailyYahrzeitReminders } = require('./yahrzeit-reminders');
      return sendDailyYahrzeitReminders({ now: moment });
    },
  });

  const runOnce = async () => {
    if (stopped) return null;
    try {
      return await (run ? run() : runDefault());
    } catch (err) {
      // A scheduler problem must never take the server down.
      logger.warn('[push] daily check failed:', err && err.message ? err.message : err);
      return null;
    }
  };

  // First run is deliberately delayed: a container that restarts in a loop must not notify anyone.
  const startTimer = setTimeout(() => {
    if (stopped) return;
    runOnce();
    timer = setInterval(runOnce, every);
    if (timer.unref) timer.unref();
  }, Math.max(1000, startDelayMs));
  if (startTimer.unref) startTimer.unref();

  return {
    enabled: true,
    intervalMs: every,
    startDelayMs,
    runNow: runOnce,
    stop() {
      stopped = true;
      clearTimeout(startTimer);
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}

module.exports = {
  DEFAULT_CHECK_INTERVAL_MS,
  runDailyChecks,
  DEFAULT_START_DELAY_MS,
  isSchedulerDisabled,
  resolveIntervalMs,
  startPushScheduler,
};
