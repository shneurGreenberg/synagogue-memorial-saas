const { normalizeAdminLang } = require('./admin-locale');

const SETTINGS_SECTION_KEYS = [
  'settingsPreview',
  'settingsAppearance',
  'settingsBranding',
  'settingsFeatures',
  'settingsLanguages',
  'settingsAdminPanel',
  'settingsSavedViews',
];

const PAGE_PERMISSION_KEYS = ['people', 'peopleImport', 'slideshow', 'events'];

const SETTINGS_SECTION_META = [
  { key: 'settingsPreview', labelKey: 'perm_settings_preview' },
  { key: 'settingsAppearance', labelKey: 'perm_settings_appearance' },
  { key: 'settingsBranding', labelKey: 'perm_settings_branding' },
  { key: 'settingsFeatures', labelKey: 'perm_settings_features' },
  { key: 'settingsLanguages', labelKey: 'perm_settings_languages' },
  { key: 'settingsAdminPanel', labelKey: 'perm_settings_admin_panel' },
  { key: 'settingsSavedViews', labelKey: 'perm_settings_saved_views' },
];

const PAGE_PERMISSION_META = [
  { key: 'people', labelKey: 'perm_people' },
  { key: 'peopleImport', labelKey: 'perm_people_import' },
  { key: 'slideshow', labelKey: 'perm_slideshow' },
  { key: 'events', labelKey: 'perm_events' },
];

function buildFullPermissions() {
  const permissions = {
    people: true,
    peopleImport: true,
    slideshow: true,
    events: true,
  };

  SETTINGS_SECTION_KEYS.forEach((key) => {
    permissions[key] = true;
  });
  permissions.settings = true;
  return permissions;
}

const FULL_ADMIN_PERMISSIONS = buildFullPermissions();

function hasSettingsAccess(permissions) {
  if (!permissions) {
    return false;
  }

  return SETTINGS_SECTION_KEYS.some((key) => !!permissions[key]);
}

function hasExplicitGranularPermissions(source) {
  if (!source) {
    return false;
  }

  return SETTINGS_SECTION_KEYS.some((key) => Object.prototype.hasOwnProperty.call(source, key));
}

function canSaveBoardSettings(permissions) {
  if (!permissions) {
    return false;
  }

  return !!(
    permissions.settingsAppearance
    || permissions.settingsBranding
    || permissions.settingsFeatures
    || permissions.settingsLanguages
  );
}

function normalizePermissions(raw) {
  const source = raw || {};
  const permissions = {
    people: source.people !== false,
    peopleImport: !!source.peopleImport,
    slideshow: !!source.slideshow,
    events: !!source.events,
  };

  const useLegacySettings = source.settings === true && !hasExplicitGranularPermissions(source);
  SETTINGS_SECTION_KEYS.forEach((key) => {
    if (key === 'settingsSavedViews') {
      permissions[key] = useLegacySettings
        ? true
        : (Object.prototype.hasOwnProperty.call(source, key) ? !!source[key] : true);
      return;
    }

    permissions[key] = useLegacySettings ? true : !!source[key];
  });
  permissions.settings = hasSettingsAccess(permissions);
  return permissions;
}

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
    return normalizePermissions({});
  }

  return normalizePermissions(user.permissions || {});
}

function getDefaultLandingPath(slug, permissions) {
  const order = [
    { key: 'settings', path: 'dashboard', check: hasSettingsAccess },
    { key: 'people', path: 'people' },
    { key: 'slideshow', path: 'slideshow' },
    { key: 'events', path: 'events' },
  ];

  for (const entry of order) {
    const allowed = entry.check ? entry.check(permissions) : permissions[entry.key];
    if (allowed) {
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
  const permissions = {
    people: body.permission_people === '1' || body.permission_people === 'true' || body.permission_people === true,
    peopleImport: body.permission_peopleImport === '1' || body.permission_peopleImport === 'true' || body.permission_peopleImport === true,
    slideshow: body.permission_slideshow === '1' || body.permission_slideshow === 'true' || body.permission_slideshow === true,
    events: body.permission_events === '1' || body.permission_events === 'true' || body.permission_events === true,
  };

  SETTINGS_SECTION_KEYS.forEach((key) => {
    const field = `permission_${key}`;
    permissions[key] = body[field] === '1' || body[field] === 'true' || body[field] === true;
  });

  return permissions;
}

function permissionsForStorage(body) {
  const permissions = parsePermissionsFromBody(body);
  delete permissions.settings;
  return permissions;
}

function buildPermissionToggles(permissions, translator) {
  return PAGE_PERMISSION_META.map((entry) => ({
    ...entry,
    label: translator(entry.labelKey),
    enabled: permissions ? !!permissions[entry.key] : false,
  }));
}

function buildSettingsSectionToggles(permissions, translator) {
  return SETTINGS_SECTION_META.map((entry) => ({
    ...entry,
    label: translator(entry.labelKey),
    enabled: permissions ? !!permissions[entry.key] : false,
  }));
}

function serializeAdminUsers(users) {
  return (users || []).map((user) => {
    const permissions = normalizePermissions(user.permissions || {});
    return {
      id: String(user._id),
      username: user.username,
      displayName: user.displayName || user.username,
      permissions,
      adminLanguage: normalizeAdminLang(user.adminLanguage),
      adminColorMode: user.adminTheme?.colorMode === 'light' ? 'light' : 'dark',
    };
  });
}

function permissionAllows(permissions, permission) {
  const normalized = normalizePermissions(permissions);
  if (permission === 'settings') {
    return hasSettingsAccess(normalized);
  }
  return !!normalized[permission];
}

function summarizeSettingsPermissions(permissions, translator) {
  const normalized = normalizePermissions(permissions);
  if (!hasSettingsAccess(normalized)) {
    return '';
  }

  return SETTINGS_SECTION_META
    .filter((entry) => normalized[entry.key])
    .map((entry) => translator(entry.labelKey))
    .join(', ');
}

module.exports = {
  SETTINGS_SECTION_KEYS,
  SETTINGS_SECTION_META,
  PAGE_PERMISSION_META,
  FULL_ADMIN_PERMISSIONS,
  hasSettingsAccess,
  canSaveBoardSettings,
  normalizePermissions,
  parseSlugAndUsername,
  normalizeAdminUsername,
  findAdminUser,
  resolveAdminPermissions,
  getDefaultLandingPath,
  applyUserDisplaySettings,
  parsePermissionsFromBody,
  permissionsForStorage,
  buildPermissionToggles,
  buildSettingsSectionToggles,
  serializeAdminUsers,
  permissionAllows,
  summarizeSettingsPermissions,
};
