const express = require('express');
const router = express.Router();
const Synagogue = require('../models/Synagogue');
const { hashPassword } = require('../lib/password');

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requireMaster(req, res, next) {
    if (req.session.isMasterAdmin) {
        return next();
    }
    res.redirect('/master/login');
}

function parseLocation(body) {
    const lat = parseFloat(body.lat);
    const long = parseFloat(body.long);
    const city = String(body.city || '').trim();
    const timezone = String(body.timezone || 'Asia/Novosibirsk').trim() || 'Asia/Novosibirsk';

    return {
        lat: Number.isFinite(lat) ? lat : 54.9833,
        long: Number.isFinite(long) ? long : 82.8964,
        city: city || 'Community',
        timezone,
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

router.get('/dashboard', requireMaster, async (req, res) => {
    try {
        const synagogues = await Synagogue.find({}).sort({ name: 1 }).lean();
        res.render('master/dashboard', {
            synagogues,
            layout: 'master',
            showMasterNav: true,
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
        const slug = String(req.body.slug || '').trim().toLowerCase();
        const adminPassword = String(req.body.adminPassword || '');

        if (!name || !slug || !adminPassword) {
            return res.redirect('/master/dashboard?error=missing_fields');
        }

        if (!SLUG_PATTERN.test(slug)) {
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
        const slug = String(req.body.slug || '').trim().toLowerCase();
        const adminPassword = String(req.body.adminPassword || '').trim();
        const location = parseLocation(req.body);

        if (!id || !name || !slug) {
            return res.redirect('/master/dashboard?error=missing_fields');
        }

        if (!SLUG_PATTERN.test(slug)) {
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
