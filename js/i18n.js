const i18n = require('i18next');
const { initReactI18next } = require('react-i18next');

const resources = {
  en: {
    translation: {
      search_placeholder: 'Search by name...',
      learn_more: 'Learn more',
      nearest_dates: 'Upcoming Dates',
      memorial_prayer: 'Memorial Prayer',
      izkor: 'Yizkor',
      izkor_text: 'May God remember the soul of my father/mother...',
      weekly_chapter: 'Weekly Chapter',
      slideshow_skip: 'Skip slideshow',
      slideshow_loading: 'Loading...',
      clear_search: 'Clear search',
      previous_page: 'Previous page',
      next_page: 'Next page',
      person_not_found: 'Person not found',
      back_to_board: 'Back to memorial board',
    },
  },
  ru: {
    translation: {
      search_placeholder: 'Поиск по имени, фамилии, отчеству',
      learn_more: 'Узнать больше',
      nearest_dates: 'Ближайшие даты',
      memorial_prayer: 'Поминальная молитва',
      izkor: '"Изкор"',
      izkor_text: 'Пусть вспомнит Б-г душу моего отца/деда/дяди/брата/сына/мужа (имя покойного) сына (имя его отца), ушедшего в иной мир, — в награду за то, что я, не связывая себя обетом, дам пожертвование, чтобы оно было засчитано ему в заслугу. За это да будет душа его пребывать в обители вечной жизни вместе с душами Авраhама, Ицхака и Яакова, Сары, Ривки, Рахели и Леи и прочих праведников и праведниц, обитающих в Ган-Эдене, и скажем: амен!',
      weekly_chapter: 'недельная глава',
      slideshow_skip: 'Пропустить слайдшоу',
      slideshow_loading: 'Загрузка...',
      clear_search: 'Очистить поиск',
      previous_page: 'Предыдущая страница',
      next_page: 'Следующая страница',
      person_not_found: 'Человек не найден',
      back_to_board: 'Вернуться к доске',
    },
  },
  he: {
    translation: {
      search_placeholder: 'חיפוש לפי שם...',
      learn_more: 'למידע נוסף',
      nearest_dates: 'תאריכים קרובים',
      memorial_prayer: 'תפילת זיכרון',
      izkor: 'יזכור',
      izkor_text: 'יזכור אלוהים נשמת אבי/אמי...',
      weekly_chapter: 'פרשת השבוע',
      slideshow_skip: 'דלג על מצגת',
      slideshow_loading: 'טוען...',
      clear_search: 'נקה חיפוש',
      previous_page: 'עמוד קודם',
      next_page: 'עמוד הבא',
      person_not_found: 'לא נמצא',
      back_to_board: 'חזרה ללוח',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: (window.data && window.data.language) || 'ru',
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
  });

module.exports = i18n;
