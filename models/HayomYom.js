const mongoose = require('mongoose');

const HayomYomSchema = new mongoose.Schema({
  hebrewMonth: { type: Number, required: true, min: 1, max: 13 },
  hebrewDay: { type: Number, required: true, min: 1, max: 30 },
  text: {
    en: { type: String, default: '' },
    he: { type: String, default: '' },
    ru: { type: String, default: '' },
  },
  // 1.29.5 I6 / 1.35.0 I57: trusted Hebrew sources are 'chabadlibrary' and 'luach.day'.
  hebrewSource: { type: String, default: '' },
  // 1.37.0 I79: 'ru.chabad.org' = official Russian text; 'ru.chabad.org:untranslated' = the site has
  // only a "cannot be translated" note (machine translation kept). russianVariant = 'adar1'/'adar2'
  // for Adar days (a regular year's Adar uses the Adar II entry), '' otherwise.
  russianSource: { type: String, default: '' },
  russianVariant: { type: String, default: '' },
  lessons5703: {
    chumash: {
      en: { type: String, default: '' },
      he: { type: String, default: '' },
      ru: { type: String, default: '' },
    },
    tehillim: {
      en: { type: String, default: '' },
      he: { type: String, default: '' },
      ru: { type: String, default: '' },
    },
    tanya: {
      en: { type: String, default: '' },
      he: { type: String, default: '' },
      ru: { type: String, default: '' },
    },
  },
}, {
  timestamps: true,
});

HayomYomSchema.index({ hebrewMonth: 1, hebrewDay: 1 }, { unique: true });

module.exports = mongoose.model('HayomYom', HayomYomSchema);
