require('dotenv').config();
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const handlebars = require('express-handlebars');
const { SafeString } = require('handlebars');
const { buildTileThemeVars } = require('./lib/tile-theme-colors');
const { BOARD_THEME_DEFAULTS } = require('./lib/board-defaults');
const {
  resolveBoardBackgroundImage,
  resolveTilesBackgroundImage,
} = require('./lib/board-backgrounds');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Synagogue = require('./models/Synagogue');
const { loadSynagogueBoard } = require('./lib/load-synagogue-board');
const { computeBoardVersion, slimBoardPayload } = require('./lib/board-payload');
const { toPublicBoardPayload, toPublicPersonPayload } = require('./lib/public-board');
const { getJewishFeed } = require('./lib/jewish-feed');
const { fetchWeatherForecast } = require('./lib/weather-api');
const { applyBoardPreviewOverrides } = require('./lib/board-preview');
const { BOARD_VERSION } = require('./lib/board-version');
const { photoCropToInlineStyle } = require('./lib/photo-crop');
const { buildPhotoThumbUrl } = require('./lib/photo-url');
const { getTranslator, humanizeLabel } = require('./lib/admin-translations');
const { renderAdminIcon } = require('./lib/admin-icons');
const {
  assertProductionSecrets,
  createApiRateLimiter,
  publicErrorMessage,
} = require('./lib/http-security');
const adminRoutes = require('./routes/admin');
const masterRoutes = require('./routes/master');
const publicSubmissionRoutes = require('./routes/public-submission');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');

assertProductionSecrets();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: isProduction ? undefined : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

function allowMobileApiCors(req, res, next) {
  if (!req.path.includes('/api/')) {
    return next();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}

function getRequestHost(req) {
  const forwarded = String(req.get('X-Forwarded-Host') || '')
    .split(',')[0]
    .trim();
  return forwarded || String(req.get('Host') || '').trim();
}

function hostnameFromHostHeader(hostHeader) {
  if (!hostHeader) {
    return '';
  }

  try {
    return new URL(`http://${hostHeader}`).hostname.toLowerCase();
  } catch {
    return String(hostHeader).split(':')[0].toLowerCase();
  }
}

function requireSameOrigin(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Dev/test clients (curl) and same-site cookies already reduce CSRF risk.
  // Enforce Origin/Referer matching only in production.
  if (!isProduction) {
    return next();
  }

  const hostHeader = getRequestHost(req);
  const expectedHost = hostnameFromHostHeader(hostHeader);
  if (!expectedHost) {
    return next();
  }

  const origin = req.get('Origin');
  const referer = req.get('Referer');
  let sourceHost = '';

  try {
    if (origin) {
      sourceHost = new URL(origin).hostname.toLowerCase();
    } else if (referer) {
      sourceHost = new URL(referer).hostname.toLowerCase();
    }
  } catch {
    return res.status(403).send('Forbidden');
  }

  if (!sourceHost) {
    return res.status(403).send('Forbidden');
  }

  if (sourceHost === expectedHost) {
    return next();
  }

  return res.status(403).send('Forbidden');
}

app.use(allowMobileApiCors);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const sessionSecret = process.env.SESSION_SECRET || (isProduction ? null : 'secret');
if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required');
}

const sessionMiddleware = session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'kaddish.sid',
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue' }),
});

const cssDirectory = path.join(__dirname, 'css');
if (!fs.existsSync(cssDirectory)) {
  fs.mkdirSync(cssDirectory);
}

app.use('/css', express.static(cssDirectory, {
  maxAge: isProduction ? '1h' : 0,
}));

app.use('/admin', sessionMiddleware, requireSameOrigin, adminRoutes);
app.use('/master', sessionMiddleware, requireSameOrigin, masterRoutes);
app.use('/s', requireSameOrigin, publicSubmissionRoutes);

function getInitials(name) {
  if (!name) {
    return '?';
  }

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

app.engine('handlebars', handlebars({
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    json: value => JSON.stringify(value, false, '  '),
    eq: (a, b) => a === b,
    or: (...args) => args.slice(0, -1).some(Boolean),
    and: (...args) => args.slice(0, -1).every(Boolean),
    t(key, options) {
      const root = options.data && options.data.root;
      if (root && typeof root.masterTranslate === 'function') {
        return root.masterTranslate(key);
      }
      const adminLang = (root && root.synagogue && root.synagogue.adminLanguage) || 'ru';
      const fn = (root && root.adminTranslate) || getTranslator(adminLang);
      return typeof fn === 'function' ? fn(key) : humanizeLabel(key);
    },
    initials(name) {
      return getInitials(name);
    },
    adminIcon(name, options) {
      const className = (options && options.hash && options.hash.class) || 'btn-admin-icon';
      return new SafeString(renderAdminIcon(name, className));
    },
    photoCropStyle(photoCrop) {
      return photoCropToInlineStyle(photoCrop);
    },
    photoThumbUrl(photo) {
      return buildPhotoThumbUrl(photo);
    },
    tileThemeVars(theme) {
      return buildTileThemeVars(
        (theme && theme.tileColor) || BOARD_THEME_DEFAULTS.tileColor,
        (theme && theme.primaryColor) || BOARD_THEME_DEFAULTS.primaryColor,
      );
    },
    boardBackgroundImage(theme) {
      return resolveBoardBackgroundImage(theme);
    },
    boardTilesBackground(theme) {
      return resolveTilesBackgroundImage(theme);
    },
    publicT(key, options) {
      const root = options.data && options.data.root;
      const translate = root && root.pt;
      return typeof translate === 'function' ? translate(key) : key;
    },
  },
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true
  }
}));

app.set('view engine', 'handlebars');

const { getResizedPhoto } = require('./lib/photo-resize');
const {
  BUNDLED_IMAGES_DIR,
  BUNDLED_PHOTOS_DIR,
  IMAGES_DIR,
  PHOTOS_DIR,
  isPersistent,
} = require('./lib/storage-paths');

if (isPersistent) {
  console.log('Persistent uploads enabled:', IMAGES_DIR, PHOTOS_DIR);
}

const staticAssetMaxAge = isProduction ? '7d' : 0;
const provisioningDir = path.join(__dirname, 'provisioning');
if (!fs.existsSync(provisioningDir)) {
  fs.mkdirSync(provisioningDir, { recursive: true });
}

app.use('/images', express.static(IMAGES_DIR, { maxAge: staticAssetMaxAge }));
app.use('/images', express.static(BUNDLED_IMAGES_DIR, { maxAge: staticAssetMaxAge }));
app.use('/images/provisioning', express.static(provisioningDir, {
  maxAge: staticAssetMaxAge,
  fallthrough: true,
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

app.get('/photos/:filename', async (req, res, next) => {
  const width = Number(req.query.w);

  if (!width || Number.isNaN(width)) {
    return next();
  }

  const crop = req.query.cx !== undefined || req.query.cy !== undefined || req.query.cz !== undefined
    ? {
      x: req.query.cx,
      y: req.query.cy,
      zoom: req.query.cz,
    }
    : null;

  try {
    const filePath = await getResizedPhoto(req.params.filename, width, crop);

    if (!filePath) {
      return next();
    }

    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.sendFile(filePath);
  } catch (err) {
    console.error('Photo resize error:', err);
    return next();
  }
});

app.use('/photos', express.static(PHOTOS_DIR, { maxAge: staticAssetMaxAge }));
app.use('/photos', express.static(BUNDLED_PHOTOS_DIR, { maxAge: staticAssetMaxAge }));

app.use('/board', express.static(path.join(__dirname, 'public/board'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('memorial.js') || filePath.endsWith('memorial.css')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  },
}));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/downloads', express.static(path.join(__dirname, 'public/downloads'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.apk')) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="kaddish-sidebar.apk"');
    }
  },
}));

const apiRateLimiter = createApiRateLimiter();

function renderMemorialBoard(req, res, synagogue) {
  const { buildFaviconPath } = require('./lib/favicon');
  const { buildYahrzeitEntries } = require('./lib/yahrzeit');
  const yahrzeitTodayCount = buildYahrzeitEntries(synagogue).length;
  const publicData = toPublicBoardPayload(synagogue, { includeText: false });

  res.render('board', {
    layout: false,
    data: publicData,
    boardVersion: BOARD_VERSION,
    faviconUrl: buildFaviconPath(synagogue.slug, { badge: false }),
    faviconAlertUrl: buildFaviconPath(synagogue.slug, { badge: true }),
    yahrzeitTodayCount,
  });
}

app.get('/', async (req, res) => {
  try {
    const synagogues = await Synagogue.find({}, 'slug name');
    res.render('landing', { synagogues, layout: 'landing' });
  } catch (err) {
    console.error('Landing page error:', err);
    res.status(500).send(publicErrorMessage(err));
  }
});

app.get('/s/:slug/favicon.png', async (req, res) => {
  return serveSynagogueFavicon(req, res, false);
});

app.get('/s/:slug/favicon-alert.png', async (req, res) => {
  return serveSynagogueFavicon(req, res, true);
});

async function serveSynagogueFavicon(req, res, badge) {
  try {
    const synagogue = await loadSynagogueBoard(req.params.slug);

    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    const { renderFaviconPng, resolveFaviconLogoFilename } = require('./lib/favicon');
    const logo = resolveFaviconLogoFilename(synagogue);
    const buffer = await renderFaviconPng(logo, { badge });

    if (!buffer) {
      return res.status(404).send('Favicon unavailable');
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.type('png');
    return res.send(buffer);
  } catch (err) {
    console.error('Favicon error:', err);
    return res.status(500).send(publicErrorMessage(err, 'Favicon unavailable'));
  }
}

app.get('/s/:slug/api/board/version', apiRateLimiter, async (req, res) => {
  try {
    const synagogue = await loadSynagogueBoard(req.params.slug);

    if (!synagogue) {
      return res.status(404).json({ error: 'Synagogue not found' });
    }

    const version = computeBoardVersion(synagogue);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ version });
  } catch (err) {
    console.error('Board version error:', err);
    return res.status(500).json({ error: publicErrorMessage(err) });
  }
});

app.get('/s/:slug/api/board/person/:personId', apiRateLimiter, async (req, res) => {
  try {
    const synagogue = await loadSynagogueBoard(req.params.slug);

    if (!synagogue) {
      return res.status(404).json({ error: 'Synagogue not found' });
    }

    const person = (synagogue.people || []).find(
      (entry) => String(entry.id) === String(req.params.personId),
    );

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({ person: toPublicPersonPayload(person) });
  } catch (err) {
    console.error('Person payload error:', err);
    return res.status(500).json({ error: publicErrorMessage(err) });
  }
});

app.get('/s/:slug/api/board', apiRateLimiter, async (req, res) => {
  try {
    const synagogue = await loadSynagogueBoard(req.params.slug);

    if (!synagogue) {
      return res.status(404).json({ error: 'Synagogue not found' });
    }

    const includeText = req.query.slim === '0';
    const payload = includeText
      ? toPublicBoardPayload(synagogue, { includeText: true })
      : slimBoardPayload(synagogue);
    const version = computeBoardVersion(synagogue);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('ETag', `"${version}"`);
    return res.json(payload);
  } catch (err) {
    console.error('Board payload error:', err);
    return res.status(500).json({ error: publicErrorMessage(err) });
  }
});

app.get('/s/:slug/api/weather', apiRateLimiter, async (req, res) => {
  try {
    const synagogue = await loadSynagogueBoard(req.params.slug);

    if (!synagogue) {
      return res.status(404).json({ error: 'Synagogue not found' });
    }

    const lat = Number(synagogue.location?.lat);
    const long = Number(synagogue.location?.long);

    if (!Number.isFinite(lat) || !Number.isFinite(long)) {
      return res.status(400).json({ error: 'Invalid synagogue location' });
    }

    const forecast = await fetchWeatherForecast(lat, long);
    res.setHeader('Cache-Control', 'public, max-age=900');
    return res.json(forecast);
  } catch (err) {
    console.error('Weather error:', err);
    return res.status(502).json({ error: publicErrorMessage(err, 'Weather unavailable') });
  }
});

app.get('/s/:slug/api/jewish-content', apiRateLimiter, async (req, res) => {
  try {
    const synagogue = await loadSynagogueBoard(req.params.slug);

    if (!synagogue) {
      return res.status(404).json({ error: 'Synagogue not found' });
    }

    const lang = ['ru', 'en', 'he'].includes(req.query.lang) ? req.query.lang : synagogue.language || 'ru';
    const feed = await getJewishFeed(lang, synagogue);

    res.setHeader('Cache-Control', 'no-store');
    return res.json(feed);
  } catch (err) {
    console.error('Jewish content error:', err);
    return res.status(500).json({ error: publicErrorMessage(err) });
  }
});

app.get('/s/:slug/api/sidebar-app', apiRateLimiter, async (req, res) => {
  try {
    const synagogue = await loadSynagogueBoard(req.params.slug);

    if (!synagogue) {
      return res.status(404).json({ error: 'Synagogue not found' });
    }

    const lang = ['ru', 'en', 'he'].includes(req.query.lang) ? req.query.lang : synagogue.language || 'ru';
    const { buildSidebarAppPayload } = require('./lib/sidebar-app-payload');
    const payload = await buildSidebarAppPayload(synagogue, lang);

    res.setHeader('Cache-Control', 'no-store');
    return res.json(payload);
  } catch (err) {
    console.error('Sidebar app payload error:', err);
    return res.status(500).json({ error: publicErrorMessage(err) });
  }
});

app.get('/s/:slug/export/tile/:personId', async (req, res) => {
  try {
    const synagogue = await loadSynagogueBoard(req.params.slug);

    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    return renderMemorialBoard(req, res, synagogue);
  } catch (err) {
    console.error('Tile export error:', err);
    return res.status(500).send(publicErrorMessage(err));
  }
});

app.get('/s/:slug/card/:personId', async (req, res) => {
  try {
    const synagogue = await loadSynagogueBoard(req.params.slug);

    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    return renderMemorialBoard(req, res, synagogue);
  } catch (err) {
    console.error('Card page error:', err);
    return res.status(500).send(publicErrorMessage(err));
  }
});

app.get('/s/:slug', async (req, res) => {
  try {
    let synagogue = await loadSynagogueBoard(req.params.slug);

    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }

    synagogue = applyBoardPreviewOverrides(synagogue, req.query);

    return renderMemorialBoard(req, res, synagogue);
  } catch (err) {
    console.error('Board page error:', err);
    return res.status(500).send(publicErrorMessage(err));
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Started at port', PORT);
});
