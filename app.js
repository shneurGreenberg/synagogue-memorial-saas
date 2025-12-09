require('dotenv').config();
const express = require('express');
const handlebars = require('express-handlebars');
const browserify = require('express-browserify');
const sass = require('sass');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const mongoose = require('mongoose');
const Synagogue = require('./models/Synagogue');
const adminRoutes = require('./routes/admin');
const masterRoutes = require('./routes/master');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/synagogue' })
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

app.engine('handlebars', handlebars({
  helpers: {
    json: value => JSON.stringify(value, false, '  '),
    eq: (a, b) => a === b
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

app.get('/js/home.js', browserify(
  path.join(__dirname, 'js/home.jsx'),
  (browserify) => {
    return browserify.transform('babelify', {
      presets: ['@babel/preset-env', '@babel/preset-react']
    });
  }
));

app.get('/js/card.js', browserify(
  path.join(__dirname, 'js/card.jsx'),
  (browserify) => {
    return browserify.transform('babelify', {
      presets: ['@babel/preset-env', '@babel/preset-react']
    });
  }
));

app.get('/', async (req, res) => {
  try {
    const synagogues = await Synagogue.find({}, 'slug name');
    res.render('landing', { synagogues });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/s/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const synagogue = await Synagogue.findOne({ slug }).lean();
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }
    // Map database fields to expected structure if needed, or ensure Seed matches
    synagogue.baseUrl = `/s/${slug}`;
    // Ensure data structure matches what frontend expects (it expects 'data' object with people etc, but here 'synagogue' IS that object mostly)
    // The original database.json had "data": { ... } and "port": ...
    // Our model has fields at top level.
    // So we pass 'synagogue' as 'data'.
    res.render('home', { data: synagogue });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/s/:slug/card/*', async (req, res) => {
  try {
    const { slug } = req.params;
    const synagogue = await Synagogue.findOne({ slug }).lean();
    if (!synagogue) {
      return res.status(404).send('Synagogue not found');
    }
    synagogue.baseUrl = `/s/${slug}`;
    res.render('card', { data: synagogue });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Started at port', PORT);
});
