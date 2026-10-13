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

const ContactDirectoryEntrySchema = new mongoose.Schema({
  id: { type: String, default: '' },
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
}, { _id: false });

const PersonAddRequestSchema = new mongoose.Schema({
  id: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'dismissed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  submitter: { type: PersonContactSchema, default: () => ({}) },
  relation: { type: String, default: '' },
  deceasedName: { type: String, default: '' },
  deceasedNotes: { type: String, default: '' },
  gregorianDateOfDeath: {
    month: { type: Number, default: undefined },
    date: { type: Number, default: undefined },
    year: { type: Number, default: undefined },
  },
}, { _id: false });

const PersonSchema = new mongoose.Schema({
  id: Number,
  name: String,
  gregorianDateOfDeath: {
    month: { type: Number, default: undefined },
    date: { type: Number, default: undefined },
    year: { type: Number, default: undefined },
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
  contacts: { type: [PersonContactSchema], default: undefined },
  hebrewDateOfDeath: {
    month: { type: Number, default: undefined },
    date: { type: Number, default: undefined },
    year: { type: Number, default: undefined },
  },
  internalNotes: { type: String, default: '' },
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
    contactDirectory: { type: Boolean, default: false },
    slideshow: { type: Boolean, default: false },
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
  eventDate: {
    month: Number,
    date: Number,
    year: Number,
  },
  startAt: { type: Date, default: Date.now },
  endAt: Date,
  sortOrder: { type: Number, default: 0 },
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
      logoBorderRadius: Number,
      logoBackground: String,
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
      donationTitles: {
        ru: String,
        en: String,
        he: String,
      },
      donationTexts: {
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
    boardFeatures: {
      sidebarNames: Boolean,
      dailyChumash: Boolean,
      dailyTehillim: Boolean,
      dailyTanya: Boolean,
      dailyRambam: Boolean,
      hayomYom: Boolean,
      upcomingHolidays: Boolean,
      communityEvents: Boolean,
      kelMaleRachamim: Boolean,
      izkor: Boolean,
      weather: Boolean,
      sunriseSunset: Boolean,
      officialLogo: Boolean,
    },
    shabbatTimesEnabled: Boolean,
    publicSubmission: {
      enabled: Boolean,
      donationUrl: String,
      donationQrImage: String,
      registrationQrImage: String,
      showDonationQr: Boolean,
      showRegistrationQr: Boolean,
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
    showDonationQr: { type: Boolean, default: true },
    showRegistrationQr: { type: Boolean, default: true },
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
    donationTitles: {
      ru: { type: String, default: '' },
      en: { type: String, default: '' },
      he: { type: String, default: '' },
    },
    donationTexts: {
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
  personAddRequests: { type: [PersonAddRequestSchema], default: [] },
  contactDirectory: { type: [ContactDirectoryEntrySchema], default: [] },
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
    logoBorderRadius: { type: Number, default: 100, min: 0, max: 100 },
    logoBackground: { type: String, enum: ['', 'white', 'black'], default: '' },
    boardFont: { type: String, default: 'georgia' },
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
  publishedVersion: { type: Number, default: 1 },
  publishedAt: { type: Date, default: null },
  lastRefreshedCodeVersion: { type: String, default: null },
  weeklyKaddishWhatsapp: { type: String, default: '' },
  weeklyKaddishConfirmation: {
    weekKey: { type: String, default: '' },
    confirmedBy: { type: String, default: '' },
    confirmedAt: { type: Date, default: null },
  },
  adminYahrzeitTodayCache: {
    dayKey: { type: String, default: '' },
    peopleRevision: { type: String, default: '' },
    includeHebrewYahrzeit: { type: Boolean, default: true },
    count: { type: Number, default: 0 },
    computedAt: { type: Date, default: null },
  },
  adminWeeklyKaddishCache: {
    weekKey: { type: String, default: '' },
    peopleRevision: { type: String, default: '' },
    includeHebrewYahrzeit: { type: Boolean, default: true },
    weekStartKey: { type: String, default: '' },
    weekEndKey: { type: String, default: '' },
    missingCount: { type: Number, default: 0 },
    entries: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    computedAt: { type: Date, default: null },
  },
  boardClients: {
    type: [{
      screenId: String,
      client: String,
      label: String,
      publishedVersion: Number,
      lastSeenAt: Date,
    }],
    default: [],
  },
  slideshow: {
    enabled: { type: Boolean, default: false },
    displayMode: { type: String, enum: ['rotate', 'showNow'], default: 'rotate' },
    interval: { type: Number, default: 10 }, // seconds for each slide
    mainDuration: { type: Number, default: 30 }, // seconds for main view
    images: [{
      url: String,
      text: String
    }]
  },
  presentationOverlay: {
    enabled: { type: Boolean, default: false },
    image: { type: String, default: '' },
    intervalMs: { type: Number, default: 180000 }, // every 3 minutes
    durationMs: { type: Number, default: 10000 }, // show 10 seconds
  },
  provisioning: {
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
