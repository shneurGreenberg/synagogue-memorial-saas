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
        "are_you_sure": "Are you sure?",
        "photo": "Photo",
        "name": "Name",
        "search_people": "Search by name...",
        "sort_label": "Sort people",
        "sort_by_name": "Sort by name",
        "sort_by_date": "Sort by date",
        "people_subtitle": "Manage memorial entries, photos, and dates.",
        "seed_test_photos": "Generate test photos",
        "seed_test_photos_help": "Downloads sample portraits (randomuser / thispersondoesnotexist) for entries missing files.",
        "seed_photos_done": "Test photos updated",
        "upload_photo": "Upload photo",
        "photo_hint": "JPG or PNG, max 5 MB recommended",
        "cancel": "Cancel",
        "biography": "Biography",
        "day": "Day",
        "month": "Month",
        "year": "Year",
        "settings_subtitle": "Customize the memorial display appearance and languages.",
        "slideshow_subtitle": "Configure automatic slideshow timing and slides.",
        "appearance_section": "Appearance",
        "admin_panel_section": "Admin panel",
        "color_mode": "Admin panel theme",
        "light_mode": "Light mode",
        "dark_mode": "Dark mode",
        "color_mode_help": "Changes only the admin dashboard appearance. The public memorial board keeps its original colors.",
        "board_layout_section": "Board layout",
        "grid_gap": "Grid gap (px)",
        "grid_gap_help": "Space between person tiles on the memorial board.",
        "live_preview": "Live preview",
        "live_preview_help": "Preview how board colors and spacing will look before saving.",
        "import_people": "Import people",
        "import_people_help": "Paste a JSON array of people to add in bulk. Photos are optional filenames already in /photos.",
        "import_schema_hint": "Each person: id (optional), name, gregorianDateOfDeath { month, date, year }, photo, title, text",
        "import_submit": "Import",
        "import_done": "People imported successfully",
        "import_error": "Import failed. Check JSON format.",
        "branding_section": "Branding & images",
        "languages_section": "Languages",
        "slideshow_settings_section": "Slideshow timing",
        "slide_caption_optional": "Caption (optional)",
        "replace_image": "Replace image",
        "current_image": "Current",
        "slideshow_timing_help": "Control when the board switches to slideshow mode.",
        "saved_settings": "Settings saved successfully"
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
        "are_you_sure": "Вы уверены?",
        "photo": "Фото",
        "name": "Имя",
        "search_people": "Поиск по имени...",
        "sort_label": "Сортировка",
        "sort_by_name": "По имени",
        "sort_by_date": "По дате",
        "people_subtitle": "Управление записями, фотографиями и датами.",
        "seed_test_photos": "Тестовые фото",
        "seed_test_photos_help": "Загружает портреты с randomuser / thispersondoesnotexist для записей без файла.",
        "seed_photos_done": "Тестовые фото обновлены",
        "upload_photo": "Загрузить фото",
        "photo_hint": "JPG или PNG",
        "cancel": "Отмена",
        "biography": "Биография",
        "day": "День",
        "month": "Месяц",
        "year": "Год",
        "settings_subtitle": "Настройка внешнего вида мемориальной доски и языков.",
        "slideshow_subtitle": "Настройка автоматической слайдшоу и слайдов.",
        "appearance_section": "Внешний вид",
        "admin_panel_section": "Панель администратора",
        "color_mode": "Тема админ-панели",
        "light_mode": "Светлый режим",
        "dark_mode": "Тёмный режим",
        "color_mode_help": "Меняет только внешний вид админ-панели. Мемориальная доска остаётся с обычными цветами.",
        "board_layout_section": "Макет доски",
        "grid_gap": "Отступ сетки (px)",
        "grid_gap_help": "Расстояние между плитками на мемориальной доске.",
        "live_preview": "Предпросмотр",
        "live_preview_help": "Посмотрите, как будут выглядеть цвета и отступы до сохранения.",
        "import_people": "Импорт людей",
        "import_people_help": "Вставьте JSON-массив людей для массового добавления.",
        "import_schema_hint": "Поля: id (необяз.), name, gregorianDateOfDeath { month, date, year }, photo, title, text",
        "import_submit": "Импортировать",
        "import_done": "Люди успешно импортированы",
        "import_error": "Ошибка импорта. Проверьте формат JSON.",
        "branding_section": "Брендинг и изображения",
        "languages_section": "Языки",
        "slideshow_settings_section": "Тайминг слайдшоу",
        "slide_caption_optional": "Подпись (необязательно)",
        "replace_image": "Заменить изображение",
        "current_image": "Текущее",
        "slideshow_timing_help": "Когда переключаться с доски на слайдшоу.",
        "saved_settings": "Настройки сохранены"
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
        "are_you_sure": "האם אתה בטוח?",
        "photo": "תמונה",
        "name": "שם",
        "search_people": "חיפוש לפי שם...",
        "sort_label": "מיון",
        "sort_by_name": "לפי שם",
        "sort_by_date": "לפי תאריך",
        "people_subtitle": "ניהול רשומות, תמונות ותאריכים.",
        "seed_test_photos": "צור תמונות בדיקה",
        "seed_test_photos_help": "מוריד פורטרטים לדוגמה מ־randomuser / thispersondoesnotexist.",
        "seed_photos_done": "תמונות בדיקה עודכנו",
        "upload_photo": "העלה תמונה",
        "photo_hint": "JPG או PNG",
        "cancel": "ביטול",
        "biography": "ביוגרפיה",
        "day": "יום",
        "month": "חודש",
        "year": "שנה",
        "settings_subtitle": "התאמת מראה לוח הזיכרון והשפות.",
        "slideshow_subtitle": "הגדרת מצגת אוטומטית ושקופיות.",
        "appearance_section": "מראה",
        "admin_panel_section": "לוח ניהול",
        "color_mode": "ערכת לוח הניהול",
        "light_mode": "מצב בהיר",
        "dark_mode": "מצב כהה",
        "color_mode_help": "משנה רק את מראה לוח הניהול. לוח הזיכרון הציבורי נשאר בצבעים הרגילים.",
        "board_layout_section": "פריסת הלוח",
        "grid_gap": "ריווח רשת (px)",
        "grid_gap_help": "מרווח בין אריחי האנשים בלוח הזיכרון.",
        "live_preview": "תצוגה מקדימה",
        "live_preview_help": "צפו איך הצבעים והריווח ייראו לפני השמירה.",
        "import_people": "ייבוא אנשים",
        "import_people_help": "הדביקו מערך JSON של אנשים להוספה מרוכזת.",
        "import_schema_hint": "שדות: id (אופציונלי), name, gregorianDateOfDeath { month, date, year }, photo, title, text",
        "import_submit": "ייבוא",
        "import_done": "האנשים יובאו בהצלחה",
        "import_error": "הייבוא נכשל. בדקו את פורמט ה-JSON.",
        "branding_section": "מיתוג ותמונות",
        "languages_section": "שפות",
        "slideshow_settings_section": "תזמון מצגת",
        "slide_caption_optional": "כיתוב (אופציונלי)",
        "replace_image": "החלף תמונה",
        "current_image": "נוכחי",
        "slideshow_timing_help": "מתי לעבור מהלוח למצגת.",
        "saved_settings": "ההגדרות נשמרו"
    }
};

const getTranslator = (lang) => {
    return (key) => {
        return (translations[lang] || translations['en'])[key] || key;
    };
};

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

const adminViewHelpers = (t) => ({
    t,
    initials: getInitials,
});

router.post('/:slug/settings', requireAdmin, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'tilesBackground', maxCount: 1 }
]), async (req, res) => {
    if (req.params.slug !== req.session.adminSlug) return res.status(403).send('Forbidden');
    try {
        const { title, primaryColor, textColor, language, adminLanguage, colorMode, gridGap } = req.body;
        const safeColorMode = colorMode === 'light' ? 'light' : 'dark';
        const safeGridGap = Math.min(32, Math.max(0, parseInt(gridGap, 10) || 8));
        const updateData = {
            title,
            'theme.primaryColor': primaryColor,
            'theme.textColor': textColor,
            'theme.gridGap': safeGridGap,
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
        const t = getTranslator(synagogue.adminLanguage || 'ru');
        res.render('admin/dashboard', {
            synagogue: enrichSynagogueForAdmin(synagogue),
            layout: 'admin',
            saved: req.query.saved === '1',
            helpers: adminViewHelpers(t)
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
            synagogue: enrichSynagogueForAdmin(synagogue),
            layout: 'admin',
            helpers: adminViewHelpers(t)
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
                            text: sanitizeRichText(text)
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
        const t = getTranslator(synagogue.adminLanguage || 'ru');
        res.render('admin/people', {
            synagogue: enrichSynagogueForAdmin(synagogue),
            layout: 'admin',
            seeded: req.query.seeded === '1',
            imported: req.query.imported === '1',
            importError: req.query.importError === '1',
            helpers: adminViewHelpers(t)
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
