const express = require('express');
const router = express.Router();
const Synagogue = require('../models/Synagogue');
const { hashPassword } = require('../lib/password');
const { normalizeSlug, isValidSlug } = require('../lib/normalize-slug');
const { find: findTimezone } = require('geo-tz');

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const NOMINATIM_HEADERS = {
  'User-Agent': 'SynagogueMemorialSaaS/1.0 (master-admin)',
  Accept: 'application/json',
};

function requireMaster(req, res, next) {
    if (req.session.isMasterAdmin) {
        return next();
    }
    res.redirect('/master/login');
}

function requireMasterApi(req, res, next) {
    if (req.session.isMasterAdmin) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
}

function parseLocation(body) {
    const lat = parseFloat(body.lat);
    const long = parseFloat(body.long);
    const city = String(body.city || '').trim();
    let timezone = String(body.timezone || '').trim();

    if (!timezone && Number.isFinite(lat) && Number.isFinite(long)) {
        const zones = findTimezone(lat, long);
        timezone = zones[0] || 'UTC';
    }

    if (!timezone) {
        timezone = 'Asia/Novosibirsk';
    }

    return {
        lat: Number.isFinite(lat) ? lat : 54.9833,
        long: Number.isFinite(long) ? long : 82.8964,
        city: city || 'Community',
        timezone,
    };
}

async function nominatimFetch(path) {
    const response = await fetch(`${NOMINATIM}${path}`, { headers: NOMINATIM_HEADERS });
    if (!response.ok) {
        throw new Error(`Geocoding failed (${response.status})`);
    }
    return response.json();
}

function formatPlace(item) {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const zones = findTimezone(lat, lng);
    const label = item.display_name || item.name || 'Unknown place';

    return {
        label,
        city: item.address?.city
            || item.address?.town
            || item.address?.village
            || item.address?.municipality
            || item.name
            || label.split(',')[0],
        lat,
        lng,
        timezone: zones[0] || 'UTC',
    };
}

router.get('/login', (req, res) => {
    res.render('master/login', { layout: 'master', showMasterNav: false, error: null });
});

router.post('/login', (req, res) => {
    const { password } = req.body;
    const masterPassword = process.env.MASTER_ADMIN_PASSWORD || 'master';

    if (password === masterPassword) {
        req.session.isMasterAdmin = true;
        return res.redirect('/master/dashboard');
    }

    res.render('master/login', { layout: 'master', showMasterNav: false, error: 'Invalid password' });
});

router.get('/api/places', requireMasterApi, async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        if (q.length < 2) {
            return res.json([]);
        }

        const data = await nominatimFetch(
            `/search?format=json&q=${encodeURIComponent(q)}&limit=8&addressdetails=1`,
        );

        res.json((data || []).map(formatPlace));
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

router.get('/api/reverse', requireMasterApi, async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }

        const data = await nominatimFetch(
            `/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        );

        res.json(formatPlace(data));
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

router.get('/dashboard', requireMaster, async (req, res) => {
    try {
        const synagogues = await Synagogue.find({}).sort({ name: 1 }).lean();
        res.render('master/dashboard', {
            synagogues,
            layout: 'master',
            showMasterNav: true,
            showMasterMap: true,
            saved: req.query.saved === '1',
            error: req.query.error || null,
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/add', requireMaster, async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const slug = normalizeSlug(req.body.slug);
        const adminPassword = String(req.body.adminPassword || '');

        if (!name || !slug || !adminPassword) {
            return res.redirect('/master/dashboard?error=missing_fields');
        }

        if (!isValidSlug(slug)) {
            return res.redirect('/master/dashboard?error=invalid_slug');
        }

        const existing = await Synagogue.findOne({ slug });
        if (existing) {
            return res.redirect('/master/dashboard?error=slug_exists');
        }

        const location = parseLocation(req.body);

        const newSynagogue = new Synagogue({
            name,
            slug,
            adminPassword: await hashPassword(adminPassword),
            title: name,
            location,
        });

        await newSynagogue.save();
        res.redirect('/master/dashboard?saved=1');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/edit', requireMaster, async (req, res) => {
    try {
        const id = req.body.id;
        const name = String(req.body.name || '').trim();
        const slug = normalizeSlug(req.body.slug);
        const adminPassword = String(req.body.adminPassword || '').trim();
        const location = parseLocation(req.body);

        if (!id || !name || !slug) {
            return res.redirect('/master/dashboard?error=missing_fields');
        }

        if (!isValidSlug(slug)) {
            return res.redirect('/master/dashboard?error=invalid_slug');
        }

        const duplicate = await Synagogue.findOne({ slug, _id: { $ne: id } });
        if (duplicate) {
            return res.redirect('/master/dashboard?error=slug_exists');
        }

        const update = {
            name,
            slug,
            title: name,
            location,
        };

        if (adminPassword) {
            update.adminPassword = await hashPassword(adminPassword);
        }

        await Synagogue.updateOne({ _id: id }, { $set: update });
        res.redirect('/master/dashboard?saved=1');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/delete', requireMaster, async (req, res) => {
    try {
        const { id } = req.body;
        await Synagogue.findByIdAndDelete(id);
        res.redirect('/master/dashboard?saved=1');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/master/login');
});

module.exports = router;
