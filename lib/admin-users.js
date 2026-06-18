const { resolveAdminColorMode } = require('./admin-theme');
const { normalizeAdminLang } = require('./admin-locale');

const FULL_ADMIN_PERMISSIONS = {
  settings: true,
  people: true,
  slideshow: true,
  events: true,
  userManagement: true,
};

const PERMISSION_KEYS = ['settings', 'people', 'slideshow', 'events', 'userManagement'];

const PERMISSION_META = [
  { key: 'settings', labelKey: 'perm_settings' },
  { key: 'people', labelKey: 'perm_people' },
  { key: 'slideshow', labelKey: 'perm_slideshow' },
  { key: 'events', labelKey: 'perm_events' },
  { key: 'userManagement', labelKey: 'perm_user_management' },
];

function parseSlugAndUsername(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed.includes('/')) {
    return { slug: trimmed, username: null };
  }

  const parts = trimmed.split('/').map((part) => part.trim()).filter(Boolean);
  return {
    slug: parts[0] || trimmed,
    username: parts[1] || null,
  };
}

function normalizeAdminUsername(name) {
  return String(name || '').trim().toLowerCase();
}

function findAdminUser(synagogue, username) {
  if (!synagogue || !username) {
    return null;
  }

  const normalized = normalizeAdminUsername(username);
  const users = synagogue.adminUsers || [];
  return users.find((user) => normalizeAdminUsername(user.username) === normalized) || null;
}

function resolveAdminPermissions(session, synagogue) {
  if (!session || !session.adminSlug) {
    return null;
  }

  if (!session.adminUsername) {
    return { ...FULL_ADMIN_PERMISSIONS };
  }

  const user = findAdminUser(synagogue, session.adminUsername);
  if (!user) {
    return {
      settings: false,
      people: false,
      slideshow: false,
      events: false,
      userManagement: false,
    };
  }

  const permissions = user.permissions || {};
  return {
    settings: !!permissions.settings,
    people: !!permissions.people,
    slideshow: !!permissions.slideshow,
    events: !!permissions.events,
    userManagement: !!permissions.userManagement,
  };
}

function getDefaultLandingPath(slug, permissions) {
  const order = [
    { key: 'settings', path: 'dashboard' },
    { key: 'people', path: 'people' },
    { key: 'slideshow', path: 'slideshow' },
    { key: 'events', path: 'events' },
  ];

  for (const entry of order) {
    if (permissions[entry.key]) {
      return `/admin/${slug}/${entry.path}`;
    }
  }

  return `/admin/${slug}/people`;
}

function applyUserDisplaySettings(synagogue, adminUser) {
  if (!synagogue) {
    return synagogue;
  }

  const doc = synagogue.toObject ? synagogue.toObject() : { ...synagogue };

  if (!adminUser) {
    return doc;
  }

  doc.adminLanguage = normalizeAdminLang(adminUser.adminLanguage || doc.adminLanguage);
  doc.adminColorMode = (adminUser.adminTheme && adminUser.adminTheme.colorMode === 'light')
    ? 'light'
    : 'dark';
  return doc;
}

function parsePermissionsFromBody(body) {
  return {
    settings: body.permission_settings === '1' || body.permission_settings === 'true' || body.permission_settings === true,
    people: body.permission_people === '1' || body.permission_people === 'true' || body.permission_people === true,
    slideshow: body.permission_slideshow === '1' || body.permission_slideshow === 'true' || body.permission_slideshow === true,
    events: body.permission_events === '1' || body.permission_events === 'true' || body.permission_events === true,
    userManagement: body.permission_userManagement === '1' || body.permission_userManagement === 'true' || body.permission_userManagement === true,
  };
}

function buildPermissionToggles(permissions, translator) {
  return PERMISSION_META.map((entry) => ({
    key: entry.key,
    label: translator(entry.labelKey),
    enabled: permissions ? !!permissions[entry.key] : false,
  }));
}

function serializeAdminUsers(users) {
  return (users || []).map((user) => ({
    id: String(user._id),
    username: user.username,
    displayName: user.displayName || user.username,
    permissions: {
      settings: !!user.permissions?.settings,
      people: user.permissions?.people !== false,
      slideshow: !!user.permissions?.slideshow,
      events: !!user.permissions?.events,
      userManagement: !!user.permissions?.userManagement,
    },
    adminLanguage: normalizeAdminLang(user.adminLanguage),
    adminColorMode: user.adminTheme?.colorMode === 'light' ? 'light' : 'dark',
  }));
}

module.exports = {
  FULL_ADMIN_PERMISSIONS,
  PERMISSION_KEYS,
  PERMISSION_META,
  parseSlugAndUsername,
  normalizeAdminUsername,
  findAdminUser,
  resolveAdminPermissions,
  getDefaultLandingPath,
  applyUserDisplaySettings,
  parsePermissionsFromBody,
  buildPermissionToggles,
  serializeAdminUsers,
};
