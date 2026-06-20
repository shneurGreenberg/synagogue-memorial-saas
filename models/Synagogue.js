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
  photoCrop: {
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 },
    zoom: { type: Number, default: 1 },
  },
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

const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  displayName: { type: String, default: '' },
  permissions: {
    people: { type: Boolean, default: true },
    peopleImport: { type: Boolean, default: false },
    slideshow: { type: Boolean, default: false },
    events: { type: Boolean, default: false },
    settings: { type: Boolean, default: false },
    settingsPreview: { type: Boolean, default: false },
    settingsAppearance: { type: Boolean, default: false },
    settingsBranding: { type: Boolean, default: false },
    settingsFeatures: { type: Boolean, default: false },
    settingsLanguages: { type: Boolean, default: false },
    settingsAdminPanel: { type: Boolean, default: false },
  },
  adminLanguage: { type: String, default: 'ru' },
  adminTheme: {
    colorMode: { type: String, enum: ['dark', 'light'], default: 'dark' },
  },
});

const CommunityEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String, default: '' },
  eventDate: {
    month: Number,
    date: Number,
    year: Number,
  },
  startAt: { type: Date, default: Date.now },
  endAt: Date,
  createdAt: { type: Date, default: Date.now },
});

const SynagogueSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: String,
  adminPassword: { type: String, select: false }, // Store hashed password here ideally
  title: String,
  titles: {
    ru: { type: String, default: '' },
    en: { type: String, default: '' },
    he: { type: String, default: '' },
  },
  weeklyChapterEnabled: { type: Boolean, default: false },
  shabbatTimesEnabled: { type: Boolean, default: false },
  boardFeatures: {
    sidebarNames: { type: Boolean, default: true },
    dailyChumash: { type: Boolean, default: true },
    dailyTehillim: { type: Boolean, default: true },
    dailyTanya: { type: Boolean, default: true },
    dailyRambam: { type: Boolean, default: true },
    hayomYom: { type: Boolean, default: true },
    upcomingHolidays: { type: Boolean, default: true },
    communityEvents: { type: Boolean, default: true },
    kelMaleRachamim: { type: Boolean, default: true },
    izkor: { type: Boolean, default: true },
    weather: { type: Boolean, default: false },
  },
  savedViews: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    savedAt: { type: Date, default: Date.now },
    screenshot: String,
    snapshot: {
      titles: {
        ru: String,
        en: String,
        he: String,
      },
      language: String,
      theme: {
        primaryColor: String,
        textColor: String,
        accentColor: String,
        tileColor: String,
        tileOpacity: Number,
        fontScales: {
          tileTitle: Number,
          tileDate: Number,
          clock: Number,
          boardHeader: Number,
          sidebar: Number,
          prayers: Number,
        },
        logo: String,
        backgroundImage: String,
        tilesBackground: String,
      },
    },
  }],
  dailyCites: [DailyCiteSchema],
  communityEvents: [CommunityEventSchema],
  people: [PersonSchema],
  adminUsers: [AdminUserSchema],
  adminTheme: {
    colorMode: { type: String, enum: ['dark', 'light'], default: 'dark' },
  },
  theme: {
    primaryColor: { type: String, default: '#cfaf1f' },
    textColor: { type: String, default: '#f0f0f0' },
    accentColor: { type: String, default: '#ffd54f' },
    tileColor: { type: String, default: '#b89a22' },
    tileOpacity: { type: Number, default: 100, min: 0, max: 100 },
    fontScales: {
      tileTitle: { type: Number, default: 100 },
      tileDate: { type: Number, default: 100 },
      clock: { type: Number, default: 100 },
      boardHeader: { type: Number, default: 100 },
      sidebar: { type: Number, default: 100 },
      prayers: { type: Number, default: 100 },
    },
    backgroundImage: String,
    tilesBackground: String,
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
    city: { type: String, default: 'Novosibirsk' },
    timezone: { type: String, default: 'Asia/Novosibirsk' }
  },
  language: { type: String, default: 'ru' },
  adminLanguage: { type: String, default: 'ru' }, // Separate language for admin panel
  reloadTimeout: { type: Number, default: 43200000 } // 12 hours
});

module.exports = mongoose.model('Synagogue', SynagogueSchema);
