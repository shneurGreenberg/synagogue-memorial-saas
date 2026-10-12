const mongoose = require('mongoose');

const CommunityOnboardingRequestSchema = new mongoose.Schema({
  inviteToken: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  name: { type: String, default: '' },
  slug: { type: String, default: '', index: true },
  titles: {
    en: { type: String, default: '' },
    he: { type: String, default: '' },
    ru: { type: String, default: '' },
  },
  location: {
    lat: { type: Number, default: 54.9833 },
    long: { type: Number, default: 82.8964 },
    city: { type: String, default: '' },
    timezone: { type: String, default: 'UTC' },
  },
  contactName: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  adminEmail: { type: String, default: '' },
  boardLanguage: { type: String, default: 'en' },
  adminLanguage: { type: String, default: 'en' },
  logoFilename: { type: String, default: '' },
  logoBackground: { type: String, enum: ['', 'white', 'black'], default: '' },
  adminPasswordHash: { type: String, select: false },
  notes: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
  rejectReason: { type: String, default: '' },
  createdSynagogueSlug: { type: String, default: '' },
});

module.exports = mongoose.model('CommunityOnboardingRequest', CommunityOnboardingRequestSchema);
