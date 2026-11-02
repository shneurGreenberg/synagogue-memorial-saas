// 1.33.0 audit #1: Content-Security-Policy.
// Admin/master: enforced (blocks scripts from unknown origins, plugins, <base> hijack, framing by other sites).
// Boards/public pages: only a minimal safe baseline is enforced; the full policy runs Report-Only so a
// mistake can never blank a TV board.
const SCRIPT_HOSTS = ['https://code.jquery.com', 'https://cdn.jsdelivr.net', 'https://unpkg.com', 'https://stackpath.bootstrapcdn.com'];
const STYLE_HOSTS = ['https://fonts.googleapis.com', 'https://stackpath.bootstrapcdn.com', 'https://unpkg.com', 'https://cdn.jsdelivr.net'];

function fullPolicy({ framing }) {
  const d = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${SCRIPT_HOSTS.join(' ')}`,
    `style-src 'self' 'unsafe-inline' ${STYLE_HOSTS.join(' ')}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob:",
    "connect-src 'self' https:",
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  if (framing) d.push("frame-ancestors 'self'");
  return d.join('; ');
}

const ADMIN_POLICY = fullPolicy({ framing: true });
const PUBLIC_REPORT_POLICY = fullPolicy({ framing: false });
const PUBLIC_BASELINE = "object-src 'none'; base-uri 'self'";

function isAdminPath(p) {
  return /^\/(admin|master)(\/|$)/.test(p || '');
}

function cspMiddleware(req, res, next) {
  if (res.getHeader('Content-Security-Policy')) return next();
  if (isAdminPath(req.path)) {
    res.setHeader('Content-Security-Policy', ADMIN_POLICY);
  } else {
    res.setHeader('Content-Security-Policy', PUBLIC_BASELINE);
    res.setHeader('Content-Security-Policy-Report-Only', PUBLIC_REPORT_POLICY);
  }
  return next();
}

module.exports = { cspMiddleware, ADMIN_POLICY, PUBLIC_REPORT_POLICY, PUBLIC_BASELINE, isAdminPath };
