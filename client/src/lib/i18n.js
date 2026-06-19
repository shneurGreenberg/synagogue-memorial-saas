import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      search_placeholder: 'Search by name...',
      nearest_dates: 'Upcoming Dates',
      memorial_prayer: 'Memorial Prayer',
      kel_male_rachamim: 'El Malei Rachamim',
      kel_male_rachamim_text:
        'God, full of mercy, Who dwells on high, grant proper rest on the wings of the Divine Presence, among the holy and pure who shine like the sky, to the souls of our brethren, the children of Israel, remembered here and to all the souls of Israel. For we pray for the elevation of their souls. Therefore may the Merciful One shelter them in the shelter of His wings for eternity, and bind their souls in the bond of life. The Lord is their heritage; may they rest in peace upon their beds, and let us say: Amen.',
      izkor: 'Yizkor',
      izkor_text:
        'May God remember the soul of my father, mother, grandfather, uncle, brother, son, or husband (name of the deceased), son of (father\'s name), who has departed this world, in reward for my making a charitable donation without vow, that it be credited to him or her as merit. May his or her soul be bound in the bond of life together with the souls of Abraham, Isaac, and Jacob, Sarah, Rebecca, Rachel, and Leah, and with all the righteous men and women who dwell in the Garden, and let us say: Amen.',
      weekly_chapter: 'Weekly Chapter',
      slideshow_skip: 'Skip slideshow',
      slideshow_loading: 'Loading...',
      clear_search: 'Clear search',
      previous_page: 'Previous page',
      next_page: 'Next page',
      person_not_found: 'Person not found',
      back_to_board: 'Back to memorial board',
      shabbat_enter: 'Shabbat enters',
      shabbat_exit: 'Shabbat ends',
      shabbat_enter_short: 'Enter',
      shabbat_exit_short: 'Exit',
      language: 'Language',
      daily_gates_title: 'Daily study',
      daily_chumash: 'Chumash',
      daily_tehillim: 'Tehillim',
      daily_tanya: 'Tanya',
      daily_rambam: 'Rambam',
      daily_rambam_one: '1 chapter',
      daily_rambam_three: '3 chapters',
      hayom_yom_title: 'Hayom Yom',
      hayom_yom_loading: 'Loading Hayom Yom...',
      upcoming_holidays_title: 'Upcoming holidays',
      sidebar_upcoming_title: 'Upcoming dates & announcements',
      community_announcements: 'Announcements',
    },
  },
  ru: {
    translation: {
      search_placeholder: 'Поиск по имени, фамилии, отчеству',
      nearest_dates: 'Ближайшие даты',
      memorial_prayer: 'Поминальная молитва',
      kel_male_rachamim: 'Эль Мале Рахамим',
      kel_male_rachamim_text:
        'Б-г, исполненный милосердия, обитающий на высотах, даруй истинный покой на крыльях Шехины, среди святых и чистых, сияющих как небеса, душам наших братьев и сестёр, детей Израиля, поминаемых здесь, и всем душам Израиля. Ибо мы молимся о возвышении их душ. Пусть же Владыка милосердия укроет их в тени Своих крыльев навеки и свяжет их души в узел жизни. Господь — их удел; да упокоятся они с миром на ложе своём, и скажем: аминь.',
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
      shabbat_enter: 'Начало Шаббата',
      shabbat_exit: 'Окончание Шаббата',
      shabbat_enter_short: 'Вход',
      shabbat_exit_short: 'Выход',
      language: 'Язык',
      daily_gates_title: 'Лимуд на сегодня',
      daily_chumash: 'Хумаш',
      daily_tehillim: 'Тегилим',
      daily_tanya: 'Тания',
      daily_rambam: 'Рамбам',
      daily_rambam_one: '1 глава',
      daily_rambam_three: '3 главы',
      hayom_yom_title: 'ХаЙом Йом',
      hayom_yom_loading: 'Загрузка ХаЙом Йом...',
      upcoming_holidays_title: 'Ближайшие праздники',
      sidebar_upcoming_title: 'Ближайшие даты и объявления',
      community_announcements: 'Объявления',
    },
  },
  he: {
    translation: {
      search_placeholder: 'חיפוש לפי שם...',
      nearest_dates: 'תאריכים קרובים',
      memorial_prayer: 'תפילת זיכרון',
      kel_male_rachamim: 'אל מלא רחמים',
      kel_male_rachamim_text:
        'אֵל מָלֵא רַחֲמִים, שׁוֹכֵן בַּמְּרוֹמִים, הַמְצֵא מְנוּחָה נְכוֹנָה עַל כַּנְפֵי הַשְּׁכִינָה, בְּמַעֲלוֹת קְדוֹשִׁים וּטְהוֹרִים כְּזוֹהַר הָרָקִיעַ מַזְהִירִים, לְנִשְׁמוֹת אַחֵינוּ וְאַחְיוֹתֵינוּ בְּנֵי יִשְׂרָאֵל הַנִּזְכָּרִים בְּמָקוֹם זֶה וּלְכָל נִשְׁמוֹת יִשְׂרָאֵל. בַּעֲבוּר שֶׁאֲנַחְנוּ מִתְפַּלְּלִים לְעִלּוּי נִשְׁמוֹתֵיהֶם. לָכֵן בַּעַל הָרַחֲמִים יַסְתִּירֵם בְּסֵתֶר כְּנָפָיו לְעוֹלָמִים, וְיִצְרוֹר בִּצְרוֹר הַחַיִּים אֶת נִשְׁמוֹתֵיהֶם, ה׳ הוּא נַחֲלָתָם, וְיָנוּחוּ בְּשָׁלוֹם עַל מִשְׁכָּבָם, וְנֹאמַר אָמֵן.',
      izkor: 'יזכור',
      izkor_text:
        'יִזְכּוֹר אֱלֹהִים נִשְׁמַת אָבִי/אִמִּי (שם הנפטר) בֶּן/בַּת (שם האב), שֶׁהָלַךְ/הָלְכָה לְעוֹלָמוֹ/לְעוֹלָמָהּ, בַּעֲבוּר שֶׁאֲנִי נוֹדֵב צְדָקָה בְּעַד הַזְכָּרַת נִשְׁמָתוֹ/נִשְׁמָתָהּ. תְּהֵא נִשְׁמָתוֹ/נִשְׁמָתָהּ צְרוּרָה בִּצְרוֹר הַחַיִּים עִם נִשְׁמוֹת אַבְרָהָם, יִצְחָק וְיַעֲקֹב, שָׂרָה, רִבְקָה, רָחֵל וְלֵאָה, וְעִם שְׁאָר צַדִּיקִים וְצַדְקָנִיּוֹת הַגְּנוּזִים בַּגַּן, וְנֹאמַר אָמֵן.',
      weekly_chapter: 'פרשת השבוע',
      slideshow_skip: 'דלג על מצגת',
      slideshow_loading: 'טוען...',
      clear_search: 'נקה חיפוש',
      previous_page: 'עמוד קודם',
      next_page: 'עמוד הבא',
      person_not_found: 'לא נמצא',
      back_to_board: 'חזרה ללוח',
      shabbat_enter: 'כניסת שבת',
      shabbat_exit: 'יציאת שבת',
      shabbat_enter_short: 'כניסה',
      shabbat_exit_short: 'יציאה',
      language: 'שפה',
      daily_gates_title: 'לימוד יומי',
      daily_chumash: 'חומש',
      daily_tehillim: 'תהילים',
      daily_tanya: 'תניא',
      daily_rambam: 'רמב"ם',
      daily_rambam_one: 'פרק אחד',
      daily_rambam_three: 'שלושה פרקים',
      hayom_yom_title: 'היום יום',
      hayom_yom_loading: 'טוען היום יום...',
      upcoming_holidays_title: 'חגים קרובים',
      sidebar_upcoming_title: 'תאריכים קרובים והודעות',
      community_announcements: 'הודעות',
    },
  },
};

function getInitialLng() {
  try {
    const stored = sessionStorage.getItem('boardLang');
    if (stored) {
      return stored;
    }
  } catch {
    /* ignore */
  }

  return (window.data && window.data.language) || 'ru';
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLng(),
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
