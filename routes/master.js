const express = require('express');
const router = express.Router();
const Synagogue = require('../models/Synagogue');

// Middleware to check master admin auth
const requireMaster = (req, res, next) => {
    if (req.session.isMasterAdmin) {
        return next();
    }
    res.redirect('/master/login');
};

router.get('/login', (req, res) => {
    res.render('master/login', { layout: false });
});

router.post('/login', (req, res) => {
    const { password } = req.body;
    // Simple check against env variable
    if (password === process.env.MASTER_ADMIN_PASSWORD) {
        req.session.isMasterAdmin = true;
        return res.redirect('/master/dashboard');
    }
    res.render('master/login', { error: 'Invalid password', layout: false });
});

router.get('/dashboard', requireMaster, async (req, res) => {
    try {
        const synagogues = await Synagogue.find({});
        res.render('master/dashboard', { synagogues, layout: false });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/add', requireMaster, async (req, res) => {
    try {
        const { name, slug, adminPassword } = req.body;
        const newSynagogue = new Synagogue({
            name,
            slug,
            adminPassword, // Note: In production, hash this!
            title: name
        });
        await newSynagogue.save();
        res.redirect('/master/dashboard');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/delete', requireMaster, async (req, res) => {
    try {
        const { id } = req.body;
        await Synagogue.findByIdAndDelete(id);
        res.redirect('/master/dashboard');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/master/login');
});

module.exports = router;
