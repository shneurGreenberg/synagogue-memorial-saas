const mongoose = require('mongoose');

const PersonSchema = new mongoose.Schema({
  id: Number,
  name: String,
  gregorianDateOfDeath: {
    month: Number,
    date: Number,
    year: Number
  },
  photo: String,
  title: String,
  text: String
});

const DailyCiteSchema = new mongoose.Schema({
  hebrewDate: {
    month: Number,
    date: Number
  },
  text: String
});

const SynagogueSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: String,
  adminPassword: { type: String, select: false }, // Store hashed password here ideally
  title: String,
  weeklyChapterEnabled: { type: Boolean, default: false },
  dailyCites: [DailyCiteSchema],
  people: [PersonSchema],
  adminTheme: {
    colorMode: { type: String, enum: ['dark', 'light'], default: 'dark' },
  },
  theme: {
    primaryColor: { type: String, default: '#d4af37' }, // Gold default
    textColor: { type: String, default: '#ffffff' }, // White default
    backgroundImage: String,
    tilesBackground: String, // Can be color or image URL
    logo: String
  },
  slideshow: {
    enabled: { type: Boolean, default: false },
    interval: { type: Number, default: 10 }, // seconds for each slide
    mainDuration: { type: Number, default: 30 }, // seconds for main view
    images: [{
      url: String,
      text: String // For additional info
    }]
  },
  location: {
    lat: { type: Number, default: 54.9833 },
    long: { type: Number, default: 82.8964 },
    city: { type: String, default: 'Novosibirsk' }
  },
  language: { type: String, default: 'ru' },
  adminLanguage: { type: String, default: 'ru' }, // Separate language for admin panel
  reloadTimeout: { type: Number, default: 43200000 } // 12 hours
});

module.exports = mongoose.model('Synagogue', SynagogueSchema);
