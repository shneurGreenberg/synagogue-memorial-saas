const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('path');
const express = require('express');
const handlebars = require('express-handlebars');
const mongoose = require('mongoose');
const sharp = require('sharp');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const graveOcr = require('../lib/grave-ocr');
const graveScan = require('../lib/grave-scan');
const graveScanRoutes = require('../routes/grave-scan');
const Synagogue = require('../models/Synagogue');

const SLUG = 'novosibirsk';
const ROOT = path.join(__dirname, '..');

function multipart(fields, file) {
  const boundary = '----gravescan';
  const chunks = [];
  Object.entries(fields).forEach(([name, value]) => {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    ));
  });
  if (file) {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="stone.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ));
    chunks.push(file);
    chunks.push(Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat(chunks),
  };
}

function request(server, method, urlPath, { headers = {}, body = null } = {}) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path: urlPath,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: buffer.toString('utf8'),
            json() {
              return JSON.parse(buffer.toString('utf8'));
            },
          });
        });
      },
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function buildApp(session) {
  const app = express();
  app.use(express.json({ limit: '12mb' }));
  app.use((req, res, next) => {
    req.session = session;
    next();
  });
  app.engine('handlebars', handlebars({
    extname: '.handlebars',
    defaultLayout: 'scan',
  }));
  app.set('view engine', 'handlebars');
  app.set('views', path.join(ROOT, 'views'));
  app.use('/s', graveScanRoutes);
  return app;
}

describe('grave OCR parsing', () => {
  it('defaults to OpenRouter Gemini 3.8 Flash', () => {
    const config = graveOcr.resolveGraveOcrConfig({ OPENROUTER_API_KEY: 'test-key' });
    assert.equal(config.provider, 'openrouter');
    assert.equal(config.model, graveOcr.DEFAULT_OPENROUTER_MODEL);
    assert.equal(config.model, 'google/gemini-3.8-flash');
    assert.equal(config.apiKey, 'test-key');
  });

  it('uses SCAN_OCR_MODEL when set, including the optional DeepSeek id', () => {
    const config = graveOcr.resolveGraveOcrConfig({
      OPENROUTER_API_KEY: 'test-key',
      SCAN_OCR_MODEL: graveOcr.OPTIONAL_DEEPSEEK_OPENROUTER_MODEL,
    });
    assert.equal(config.provider, 'openrouter');
    assert.equal(config.model, 'deepseek/deepseek-v4.1-flash');
  });

  it('switches provider only from the env flag', () => {
    const deepseek = graveOcr.resolveGraveOcrConfig({
      GRAVE_OCR_PROVIDER: 'deepseek',
      OPENROUTER_API_KEY: 'open-key',
      DEEPSEEK_API_KEY: 'deep-key',
      SCAN_OCR_MODEL: 'deepseek-vision-test',
    });
    assert.equal(deepseek.provider, 'deepseek');
    assert.equal(deepseek.apiKey, 'deep-key');
    assert.equal(deepseek.model, 'deepseek-vision-test');

    const gemini = graveOcr.resolveGraveOcrConfig({
      GRAVE_OCR_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'gem-key',
    });
    assert.equal(gemini.provider, 'gemini');
    assert.equal(gemini.model, graveOcr.DEFAULT_GEMINI_MODEL);
    assert.match(gemini.url, /gemini-2\.0-flash:generateContent$/);
  });

  it('asks the model to read Cyrillic text under a portrait', () => {
    assert.match(graveOcr.GRAVE_OCR_PROMPT, /Cyrillic/);
    assert.match(graveOcr.GRAVE_OCR_PROMPT, /curve/i);
    assert.match(graveOcr.GRAVE_OCR_PROMPT, /portrait/i);
    assert.match(graveOcr.GRAVE_OCR_PROMPT, /patronymic/i);
    assert.match(graveOcr.GRAVE_OCR_PROMPT, /fatherNameOrPatronymic/);
  });

  it('parses fenced JSON and Russian dates', () => {
    const parsed = graveOcr.parseGraveOcrResponse([
      '```json',
      JSON.stringify({
        name: 'Иванов Пётр',
        fatherNameOrPatronymic: 'Аронович',
        gregorianDateOfDeath: '2 марта 1991',
        hebrewDateText: 'טז אדר',
        epitaphOrBio: 'Светлая память',
        rawText: 'Иванов\nПётр',
        confidence: 82,
      }),
      '```',
    ].join('\n'));

    assert.equal(parsed.name, 'Иванов Пётр');
    assert.deepEqual(parsed.gregorianDateOfDeath, { year: 1991, month: 3, date: 2 });
    assert.equal(parsed.confidence, 0.82);
    assert.equal(graveOcr.normalizeGregorianDate('02.03.1991').date, 2);
    assert.equal(graveOcr.normalizeGregorianDate('1991-03-02').month, 3);
  });

  it('keeps unreadable model text instead of throwing', () => {
    const parsed = graveOcr.parseGraveOcrResponse('no json here');
    assert.equal(parsed.name, '');
    assert.equal(parsed.rawText, 'no json here');
    assert.equal(parsed.gregorianDateOfDeath, null);
  });

  it('rejects unsafe return paths', () => {
    assert.equal(graveScan.safeScanReturnPath('/s/novosibirsk/scan'), '/s/novosibirsk/scan');
    assert.equal(graveScan.safeScanReturnPath('https://evil.example/s/novosibirsk/scan'), '');
    assert.equal(graveScan.safeScanReturnPath('//evil.example'), '');
    assert.equal(graveScan.scanPathForSlug('/s/other/scan', 'novosibirsk'), '');
  });

  it('escapes epitaph text into the person biography', () => {
    const html = graveScan.buildPersonBiography({
      fatherNameOrPatronymic: 'Аронович',
      hebrewDateText: 'אדר',
      epitaphOrBio: '<script>alert(1)</script>',
    });
    assert.equal(html.includes('<script>'), false);
    assert.match(html, /Аронович/);
    assert.match(html, /alert\(1\)/);
  });

  it('does not call the provider without an API key', async () => {
    await assert.rejects(
      () => graveOcr.scanGraveImage(
        { buffer: Buffer.from('not-a-photo'), mimeType: 'image/jpeg' },
        {
          env: { GRAVE_OCR_PROVIDER: 'openrouter' },
          fetch: async () => {
            throw new Error('network should not be called');
          },
        },
      ),
      (err) => err.code === 'ocr_not_configured',
    );
  });
});

describe('grave scan http', () => {
  let server;
  let photo;
  const createdIds = [];
  const photoFiles = [];
  const originalScan = graveOcr.scanGraveImage;

  before(async () => {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/synagogue', {
      serverSelectionTimeoutMS: 8000,
    });
    photo = await sharp({
      create: {
        width: 24,
        height: 16,
        channels: 3,
        background: { r: 180, g: 160, b: 130 },
      },
    }).jpeg().toBuffer();

    const app = buildApp({ adminSlug: SLUG, adminUsername: null });
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  after(async () => {
    graveOcr.scanGraveImage = originalScan;
    if (createdIds.length) {
      await Synagogue.updateOne(
        { slug: SLUG },
        { $pull: { people: { id: { $in: createdIds } } } },
      );
    }
    await Promise.all(photoFiles.map((filename) => graveScan.removePhotoFile(filename)));
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it('renders the Russian scan page for staff', async () => {
    const page = await request(server, 'GET', `/s/${SLUG}/scan`);
    assert.equal(page.status, 200);
    assert.match(page.body, /Сфотографировать/);
    assert.match(page.body, /Из галереи/);
  });

  it('rejects anonymous scan calls', async () => {
    const anon = http.createServer(buildApp({}));
    await new Promise((resolve) => anon.listen(0, '127.0.0.1', resolve));
    try {
      const page = await request(anon, 'GET', `/s/${SLUG}/scan`);
      assert.equal(page.status, 302);
      assert.match(page.headers.location, /\/admin\/login\?next=/);

      const api = await request(anon, 'POST', `/s/${SLUG}/api/scan-grave`, {
        headers: { 'Content-Type': 'application/json', 'Content-Length': 2 },
        body: '{}',
      });
      assert.equal(api.status, 401);
    } finally {
      await new Promise((resolve) => anon.close(resolve));
    }
  });

  it('returns structured fields from a mocked vision response', async () => {
    const name = `Скан Тест ${Date.now()}`;
    graveOcr.scanGraveImage = async () => ({
      name,
      fatherNameOrPatronymic: 'Аронович',
      gregorianDateOfDeath: { year: 1991, month: 3, date: 2 },
      hebrewDateText: 'טז אדר',
      epitaphOrBio: 'Светлая память',
      rawText: 'Иванов',
      confidence: 0.91,
    });

    try {
      const payload = multipart({}, photo);
      const res = await request(server, 'POST', `/s/${SLUG}/api/scan-grave`, {
        headers: {
          'Content-Type': payload.contentType,
          'Content-Length': payload.body.length,
        },
        body: payload.body,
      });
      assert.equal(res.status, 200);
      const body = res.json();
      assert.equal(body.ok, true);
      assert.equal(body.name, name);
      assert.equal(body.fatherNameOrPatronymic, 'Аронович');
      assert.deepEqual(body.gregorianDateOfDeath, { year: 1991, month: 3, date: 2 });
      assert.equal(body.confidence, 0.91);
      assert.deepEqual(body.matches, []);
    } finally {
      graveOcr.scanGraveImage = originalScan;
    }
  });

  it('sends the image to OpenRouter with the configured model', async () => {
    let seen = null;
    const result = await originalScan(
      { buffer: photo, mimeType: 'image/jpeg' },
      {
        env: {
          GRAVE_OCR_PROVIDER: 'openrouter',
          OPENROUTER_API_KEY: 'test-key',
        },
        fetch: async (url, options) => {
          seen = { url, body: JSON.parse(options.body), authorization: options.headers.Authorization };
          return {
            ok: true,
            json: async () => ({
              choices: [{
                message: {
                  content: JSON.stringify({
                    name: 'Коэн Сара',
                    fatherNameOrPatronymic: '',
                    gregorianDateOfDeath: { year: 2001, month: 1, date: 8 },
                    hebrewDateText: '',
                    epitaphOrBio: '',
                    rawText: 'Коэн Сара',
                    confidence: 0.7,
                  }),
                },
              }],
            }),
          };
        },
      },
    );

    assert.equal(seen.url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(seen.body.model, 'google/gemini-3.8-flash');
    assert.equal(seen.authorization, 'Bearer test-key');
    assert.equal(seen.body.messages[0].content[1].type, 'image_url');
    assert.match(seen.body.messages[0].content[1].image_url.url, /^data:image\/jpeg;base64,/);
    assert.equal(result.name, 'Коэн Сара');
    assert.equal(result.gregorianDateOfDeath.year, 2001);
  });

  it('creates and updates a tenant person with the grave photo', async () => {
    const name = `Плита ${Date.now()}`;
    const createdPayload = multipart({
      name,
      fatherNameOrPatronymic: 'Исаакович',
      date: '4',
      month: '5',
      year: '1988',
      hebrewDateText: 'יז אייר',
      epitaphOrBio: 'Память',
    }, photo);

    const created = await request(server, 'POST', `/s/${SLUG}/api/scan-grave/confirm`, {
      headers: {
        'Content-Type': createdPayload.contentType,
        'Content-Length': createdPayload.body.length,
      },
      body: createdPayload.body,
    });
    assert.equal(created.status, 200, created.body);
    const createdBody = created.json();
    assert.equal(createdBody.created, true);
    assert.equal(createdBody.person.name, name);
    assert.equal(createdBody.person.gregorianDateOfDeath.year, 1988);
    assert.match(createdBody.person.text, /Исаакович/);
    assert.ok(createdBody.person.photo);
    createdIds.push(createdBody.person.id);
    photoFiles.push(createdBody.person.photo);

    const stored = await Synagogue.findOne(
      { slug: SLUG, 'people.id': createdBody.person.id },
      { 'people.$': 1 },
    ).lean();
    assert.equal(stored.people[0].photo, createdBody.person.photo);

    const updatedPayload = multipart({
      personId: String(createdBody.person.id),
      name,
      date: '4',
      month: '5',
      year: '1989',
      epitaphOrBio: 'Обновлено',
    }, photo);
    const updated = await request(server, 'POST', `/s/${SLUG}/api/scan-grave/confirm`, {
      headers: {
        'Content-Type': updatedPayload.contentType,
        'Content-Length': updatedPayload.body.length,
      },
      body: updatedPayload.body,
    });
    assert.equal(updated.status, 200, updated.body);
    const updatedBody = updated.json();
    assert.equal(updatedBody.created, false);
    assert.equal(updatedBody.person.id, createdBody.person.id);
    assert.equal(updatedBody.person.gregorianDateOfDeath.year, 1989);
    photoFiles.push(updatedBody.person.photo);

    const count = await Synagogue.findOne({ slug: SLUG }).lean();
    const sameName = count.people.filter((person) => person.name === name);
    assert.equal(sameName.length, 1);

    const missingName = multipart({ date: '1', month: '1', year: '2000' }, photo);
    const rejected = await request(server, 'POST', `/s/${SLUG}/api/scan-grave/confirm`, {
      headers: {
        'Content-Type': missingName.contentType,
        'Content-Length': missingName.body.length,
      },
      body: missingName.body,
    });
    assert.equal(rejected.status, 400);
    assert.equal(rejected.json().error, 'name_required');
  });
});
