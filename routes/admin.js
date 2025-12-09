const express = require('express');
const router = express.Router();
const Synagogue = require('../models/Synagogue');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
        if (synagogue && synagogue.adminPassword === password) {
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

const translations = {
    en: {
        "settings": "Settings",
        "title": "Title",
        "primary_color": "Primary Color",
        "text_color": "Text Color",
        "logo": "Community Logo",
        "background_image": "Background Image",
        "tiles_background": "Tiles Background",
        "language": "Display Language",
        "admin_language": "Admin Panel Language",
        "save": "Save Settings",
        "people": "People",
        "slideshow": "Slideshow",
        "logout": "Logout",
        "image": "Image",
        "text": "Text",
        "add": "Add",
        "delete": "Delete",
        "current_slides": "Current Slides",
        "no_slides": "No slides added yet.",
        "enable_slideshow": "Enable Slideshow",
        "slide_duration": "Slide Duration (seconds)",
        "main_duration": "Main View Duration (seconds)",
        "main_duration_help": "How long to show the Kadish list before switching to slides.",
        "add_new_slide": "Add New Slide",
        "add_person": "Add Person",
        "date_of_death": "Date of Death",
        "actions": "Actions",
        "no_photo": "No Photo",
        "edit": "Edit",
        "current_photo": "Current Photo",
        "change_photo": "Change Photo",
        "delete_photo": "Delete current photo",
        "save_changes": "Save Changes",
        "date_gregorian": "Date of Death (Gregorian)",
        "are_you_sure": "Are you sure?"
    },
    ru: {
        "settings": "Настройки",
        "title": "Название",
        "primary_color": "Основной цвет",
        "text_color": "Цвет текста",
        "logo": "Логотип",
        "background_image": "Фоновое изображение",
        "tiles_background": "Фон плиток",
        "language": "Язык отображения",
        "admin_language": "Язык админ-панели",
        "save": "Сохранить настройки",
        "people": "Люди",
        "slideshow": "Слайдшоу",
        "logout": "Выйти",
        "image": "Изображение",
        "text": "Текст",
        "add": "Добавить",
        "delete": "Удалить",
        "current_slides": "Текущие слайды",
        "no_slides": "Слайды не добавлены.",
        "enable_slideshow": "Включить слайдшоу",
        "slide_duration": "Длительность слайда (сек)",
        "main_duration": "Длительность главного экрана (сек)",
        "main_duration_help": "Как долго показывать список Кадиш перед переключением на слайды.",
        "add_new_slide": "Добавить новый слайд",
        "add_person": "Добавить человека",
        "date_of_death": "Дата смерти",
        "actions": "Действия",
        "no_photo": "Нет фото",
        "edit": "Редактировать",
        "current_photo": "Текущее фото",
        "change_photo": "Изменить фото",
        "delete_photo": "Удалить текущее фото",
        "save_changes": "Сохранить изменения",
        "date_gregorian": "Дата смерти (Григорианская)",
        "are_you_sure": "Вы уверены?"
    },
    he: {
        "settings": "הגדרות",
        "title": "כותרת",
        "primary_color": "צבע ראשי",
        "text_color": "צבע טקסט",
        "logo": "לוגו הקהילה",
        "background_image": "תמונת רקע",
        "tiles_background": "רקע אריחים",
        "language": "שפת תצוגה",
        "admin_language": "שפת ממשק ניהול",
        "save": "שמור הגדרות",
        "people": "אנשים",
        "slideshow": "מצגת",
        "logout": "התנתק",
        "image": "תמונה",
        "text": "טקסט",
        "add": "הוסף",
        "delete": "מחק",
        "current_slides": "שקופיות נוכחיות",
        "no_slides": "לא נוספו שקופיות.",
        "enable_slideshow": "הפעל מצגת",
        "slide_duration": "משך שקופית (שניות)",
        "main_duration": "משך תצוגה ראשית (שניות)",
        "main_duration_help": "כמה זמן להציג את רשימת הקדיש לפני המעבר לשקופיות.",
        "add_new_slide": "הוסף שקופית חדשה",
        "add_person": "הוסף אדם",
        "date_of_death": "תאריך פטירה",
        "actions": "פעולות",
        "no_photo": "אין תמונה",
        "edit": "ערוך",
        "current_photo": "תמונה נוכחית",
        "change_photo": "שנה תמונה",
        "delete_photo": "מחק תמונה נוכחית",
        "save_changes": "שמור שינויים",
        "date_gregorian": "תאריך פטירה (לועזי)",
        "are_you_sure": "האם אתה בטוח?"
    }
};

const getTranslator = (lang) => {
    return (key) => {
        return (translations[lang] || translations['en'])[key] || key;
    };
};

router.post('/:slug/settings', requireAdmin, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'tilesBackground', maxCount: 1 }
]), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { title, primaryColor, textColor, language, adminLanguage } = req.body;
        const updateData = {
            title,
            'theme.primaryColor': primaryColor,
            'theme.textColor': textColor,
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
        res.redirect(`/admin/${req.params.slug}/dashboard`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/:slug/dashboard', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        const t = getTranslator(synagogue.adminLanguage || 'ru');
        res.render('admin/dashboard', {
            synagogue,
            layout: 'admin',
            helpers: { t }
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
        const t = getTranslator(synagogue.adminLanguage || 'ru');
        res.render('admin/slideshow', {
            synagogue,
            layout: 'admin',
            helpers: { t }
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
        res.redirect(`/admin/${req.params.slug}/slideshow`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/slideshow/add', requireAdmin, upload.single('image'), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { text } = req.body;
        if (req.file) {
            await Synagogue.updateOne(
                { slug: req.params.slug },
                {
                    $push: {
                        'slideshow.images': {
                            url: req.file.filename,
                            text: text
                        }
                    }
                }
            );
        }
        res.redirect(`/admin/${req.params.slug}/slideshow`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/:slug/slideshow/delete', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { slideId } = req.body;
        // Use pull with _id if we had it, but images are subdocuments so they should have _id created by mongoose
        await Synagogue.updateOne(
            { slug: req.params.slug },
            { $pull: { 'slideshow.images': { _id: slideId } } }
        );
        res.redirect(`/admin/${req.params.slug}/slideshow`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// People Management
router.get('/:slug/people', requireAdmin, async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const synagogue = await Synagogue.findOne({ slug: req.params.slug });
        const t = getTranslator(synagogue.adminLanguage || 'ru');
        res.render('admin/people', {
            synagogue,
            layout: 'admin',
            helpers: { t }
        });
    } catch (err) {
        res.status(500).send(err.message);
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
            text,
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
            'people.$.text': text,
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
