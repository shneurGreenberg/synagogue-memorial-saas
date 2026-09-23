const fs = require('fs');
const path = require('path');
const { sanitizeRichText } = require('./sanitize');
const { optimizeUploadedImage } = require('./image-optimize');
const { PHOTOS_DIR } = require('./storage-paths');
const { invalidateBoardCache } = require('./board-cache');

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const ALLOWED_MIME = new Set(Object.keys(MIME_EXT));

function safeScanReturnPath(value) {
  const nextUrl = String(value || '').trim();
  const match = nextUrl.match(/^\/s\/([a-z0-9]+(?:-[a-z0-9]+)*)\/scan\/?$/);
  if (!match) {
    return '';
  }
  return `/s/${match[1]}/scan`;
}

function scanPathForSlug(value, slug) {
  const safe = safeScanReturnPath(value);
  if (!slug || safe !== `/s/${slug}/scan`) {
    return '';
  }
  return safe;
}

function sniffImageMime(buffer) {
  if (!buffer || buffer.length < 12) {
    return '';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  if (buffer.slice(0, 3).toString('ascii') === 'GIF') {
    return 'image/gif';
  }
  return '';
}

function decodeImagePayload(body) {
  const raw = body && (body.image || body.imageBase64 || body.photo);
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const dataUrl = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/);
  if (dataUrl) {
    return {
      buffer: Buffer.from(dataUrl[2].replace(/\s/g, ''), 'base64'),
      mimeType: dataUrl[1].toLowerCase(),
    };
  }

  const compact = raw.replace(/\s/g, '');
  if (!/^[a-zA-Z0-9+/=]+$/.test(compact) || compact.length < 32) {
    return null;
  }

  return {
    buffer: Buffer.from(compact, 'base64'),
    mimeType: String((body && body.mimeType) || 'image/jpeg').toLowerCase(),
  };
}

function readScanImage(req) {
  const uploaded = req.file
    || (req.files && (req.files.image || req.files.photo || req.files.file) || [])[0];

  let buffer = uploaded && uploaded.buffer;
  let mimeType = uploaded && String(uploaded.mimetype || '').toLowerCase();

  if (!buffer) {
    const decoded = decodeImagePayload(req.body);
    if (!decoded) {
      return null;
    }
    buffer = decoded.buffer;
    mimeType = decoded.mimeType;
  }

  if (!buffer || !buffer.length || buffer.length > 10 * 1024 * 1024) {
    return null;
  }

  const sniffed = sniffImageMime(buffer);
  if (!sniffed || !ALLOWED_MIME.has(sniffed)) {
    return null;
  }

  if (mimeType && ALLOWED_MIME.has(mimeType) && mimeType !== sniffed && mimeType !== 'image/jpg') {
    mimeType = sniffed;
  }

  return { buffer, mimeType: sniffed };
}

function normalizePersonName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

function findNameMatches(people, name) {
  const needle = normalizePersonName(name);
  if (!needle) {
    return [];
  }

  return (people || [])
    .filter((person) => normalizePersonName(person && person.name) === needle)
    .slice(0, 5)
    .map((person) => ({
      id: person.id,
      name: person.name,
      year: person.gregorianDateOfDeath && person.gregorianDateOfDeath.year
        ? person.gregorianDateOfDeath.year
        : null,
    }));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildPersonBiography(fields) {
  const father = String(fields.fatherNameOrPatronymic || '').trim();
  const hebrew = String(fields.hebrewDateText || '').trim();
  const epitaph = String(fields.epitaphOrBio || '').trim();
  const lines = [];

  if (father) {
    lines.push(`Отец / отчество: ${father}`);
  }
  if (hebrew) {
    lines.push(`Дата по еврейскому календарю: ${hebrew}`);
  }
  if (epitaph) {
    lines.push(epitaph);
  }

  const html = escapeHtml(lines.join('\n\n').slice(0, 4000)).replace(/\n/g, '<br>');
  return sanitizeRichText(html);
}

function parseRequiredDeathDate(value) {
  const source = value && typeof value === 'object' ? value : {};
  const month = parseInt(source.month, 10);
  const date = parseInt(source.date, 10);
  const year = parseInt(source.year, 10);

  if (!Number.isFinite(month) || !Number.isFinite(date) || !Number.isFinite(year)) {
    return null;
  }
  if (month < 1 || month > 12 || date < 1 || date > 31 || year < 1800 || year > 2100) {
    return null;
  }

  const probe = new Date(year, month - 1, date);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== date) {
    return null;
  }

  return { month, date, year };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function persistPersonPhoto(buffer, mimeType) {
  ensureDir(PHOTOS_DIR);
  const ext = MIME_EXT[mimeType] || '.jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(PHOTOS_DIR, filename);
  await fs.promises.writeFile(filePath, buffer);
  return optimizeUploadedImage(filePath, 'photo');
}

async function removePhotoFile(filename) {
  if (!filename) {
    return;
  }
  const filePath = path.join(PHOTOS_DIR, path.basename(filename));
  await fs.promises.unlink(filePath).catch(() => {});
}

function publicPerson(person) {
  if (!person) {
    return null;
  }
  return {
    id: person.id,
    name: person.name,
    gregorianDateOfDeath: person.gregorianDateOfDeath,
    photo: person.photo || '',
    text: person.text || '',
    title: person.title || '',
  };
}

async function saveScannedPerson(Synagogue, slug, input, photoFilename) {
  const name = String(input.name || '').trim().slice(0, 120);
  const deathDate = parseRequiredDeathDate(input.gregorianDateOfDeath || {
    month: input.month,
    date: input.date,
    year: input.year,
  });

  if (!name || !deathDate || !photoFilename) {
    await removePhotoFile(photoFilename);
    const error = new Error('Scanned person is incomplete');
    error.code = !name ? 'name_required' : (!deathDate ? 'date_required' : 'image_required');
    throw error;
  }

  const text = buildPersonBiography(input);
  const personId = parseInt(input.personId, 10);
  const synagogue = await Synagogue.findOne({ slug });
  if (!synagogue) {
    const error = new Error('Synagogue not found');
    error.code = 'not_found';
    throw error;
  }

  let created = false;
  let stored = null;

  try {
    if (Number.isFinite(personId)) {
      const existing = (synagogue.people || []).find((person) => person.id === personId);
      if (!existing) {
        const error = new Error('Person not found');
        error.code = 'person_not_found';
        throw error;
      }

      await Synagogue.updateOne(
        { slug, 'people.id': personId },
        {
          $set: {
            'people.$.name': name,
            'people.$.text': text,
            'people.$.gregorianDateOfDeath': deathDate,
            'people.$.photo': photoFilename,
          },
        },
      );
    } else {
      const maxId = (synagogue.people || []).reduce((max, person) => (
        person.id > max ? person.id : max
      ), 0);
      stored = {
        id: maxId + 1,
        name,
        text,
        gregorianDateOfDeath: deathDate,
        photo: photoFilename,
        title: '',
      };
      created = true;
      await Synagogue.updateOne(
        { slug },
        { $push: { people: stored } },
      );
    }
  } catch (err) {
    await removePhotoFile(photoFilename);
    throw err;
  }

  invalidateBoardCache(slug);

  if (!created) {
    const updated = await Synagogue.findOne(
      { slug, 'people.id': personId },
      { 'people.$': 1 },
    ).lean();
    stored = updated && updated.people && updated.people[0];
  }

  return { created, person: publicPerson(stored) };
}

module.exports = {
  safeScanReturnPath,
  scanPathForSlug,
  sniffImageMime,
  readScanImage,
  normalizePersonName,
  findNameMatches,
  buildPersonBiography,
  parseRequiredDeathDate,
  persistPersonPhoto,
  removePhotoFile,
  saveScannedPerson,
};
