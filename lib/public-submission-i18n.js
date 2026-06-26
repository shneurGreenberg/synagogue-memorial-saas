const STRINGS = {
  en: {
    page_title: 'Add a name to the memorial board',
    intro: 'With respect and care, you may submit the name of your loved one to appear on our digital memorial board. We will include them in our prayers for the elevation of their soul.',
    name_label: 'Full name',
    name_placeholder: 'Enter the full name',
    death_month_label: 'Month of passing',
    death_day_label: 'Day of passing',
    death_year_label: 'Year of passing',
    submit: 'Add to memorial board',
    submitting: 'Submitting… please wait',
    back_to_board: 'Back to memorial board',
    required_error: 'Please fill in all required fields.',
    invalid_date_error: 'Please enter a valid date of passing.',
    disabled_title: 'Submission unavailable',
    disabled_message: 'Public name submission is not available at this time.',
    success_title: 'Name added successfully',
    success_message: 'Thank you. The name has been received with respect and already appears on the memorial board. We will pray for the elevation of their soul.',
    success_continue: 'Continue',
    charity_title: 'Charity in memory of the departed',
    charity_message: 'It is customary to give charity (tzedakah) for the elevation of a departed soul. If you wish, you may contribute through the link below.',
    charity_button: 'Give charity',
    charity_skip: 'Return to memorial board',
    charity_unavailable: 'A donation link has not been configured yet. You may contact the synagogue administration.',
    contact_section_title: 'Family contact',
    contact_section_intro: 'Please provide a contact person we can reach on the yahrzeit day to share that your loved one was remembered in prayer.',
    contact_name_label: 'Contact name',
    contact_name_placeholder: 'Your name or relative\'s name',
    contact_phone_label: 'Phone number',
    contact_phone_placeholder: 'e.g. +972501234567',
    contact_email_label: 'Email address',
    contact_email_placeholder: 'e.g. family@example.com',
    contact_platform_label: 'Preferred way to reach you',
    contact_required_error: 'Please provide a contact name and phone number or email.',
    contact_email_toggle: 'Prefer email? Click here',
    photo_section_title: 'Photo (optional)',
    photo_section_intro: 'You may upload a photo of your loved one and adjust how it appears.',
    photo_upload_label: 'Upload photo',
    photo_crop_zoom: 'Zoom',
    photo_crop_hint: 'Drag the photo to reposition. Use the slider to zoom.',
    upload_error: 'The photo could not be uploaded. Please use a JPG, PNG, or WebP image up to 10 MB.',
    contact_platform_whatsapp: 'WhatsApp',
    contact_platform_telegram: 'Telegram',
    contact_platform_max: 'Max',
    contact_platform_sms: 'SMS',
    contact_platform_email: 'Email',
    contact_platform_none: 'Select a method',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
  ru: {
    page_title: 'Добавить имя на мемориальную доску',
    intro: 'С уважением вы можете передать имя вашего близкого для размещения на цифровой мемориальной доске. Мы включим его в наши молитвы о вознесении души.',
    name_label: 'Полное имя',
    name_placeholder: 'Введите полное имя',
    death_month_label: 'Месяц кончины',
    death_day_label: 'День кончины',
    death_year_label: 'Год кончины',
    submit: 'Добавить на доску',
    submitting: 'Отправка… подождите',
    back_to_board: 'Вернуться к доске',
    required_error: 'Пожалуйста, заполните все обязательные поля.',
    invalid_date_error: 'Пожалуйста, введите корректную дату кончины.',
    disabled_title: 'Подать имя нельзя',
    disabled_message: 'Публичная подача имён сейчас недоступна.',
    success_title: 'Имя успешно добавлено',
    success_message: 'Спасибо. Имя принято с уважением и уже отображается на мемориальной доске. Мы будем молиться о вознесении души.',
    success_continue: 'Продолжить',
    charity_title: 'Цдака в память об усопшем',
    charity_message: 'Принято давать цдаку для вознесения души усопшего. При желании вы можете сделать пожертвование по ссылке ниже.',
    charity_button: 'Пожертвовать',
    charity_skip: 'Вернуться к доске',
    charity_unavailable: 'Ссылка для пожертвований ещё не настроена. Обратитесь в администрацию общины.',
    contact_section_title: 'Контакт родственника',
    contact_section_intro: 'Укажите контактное лицо, с которым мы сможем связаться в день годовщины и сообщить, что усопший был помянут в молитве.',
    contact_name_label: 'Имя контакта',
    contact_name_placeholder: 'Ваше имя или имя родственника',
    contact_phone_label: 'Номер телефона',
    contact_phone_placeholder: 'например, +79001234567',
    contact_email_label: 'Адрес электронной почты',
    contact_email_placeholder: 'например, family@example.com',
    contact_platform_label: 'Удобный способ связи',
    contact_required_error: 'Пожалуйста, укажите имя контакта и телефон или email.',
    contact_email_toggle: 'Предпочитаете email? Нажмите здесь',
    photo_section_title: 'Фото (необязательно)',
    photo_section_intro: 'Можно загрузить фотографию и настроить её отображение.',
    photo_upload_label: 'Загрузить фото',
    photo_crop_zoom: 'Масштаб',
    photo_crop_hint: 'Перетащите фото для позиционирования. Ползунок — для увеличения.',
    upload_error: 'Не удалось загрузить фото. Используйте JPG, PNG или WebP до 10 МБ.',
    contact_platform_whatsapp: 'Ватсап',
    contact_platform_telegram: 'Телеграм',
    contact_platform_max: 'Макс',
    contact_platform_sms: 'SMS',
    contact_platform_email: 'Email',
    contact_platform_none: 'Выберите способ',
    months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  },
  he: {
    page_title: 'הוספת שם ללוח הזיכרון',
    intro: 'בכבוד וביראת כבוד ניתן להוסיף את שם יקירכם ללוח הזיכרון הדיגיטלי. נכלול את שמו בתפילותינו לעילוי נשמתו.',
    name_label: 'שם מלא',
    name_placeholder: 'הזינו את השם המלא',
    death_month_label: 'חודש פטירה',
    death_day_label: 'יום פטירה',
    death_year_label: 'שנת פטירה',
    submit: 'הוספה ללוח הזיכרון',
    submitting: 'שולח… אנא המתינו',
    back_to_board: 'חזרה ללוח',
    required_error: 'נא למלא את כל השדות הנדרשים.',
    invalid_date_error: 'נא להזין תאריך פטירה תקין.',
    disabled_title: 'הוספה אינה זמינה',
    disabled_message: 'הוספת שמות ציבורית אינה פעילה כעת.',
    success_title: 'השם נוסף בהצלחה',
    success_message: 'תודה. השם התקבל בכבוד וכבר מופיע בלוח הזיכרון. נתפלל לעילוי נשמתו.',
    success_continue: 'המשך',
    charity_title: 'צדקה לעילוי נשמת הנפטר',
    charity_message: 'נהוג ליתן צדקה לעילוי נשמת הנפטר. אם תרצו, ניתן לתרום דרך הקישור הבא.',
    charity_button: 'תרומה',
    charity_skip: 'חזרה ללוח',
    charity_unavailable: 'קישור התרומות טרם הוגדר. ניתן לפנות להנהלת בית הכנסת.',
    contact_section_title: 'קרוב משפחה',
    contact_section_intro: 'נא לציין איש קשר שנוכל לפנות אליו ביום השנה ולעדכן שהנפטר הוזכר בתפילה בבית הכנסת.',
    contact_name_label: 'שם איש הקשר',
    contact_name_placeholder: 'שמכם או שם קרוב משפחה',
    contact_phone_label: 'מספר טלפון',
    contact_phone_placeholder: 'לדוגמה: 0501234567',
    contact_email_label: 'כתובת אימייל',
    contact_email_placeholder: 'לדוגמה: family@example.com',
    contact_platform_label: 'אמצעי קשר מועדף',
    contact_required_error: 'נא למלא שם איש קשר ומספר טלפון או כתובת אימייל.',
    contact_email_toggle: 'מעדיף/ה מייל? לחצו כאן',
    photo_section_title: 'תמונה (אופציונלי)',
    photo_section_intro: 'ניתן להעלות תמונה של הנפטר/ת ולהתאים את המיקום והגודל.',
    photo_upload_label: 'העלאת תמונה',
    photo_crop_zoom: 'זום',
    photo_crop_hint: 'גררו את התמונה למיקום. השתמשו במחוון לזום.',
    upload_error: 'לא ניתן היה להעלות את התמונה. השתמשו ב-JPG, PNG או WebP עד 10 מגה.',
    contact_platform_whatsapp: 'וואטסאפ',
    contact_platform_telegram: 'טלגרם',
    contact_platform_max: 'מקס',
    contact_platform_sms: 'SMS',
    contact_platform_email: 'אימייל',
    contact_platform_none: 'ללא בחירה',
    months: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
  },
};

function normalizeLang(lang) {
  return ['ru', 'en', 'he'].includes(lang) ? lang : 'ru';
}

function getPublicSubmissionTranslator(lang) {
  const safe = normalizeLang(lang);
  const table = STRINGS[safe] || STRINGS.ru;

  return function translate(key) {
    const value = table[key];
    if (value !== undefined) {
      return value;
    }
    return STRINGS.ru[key] || key;
  };
}

function resolvePublicSubmissionLang(queryLang, synagogueLang) {
  if (queryLang && ['ru', 'en', 'he'].includes(queryLang)) {
    return queryLang;
  }
  return normalizeLang(synagogueLang);
}

function getMonthOptions(lang) {
  const safe = normalizeLang(lang);
  return (STRINGS[safe].months || STRINGS.ru.months).map((label, index) => ({
    value: String(index + 1),
    label,
  }));
}

const CONTACT_PLATFORM_KEYS = ['whatsapp', 'telegram', 'max', 'sms', 'email'];

function getContactPlatformOptions(lang) {
  const safe = normalizeLang(lang);
  const table = STRINGS[safe] || STRINGS.ru;

  return [
    { value: '', label: table.contact_platform_none || '—' },
    ...CONTACT_PLATFORM_KEYS.map((value) => ({
      value,
      label: table[`contact_platform_${value}`] || value,
    })),
  ];
}

module.exports = {
  getPublicSubmissionTranslator,
  resolvePublicSubmissionLang,
  normalizeLang,
  getMonthOptions,
  getContactPlatformOptions,
};
