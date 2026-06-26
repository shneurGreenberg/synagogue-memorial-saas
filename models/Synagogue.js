const mongoose = require('mongoose');

const PersonContactSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', ''], default: '' },
  platform: {
    type: String,
    enum: ['', 'whatsapp', 'telegram', 'max', 'sms', 'email'],
    default: '',
  },
}, { _id: false });

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
  text: String,
  contact: { type: PersonContactSchema, default: () => ({}) },
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
    events: { type: Boolean, default: false },
    settings: { type: Boolean, default: false },
    settingsPreview: { type: Boolean, default: false },
    settingsAppearance: { type: Boolean, default: false },
    settingsBranding: { type: Boolean, default: false },
    settingsFeatures: { type: Boolean, default: false },
    settingsLanguages: { type: Boolean, default: false },
    settingsAdminPanel: { type: Boolean, default: false },
    settingsSavedViews: { type: Boolean, default: false },
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

const SavedViewSchema = new mongoose.Schema({
  id: { type: String, default: '' },
  name: { type: String, default: '' },
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
        prayerOverlay: Number,
        torahNames: Number,
        weather: Number,
        shabbat: Number,
        candle: Number,
      },
      fontScaleBaselines: {
        tileTitle: Number,
        tileDate: Number,
        clock: Number,
        boardHeader: Number,
        sidebar: Number,
        prayers: Number,
        prayerOverlay: Number,
        torahNames: Number,
        weather: Number,
        shabbat: Number,
        candle: Number,
      },
      logo: String,
      backgroundImage: String,
      tilesBackground: String,
      candlePalette: String,
    },
    memorialQrPanel: {
      titles: {
        ru: String,
        en: String,
        he: String,
      },
      texts: {
        ru: String,
        en: String,
        he: String,
      },
      titleScale: Number,
      textScale: Number,
      qrScale: Number,
      titleScaleBaseline: Number,
      textScaleBaseline: Number,
      qrScaleBaseline: Number,
    },
  },
}, { _id: true, id: false });

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
    dailyTehillim: { type: Boolean, default: false },
    dailyTanya: { type: Boolean, default: true },
    dailyRambam: { type: Boolean, default: true },
    hayomYom: { type: Boolean, default: false },
    upcomingHolidays: { type: Boolean, default: true },
    communityEvents: { type: Boolean, default: true },
    kelMaleRachamim: { type: Boolean, default: true },
    izkor: { type: Boolean, default: true },
    weather: { type: Boolean, default: false },
    sunriseSunset: { type: Boolean, default: false },
    officialLogo: { type: Boolean, default: true },
  },
  publicSubmission: {
    enabled: { type: Boolean, default: false },
    donationUrl: { type: String, default: '' },
    donationQrImage: { type: String, default: '' },
    registrationQrImage: { type: String, default: '' },
  },
  yahrzeitReminders: {
    enabled: { type: Boolean, default: false },
    includeHebrewYahrzeit: { type: Boolean, default: true },
    notifyEmail: { type: String, default: '' },
    lastNotifiedDate: { type: String, default: '' },
  },
  activeSavedViewId: { type: String, default: '' },
  memorialQrPanel: {
    titles: {
      ru: { type: String, default: '' },
      en: { type: String, default: '' },
      he: { type: String, default: '' },
    },
    texts: {
      ru: { type: String, default: '' },
      en: { type: String, default: '' },
      he: { type: String, default: '' },
    },
    titleScale: { type: Number, default: 100 },
    textScale: { type: Number, default: 100 },
    qrScale: { type: Number, default: 140 },
    titleScaleBaseline: { type: Number, default: 100 },
    textScaleBaseline: { type: Number, default: 100 },
    qrScaleBaseline: { type: Number, default: 100 },
  },
  savedViews: [SavedViewSchema],
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
      prayerOverlay: { type: Number, default: 100 },
      torahNames: { type: Number, default: 100 },
      weather: { type: Number, default: 100 },
      shabbat: { type: Number, default: 100 },
      candle: { type: Number, default: 75 },
    },
    fontScaleBaselines: {
      tileTitle: { type: Number, default: 100 },
      tileDate: { type: Number, default: 100 },
      clock: { type: Number, default: 100 },
      boardHeader: { type: Number, default: 100 },
      sidebar: { type: Number, default: 100 },
      prayers: { type: Number, default: 100 },
      prayerOverlay: { type: Number, default: 100 },
      torahNames: { type: Number, default: 100 },
      weather: { type: Number, default: 100 },
      shabbat: { type: Number, default: 100 },
      candle: { type: Number, default: 100 },
    },
    backgroundImage: String,
    tilesBackground: String,
    logo: String,
    candlePalette: { type: String, default: 'classic' },
  },
  location: {
    lat: { type: Number, default: 54.9833 },
    long: { type: Number, default: 82.8964 },
    city: { type: String, default: 'Novosibirsk' },
    timezone: { type: String, default: 'Asia/Novosibirsk' }
  },
  language: { type: String, default: 'ru' },
  adminLanguage: { type: String, default: 'ru' }, // Separate language for admin panel
  reloadTimeout: { type: Number, default: 43200000 }, // 12 hours
  provisioning: {
    photosDriveUrl: { type: String, default: '' },
    contactFiles: [{
      originalName: String,
      storedName: String,
      mimeType: String,
      size: Number,
    }],
    donationQrImage: { type: String, default: '' },
    notes: { type: String, default: '' },
    skippedSteps: [String],
    createdAt: Date,
  },
});

SynagogueSchema.pre('save', function normalizeSavedViewsBeforeSave(next) {
  try {
    const { normalizeSavedViews } = require('../lib/saved-views');
    this.set('savedViews', normalizeSavedViews(this.savedViews));
    return next();
  } catch (err) {
    return next(err);
  }
});

module.exports = mongoose.model('Synagogue', SynagogueSchema);
