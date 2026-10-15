const mongoose = require('mongoose');

const storedTranslationSchema = new mongoose.Schema({
  sourceHash: { type: String, required: true },
  langPair: { type: String, required: true },
  sourceText: { type: String, default: '' },
  translatedText: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

storedTranslationSchema.index({ sourceHash: 1, langPair: 1 }, { unique: true });

module.exports = mongoose.model('StoredTranslation', storedTranslationSchema);
