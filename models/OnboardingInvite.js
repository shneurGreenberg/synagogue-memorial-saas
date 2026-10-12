const mongoose = require('mongoose');
const crypto = require('crypto');

const OnboardingInviteSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  label: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  revoked: { type: Boolean, default: false },
});

OnboardingInviteSchema.statics.generateToken = function generateToken() {
  return crypto.randomBytes(24).toString('hex');
};

OnboardingInviteSchema.methods.isUsable = function isUsable() {
  if (this.revoked) {
    return false;
  }
  if (this.expiresAt && this.expiresAt.getTime() < Date.now()) {
    return false;
  }
  return true;
};

module.exports = mongoose.model('OnboardingInvite', OnboardingInviteSchema);
