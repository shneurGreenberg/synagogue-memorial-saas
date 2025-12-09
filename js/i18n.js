const i18n = require('i18next');
const { initReactI18next } = require('react-i18next');

const resources = {
    en: {
        translation: {
            "search_placeholder": "Search by name...",
            "learn_more": "Learn more",
            "nearest_dates": "Upcoming Dates",
            "memorial_prayer": "Memorial Prayer",
            "izkor": "Yizkor",
            "izkor_text": "May God remember the soul of my father/mother...",
            "weekly_chapter": "Weekly Chapter"
        }
    },
    ru: {
        translation: {
            "search_placeholder": "Поиск по имени, фамилии, отчеству",
            "learn_more": "Узнать больше",
            "nearest_dates": "Ближайшие даты",
            "memorial_prayer": "Поминальная молитва",
            "izkor": "\"Изкор\"",
            "izkor_text": "Пусть вспомнит Б-г душу моего отца/деда/дяди/брата/сына/мужа (имя покойного) сына (имя его отца), ушедшего в иной мир, — в награду за то, что я, не связывая себя обетом, дам пожертвование, чтобы оно было засчитано ему в заслугу. За это да будет душа его пребывать в обители вечной жизни вместе с душами Авраhама, Ицхака и Яакова, Сары, Ривки, Рахели и Леи и прочих праведников и праведниц, обитающих в Ган-Эдене, и скажем: амен!",
            "weekly_chapter": "недельная глава"
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: (window.data && window.data.language) || "ru",
        interpolation: {
            escapeValue: false
        }
    });

module.exports = i18n;
