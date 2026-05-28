const express = require('express');
const router = express.Router();
const Synagogue = require('../models/Synagogue');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyPassword, ensureHashed, hashPassword } = require('../lib/password');
const { sanitizeRichText } = require('../lib/sanitize');
const { seedPhotosForSynagogue } = require('../lib/seed-people-photos');
const { enrichSynagogueForAdmin } = require('../lib/admin-theme');
const { getTranslator } = require('../lib/admin-translations');

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'photo') {
            const dir = 'photos/';
            if (!fs.existsSync(dir)) fs.mkdirSync(dir);
            cb(null, dir);
        } else {
            const dir = 'images/';
            if (!fs.existsSync(dir)) fs.mkdirSync(dir);
            cb(null, dir);
        }
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});

const upload = multer({ storage: storage });

// Middleware to check auth
const requireAdmin = (req, res, next) => {
    if (req.session.adminSlug) {
        return next();
    }
    res.redirect('/admin/login');
};

router.get('/login', (req, res) => {
    res.render('admin/login', { layout: false });
});

router.post('/login', async (req, res) => {
    const { slug, password } = req.body;
    try {
        const synagogue = await Synagogue.findOne({ slug }).select('+adminPassword');
        if (synagogue && await verifyPassword(password, synagogue.adminPassword)) {
            const hashed = await ensureHashed(password, synagogue.adminPassword);
            if (hashed) {
                await Synagogue.updateOne({ slug }, { $set: { adminPassword: hashed } });
            }
            req.session.adminSlug = slug;
            return res.redirect(`/admin/${slug}/dashboard`);
        }
        res.render('admin/login', { error: 'Invalid credentials', layout: false });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

const getInitials = (name) => {
    if (!name) {
        return '?';
    }

    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
};

function renderAdmin(res, view, options = {}) {
    const synagogue = options.synagogue;
    const lang = (synagogue && synagogue.adminLanguage) || 'ru';

    res.render(view, {
        ...options,
        _adminT: getTranslator(lang),
        layout: options.layout === false ? false : (options.layout || 'admin'),
    });
}

function wantsJson(req) {
    return req.get('X-Requested-With') === 'XMLHttpRequest' || req.query.ajax === '1';
}

async function fetchSlideshow(slug) {
    const doc = await Synagogue.findOne({ slug }).lean();
    return doc ? doc.slideshow : null;
}

router.post('/:slug/settings', requireAdmin, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'tilesBackground', maxCount: 1 }
]), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { title, titleRu, titleEn, titleHe, primaryColor, textColor, language, adminLanguage, colorMode } = req.body;
        const safeColorMode = colorMode === 'light' ? 'light' : 'dark';
        const updateData = {
            title,
            'titles.ru': titleRu ? String(titleRu).trim() : '',
            'titles.en': titleEn ? String(titleEn).trim() : '',
            'titles.he': titleHe ? String(titleHe).trim() : '',
            'theme.primaryColor': primaryColor,
            'theme.textColor': textColor,
            'adminTheme.colorMode': safeColorMode,
            language,
            adminLanguage
        };

        if (req.files['logo']) {
            updateData['theme.logo'] = req.files['logo'][0].filename;
        }
        if (req.files['backgroundImage']) {
            updateData['theme.backgroundImage'] = req.files['backgroundImage'][0].filename;
        }
        if (req.files['tilesBackground']) {
            updateData['theme.tilesBackground'] = req.files['tilesBackground'][0].filename;
        }

        await Synagogue.updateOne({ slug: req.params.slug }, {
            $set: updateData
        });
        res.redirect(`/admin/${req.params.slug}/dashboard?saved=1`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/:slug/dashboard', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        renderAdmin(res, 'admin/dashboard', {
            synagogue: enrichSynagogueForAdmin(synagogue),
            saved: req.query.saved === '1',
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Slideshow Management
router.get('/:slug/slideshow', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        renderAdmin(res, 'admin/slideshow', {
            synagogue: enrichSynagogueForAdmin(synagogue),
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/slideshow/settings', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { enabled, interval, mainDuration } = req.body;
        await Synagogue.updateOne({ slug: req.params.slug }, {
            $set: {
                'slideshow.enabled': !!enabled,
                'slideshow.interval': parseInt(interval),
                'slideshow.mainDuration': parseInt(mainDuration)
            }
        });
        return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/slideshow/add', requireAdmin, upload.single('image'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { text } = req.body;
        if (!req.file) {
            return res.status(400).json({ ok: false, error: 'Image is required' });
        }
        await Synagogue.updateOne(
            { slug: req.params.slug },
            {
                $push: {
                    'slideshow.images': {
                        url: req.file.filename,
                        text: sanitizeRichText(text)
                    }
                }
            }
        );
        return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/slideshow/edit', requireAdmin, upload.single('image'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { slideId, text } = req.body;
        const updateFields = {
            'slideshow.images.$.text': sanitizeRichText(text || ''),
        };

        if (req.file) {
            updateFields['slideshow.images.$.url'] = req.file.filename;
        }

        await Synagogue.updateOne(
            { slug: req.params.slug, 'slideshow.images._id': slideId },
            { $set: updateFields },
        );
        return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/:slug/slideshow/delete', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { slideId } = req.body;
        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $pull: { 'slideshow.images': { _id: slideId } } }
        );
        return res.json({ ok: true, slideshow: await fetchSlideshow(req.params.slug) });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/:slug/preview-board', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    const query = new URLSearchParams(req.query).toString();
    const target = `/s/${req.params.slug}${query ? `?${query}` : ''}`;
    return res.redirect(target);
});

function normalizeImportedPerson(raw, fallbackId) {
    const death = raw.gregorianDateOfDeath || raw.dateOfDeath || {};
    return {
        id: fallbackId,
        name: String(raw.name || '').trim(),
        text: sanitizeRichText(raw.text || ''),
        title: raw.title ? String(raw.title) : '',
        photo: raw.photo ? String(raw.photo) : '',
        gregorianDateOfDeath: {
            month: parseInt(death.month, 10) || 1,
            date: parseInt(death.date, 10) || 1,
            year: parseInt(death.year, 10) || 1900,
        },
    };
}

// People Management
router.get('/:slug/people', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        renderAdmin(res, 'admin/people', {
            synagogue: enrichSynagogueForAdmin(synagogue),
            seeded: req.query.seeded === '1',
            imported: req.query.imported === '1',
            importError: req.query.importError === '1',
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/people/import', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        let payload = req.body.people;

        if (typeof req.body.json === 'string' && req.body.json.trim()) {
            payload = JSON.parse(req.body.json);
        }

        if (!Array.isArray(payload)) {
            throw new Error('Expected a JSON array of people');
        }

        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        const usedIds = new Set(synagogue.people.map((person) => person.id));
        let maxId = synagogue.people.reduce((max, person) => (person.id > max ? person.id : max), 0);

        const newPeople = payload
            .filter((raw) => raw && String(raw.name || '').trim())
            .map((raw) => {
                let id = parseInt(raw.id, 10);
                if (!Number.isFinite(id) || usedIds.has(id)) {
                    maxId += 1;
                    id = maxId;
                } else {
                    maxId = Math.max(maxId, id);
                }
                usedIds.add(id);
                return normalizeImportedPerson(raw, id);
            });

        if (newPeople.length > 0) {
            await Synagogue.updateOne(
                { slug: req.params.slug },
                { $push: { people: { $each: newPeople } } },
            );
        }

        return res.redirect(`/admin/${req.params.slug}/people?imported=1`);
    } catch (err) {
        console.error('People import error:', err);
        return res.redirect(`/admin/${req.params.slug}/people?importError=1`);
    }
});

router.post('/:slug/people/add', requireAdmin, upload.single('photo'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { name, text, month, date, year } = req.body;
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        const maxId = synagogue.people.reduce((max, p) => p.id > max ? p.id : max, 0);

        const newPerson = {
            id: maxId + 1,
            name,
            text: sanitizeRichText(text),
            gregorianDateOfDeath: { month: parseInt(month), date: parseInt(date), year: parseInt(year) },
            photo: req.file ? req.file.filename : '',
            title: ''
        };

        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $push: { people: newPerson } }
        );
        res.redirect(`/admin/${req.params.slug}/people`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/people/edit', requireAdmin, upload.single('photo'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { id, name, text, month, date, year, deletePhoto } = req.body;
        const personId = parseInt(id);

        const updateFields = {
            'people.$.name': name,
            'people.$.text': sanitizeRichText(text),
            'people.$.gregorianDateOfDeath': { month: parseInt(month), date: parseInt(date), year: parseInt(year) }
        };

        if (req.file) {
            updateFields['people.$.photo'] = req.file.filename;
        } else if (deletePhoto) {
            updateFields['people.$.photo'] = '';
        }

        await Synagogue.updateOne(
            { slug: req.params.slug, 'people.id': personId },
            { $set: updateFields }
        );
        res.redirect(`/admin/${req.params.slug}/people`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/people/seed-test-photos', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        await seedPhotosForSynagogue(req.params.slug, {
            source: 'mixed',
            force: false,
            limit: 25,
        });
        res.redirect(`/admin/${req.params.slug}/people?seeded=1`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/people/delete', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { id } = req.body;
        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $pull: { people: { id: parseInt(id) } } }
        );
        res.redirect(`/admin/${req.params.slug}/people`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;
