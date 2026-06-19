const mongoose = require('mongoose');

const HayomYomSchema = new mongoose.Schema({
  hebrewMonth: { type: Number, required: true, min: 1, max: 13 },
  hebrewDay: { type: Number, required: true, min: 1, max: 30 },
  text: {
    en: { type: String, default: '' },
    he: { type: String, default: '' },
    ru: { type: String, default: '' },
  },
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
