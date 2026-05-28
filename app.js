require('dotenv').config();
const express = require('express');
const handlebars = require('express-handlebars');
const sass = require('sass');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const mongoose = require('mongoose');
const Synagogue = require('./models/Synagogue');
const { applyBoardPreviewOverrides } = require('./lib/board-preview');
const { normalizeTitles } = require('./lib/admin-theme');
const { getTranslator, humanizeLabel } = require('./lib/admin-translations');
const adminRoutes = require('./routes/admin');
const masterRoutes = require('./routes/master');
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
  helpers: {
    json: value => JSON.stringify(value, false, '  '),
    eq: (a, b) => a === b,
    t(key, options) {
      const root = options.data && options.data.root;
      const adminLang = (root && root.synagogue && root.synagogue.adminLanguage) || 'ru';
      const fn = (root && root.adminTranslate) || getTranslator(adminLang);
      return typeof fn === 'function' ? fn(key) : humanizeLabel(key);
    },
    initials(name) {
      return getInitials(name);
    },
  },
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true
  }
}));

app.set('view engine', 'handlebars');

app.use('/images', express.static(path.join(__dirname, 'images')));

app.use('/photos', express.static(path.join(__dirname, 'photos')));

app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.use('/board', express.static(path.join(__dirname, 'public/board')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

async function loadSynagogueBoard(slug) {
  const synagogue = await Synagogue.findOne({ slug }).lean();

  if (!synagogue) {
    return null;
  }

  synagogue.baseUrl = `/s/${slug}`;
  synagogue.titles = normalizeTitles(synagogue);
  synagogue.title = synagogue.titles.ru || synagogue.title || synagogue.name || '';
  return synagogue;
}

function renderMemorialBoard(req, res, synagogue) {
  res.render('board', {
    layout: false,
    data: synagogue,
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
