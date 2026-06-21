require('dotenv').config();
const express = require('express');
const handlebars = require('express-handlebars');
const { buildTileThemeVars } = require('./lib/tile-theme-colors');
const { BOARD_THEME_DEFAULTS } = require('./lib/board-defaults');
const sass = require('sass');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const mongoose = require('mongoose');
const Synagogue = require('./models/Synagogue');
const { normalizeBoardFeatures } = require('./lib/board-features');
const { getJewishFeed } = require('./lib/jewish-feed');
const { fetchWeatherForecast } = require('./lib/weather-api');
const { normalizePublicSubmission } = require('./lib/public-submission');
const { applyBoardPreviewOverrides } = require('./lib/board-preview');
const { BOARD_VERSION } = require('./lib/board-version');
const { photoCropToInlineStyle } = require('./lib/photo-crop');
const { buildPhotoThumbUrl } = require('./lib/photo-url');
const { normalizeTitles } = require('./lib/admin-theme');
const { getTranslator, humanizeLabel } = require('./lib/admin-translations');
const adminRoutes = require('./routes/admin');
const masterRoutes = require('./routes/master');
const publicSubmissionRoutes = require('./routes/public-submission');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    sameSite: 'lax',
  },
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue' }),
}));

app.use('/admin', adminRoutes);
app.use('/master', masterRoutes);
app.use('/s', publicSubmissionRoutes);

// Compile SCSS on the fly
const cssDirectory = path.join(__dirname, 'css');
if (!fs.existsSync(cssDirectory)) {
  fs.mkdirSync(cssDirectory);
}

app.use('/css', (req, res, next) => {
  const scssFile = path.join(__dirname, 'styles', req.path.replace('.css', '.scss'));
  const cssFile = path.join(cssDirectory, req.path);

  if (fs.existsSync(scssFile)) {
    try {
      const result = sass.compile(scssFile);
      fs.writeFileSync(cssFile, result.css);
    } catch (err) {
      console.error('SASS compilation error:', err);
    }
  }
  next();
}, express.static(cssDirectory));

app.use('/css', express.static(cssDirectory));

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

app.use('/images', express.static(IMAGES_DIR));
app.use('/images', express.static(BUNDLED_IMAGES_DIR));

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

app.use('/photos', express.static(PHOTOS_DIR));
app.use('/photos', express.static(BUNDLED_PHOTOS_DIR));

app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.use('/board', express.static(path.join(__dirname, 'public/board'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('memorial.js') || filePath.endsWith('memorial.css')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  },
}));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

async function loadSynagogueBoard(slug) {
  const synagogue = await Synagogue.findOne({ slug }).lean();

  if (!synagogue) {
    return null;
  }

  synagogue.baseUrl = `/s/${slug}`;
  synagogue.titles = normalizeTitles(synagogue);
  synagogue.title = synagogue.titles.ru || synagogue.title || synagogue.name || '';
  synagogue.boardFeatures = normalizeBoardFeatures(synagogue.boardFeatures);
  synagogue.publicSubmission = normalizePublicSubmission(synagogue.publicSubmission);
  return synagogue;
}

function renderMemorialBoard(req, res, synagogue) {
  res.render('board', {
    layout: false,
    data: synagogue,
    boardVersion: BOARD_VERSION,
  });
}

app.get('/', async (req, res) => {
  try {
    const synagogues = await Synagogue.find({}, 'slug name');
    res.render('landing', { synagogues, layout: 'landing' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/s/:slug/api/board', async (req, res) => {
  try {
    const synagogue = await loadSynagogueBoard(req.params.slug);

    if (!synagogue) {
      return res.status(404).json({ error: 'Synagogue not found' });
    }

    return res.json(synagogue);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/s/:slug/api/weather', async (req, res) => {
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
    return res.status(502).json({ error: err.message || 'Weather unavailable' });
  }
});

app.get('/s/:slug/api/jewish-content', async (req, res) => {
  try {
    const synagogue = await loadSynagogueBoard(req.params.slug);

    if (!synagogue) {
      return res.status(404).json({ error: 'Synagogue not found' });
    }

    const lang = ['ru', 'en', 'he'].includes(req.query.lang) ? req.query.lang : synagogue.language || 'ru';
    const feed = await getJewishFeed(lang);

    return res.json(feed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
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
    return res.status(500).send(err.message);
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
    return res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Started at port', PORT);
});
