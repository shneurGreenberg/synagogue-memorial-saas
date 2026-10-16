const mongoose = require('mongoose');

const SKIP_REASON = 'MongoDB unavailable (set MONGODB_URI or start local mongod for integration tests)';

let availabilityPromise = null;

async function probeMongo() {
  if (process.env.SKIP_MONGODB_TESTS === '1') {
    return false;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/synagogue';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    await mongoose.disconnect();
    return true;
  } catch {
    return false;
  }
}

function isMongoAvailable() {
  if (!availabilityPromise) {
    availabilityPromise = probeMongo();
  }
  return availabilityPromise;
}

function wrapItWithMongoSkip(baseIt) {
  return (name, fn, options) => baseIt(name, async (t) => {
    const ok = await isMongoAvailable();
    if (!ok) {
      return t.skip(SKIP_REASON);
    }
    return fn(t);
  }, options);
}

module.exports = {
  SKIP_REASON,
  isMongoAvailable,
  wrapItWithMongoSkip,
};
