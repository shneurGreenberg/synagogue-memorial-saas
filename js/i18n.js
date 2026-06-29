const i18n = require('i18next');
const { initReactI18next } = require('react-i18next');

const resources = {
  en: {
    translation: {
      search_placeholder: 'Search by name...',
      nearest_dates: 'Upcoming Dates',
      memorial_prayer: 'Memorial Prayer',
      kel_male_rachamim: 'El Malei Rachamim',
      kel_male_rachamim_text:
        "El malei rachamim, shochen bam'romim, ham'tsei menucha nechonah al kanfei hashchinah, b'ma'alot kedoshim u't'horim k'zohar haraki'a maz'hirim, l'nishmot acheinu v'achoteinu b'nei Yisrael hanizkarim b'makom zeh ul'chol nishmot Yisrael. Ba'avur she-anachnu mitpallelim l'iluy nishmoteihem. Lachen ba'al harachamim yastireim b'seter knafav l'olamim, v'yitzror bitzror hachayim et nishmoteihem, Hashem hu nachalatam, v'yanuchu b'shalom al mishkavam, v'nomar amen.",
      izkor: 'Yizkor',
      izkor_text:
        "Yizkor Elohim nishmat avi/immi (shem haniftar) ben/bat (shem ha'av), she-halach/halchah l'olamo/l'olamah, ba'avur she-ani noded tzedakah ba'ad hazkarat nishmato/nishmatah. Tehei nishmato/nishmatah tzrurah bitzror hachayim im nishmot Avraham, Yitzchak v'Yaakov, Sarah, Rivkah, Rachel v'Leah, v'im she'ar tzadikim v'tzidkaniyot hagnuzim bagan, v'nomar amen.",
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
      nearest_dates: 'Ближайшие даты',
      memorial_prayer: 'Поминальная молитва',
      kel_male_rachamim: 'Эль Мале Рахамим',
      kel_male_rachamim_text:
        'Эль мале рахамим, шохен ба-меромим, hамце менуха некона аль канфей hа-шхина, ба-маалот кдошим у-тhорим ке-зохар hа-ракиа мазhирим, ле-нишмот ахейну ве-ахьотейну бней Исраэль hа-низкарим ба-маком зэ ве-лехол нишмот Исраэль. Баавур ше-анахну митпаллим ле-илуй нишмотейхем. Лахен бааль hа-рахамим ястирим бе-сетер кнафав ле-оламим, ве-йицрор би-црор hа-хаим эт нишмотейхем, h\' ху нахалатам, ве-януху бе-шалом аль мишкавам, ве-номар амен.',
      izkor: '"Изкор"',
      izkor_text:
        'Изкор Эло-им нишмат ави/ими (шэм hанифтар) бен/бат (шэм hа-ав), шэ-халах/халха лэ-оламо/лэ-олама, баавур шэ-ани нодев цдака баад hазкарат нишмато/нишмата. Тээй нишмато/нишмата црура би-црор а-хаим им нишмот Авраам, Ицхак вэ-Яаков, Сара, Ривка, Рахел вэ-Лея, вэ-им шэар цадиким вэ-цидканийот hагнузим ба-ган, вэ-номар амен.',
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
