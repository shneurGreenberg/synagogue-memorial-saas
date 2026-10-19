const STRINGS = {
  en: {
    page_title: 'Request to add a name',
    intro: 'Please share your contact details and basic information about your loved one. Our staff will reach out to you and complete the memorial entry with care.',
    invite_page_title: 'Add a name to the memorial board',
    invite_intro: 'You have been invited to submit a memorial entry. With respect, you may include a photo and full details; the name will appear on our digital memorial board after submission.',
    invite_invalid_title: 'Link unavailable',
    invite_invalid_message: 'This invitation link has expired or is no longer valid. Please contact the synagogue office for assistance.',
    name_label: 'Full name of the deceased',
    name_placeholder: 'Enter the full name',
    relation_label: 'Your relationship to the deceased',
    relation_placeholder: 'For example: son, daughter, niece',
    deceased_notes_label: 'Additional notes (optional)',
    deceased_notes_placeholder: 'Anything that may help us prepare the entry',
    death_month_label: 'Month of passing',
    death_day_label: 'Day of passing',
    death_year_label: 'Year of passing',
    submit: 'Send request',
    submit_invite: 'Add to memorial board',
    submitting: 'Submitting… please wait',
    back_to_board: 'Back to memorial board',
    required_error: 'Please fill in all required fields.',
    invalid_date_error: 'Please enter a valid date of passing.',
    disabled_title: 'Submission unavailable',
    disabled_message: 'Public name submission is not available at this time.',
    success_title: 'Name added successfully',
    success_message: 'Thank you. The name has been received with respect and already appears on the memorial board. We will pray for the elevation of their soul.',
    request_success_title: 'Request received',
    request_success_message: 'Thank you. We have received your request with care. A member of our staff will contact you soon to complete the memorial entry.',
    success_continue: 'Continue',
    charity_title: 'Charity in memory of the departed',
    charity_message: 'It is customary to give charity (tzedakah) for the elevation of a departed soul. If you wish, you may contribute through the link below.',
    charity_button: 'Give charity',
    charity_skip: 'Return to memorial board',
    charity_unavailable: 'A donation link has not been configured yet. You may contact the synagogue administration.',
    contact_section_title: 'Your contact details',
    contact_section_intro: 'So we can reach you to complete the memorial entry and, if you wish, notify you on the yahrzeit.',
    contact_name_label: 'Your name',
    contact_name_placeholder: 'How we should address you',
    contact_phone_label: 'Phone number',
    contact_phone_placeholder: 'e.g. +972501234567',
    contact_email_label: 'Email address',
    contact_email_placeholder: 'e.g. family@example.com',
    contact_platform_label: 'Preferred way to reach you',
    contact_required_error: 'Please provide your name and a phone number (or email for invite submissions).',
    contact_email_toggle: 'Add email (optional)',
    photo_section_title: 'Photo (optional)',
    photo_section_intro: 'You may upload a photo of your loved one and adjust how it appears.',
    photo_upload_label: 'Upload photo',
    photo_crop_zoom: 'Zoom',
    photo_crop_hint: 'Drag the photo to reposition. Use the slider to zoom.',
    upload_error: 'The photo could not be uploaded. Please use a JPG, PNG, or WebP image.',
    contact_platform_whatsapp: 'WhatsApp',
    contact_platform_telegram: 'Telegram',
    contact_platform_max: 'Max',
    contact_platform_sms: 'SMS',
    contact_platform_email: 'Email',
    contact_platform_none: 'Select a method',
    deceased_section_title: 'About the deceased',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
  ru: {
    page_title: 'Заявка на добавление имени',
    intro: 'Пожалуйста, оставьте свои контактные данные и основную информацию об усопшем. Сотрудники общины свяжутся с вами и с уважением оформят запись на мемориальной доске.',
    invite_page_title: 'Добавление имени на мемориальную доску',
    invite_intro: 'Вам отправили персональную ссылку для подачи данных. Вы можете указать полное имя, дату кончины и при желании загрузить фотографию — после отправки имя появится на цифровой мемориальной доске общины.',
    invite_invalid_title: 'Ссылка недействительна',
    invite_invalid_message: 'Срок действия этой ссылки истёк, либо она была отозвана. Пожалуйста, обратитесь в администрацию общины.',
    name_label: 'Полное имя усопшего',
    name_placeholder: 'Укажите полное имя',
    relation_label: 'Ваша связь с усопшим',
    relation_placeholder: 'Например: сын, дочь, племянница',
    deceased_notes_label: 'Дополнительные сведения (необязательно)',
    deceased_notes_placeholder: 'Всё, что может помочь нам подготовить запись',
    death_month_label: 'Месяц кончины',
    death_day_label: 'День',
    death_year_label: 'Год',
    submit: 'Отправить заявку',
    submit_invite: 'Добавить на доску',
    submitting: 'Отправка… пожалуйста, подождите',
    back_to_board: 'Вернуться к доске',
    required_error: 'Пожалуйста, заполните все обязательные поля.',
    invalid_date_error: 'Укажите корректную дату кончины.',
    disabled_title: 'Приём заявок недоступен',
    disabled_message: 'Публичная подача заявок сейчас отключена.',
    success_title: 'Имя успешно добавлено',
    success_message: 'Благодарим вас. Данные приняты с уважением; имя уже отображается на мемориальной доске. Мы будем поминать усопшего в наших молитвах.',
    request_success_title: 'Заявка принята',
    request_success_message: 'Благодарим вас. Мы бережно приняли вашу заявку. В ближайшее время с вами свяжется сотрудник общины, чтобы завершить оформление записи.',
    success_continue: 'Продолжить',
    charity_title: 'Цдака в память об усопшем',
    charity_message: 'Принято давать цдаку для вознесения души усопшего. При желании вы можете сделать пожертвование по ссылке ниже.',
    charity_button: 'Сделать пожертвование',
    charity_skip: 'Вернуться к доске',
    charity_unavailable: 'Ссылка для пожертвований пока не настроена. Вы можете обратиться в администрацию общины.',
    contact_section_title: 'Ваши контактные данные',
    contact_section_intro: 'Чтобы мы могли связаться с вами для уточнения данных и, при вашем желании, напомнить о дне годовщины.',
    contact_name_label: 'Ваше имя',
    contact_name_placeholder: 'Как к вам обращаться',
    contact_phone_label: 'Номер телефона',
    contact_phone_placeholder: 'например, +79001234567',
    contact_email_label: 'Электронная почта',
    contact_email_placeholder: 'например, family@example.com',
    contact_platform_label: 'Удобный способ связи',
    contact_required_error: 'Укажите ваше имя и номер телефона.',
    contact_email_toggle: 'Добавить e-mail (необязательно)',
    photo_section_title: 'Фотография (необязательно)',
    photo_section_intro: 'При желании загрузите фотографию усопшего и настройте кадрирование.',
    photo_upload_label: 'Загрузить фото',
    photo_crop_zoom: 'Масштаб',
    photo_crop_hint: 'Перетащите фото для позиционирования. Ползунок регулирует увеличение.',
    upload_error: 'Не удалось загрузить фото. Используйте файл JPG, PNG или WebP.',
    contact_platform_whatsapp: 'WhatsApp',
    contact_platform_telegram: 'Telegram',
    contact_platform_max: 'MAX',
    contact_platform_sms: 'SMS',
    contact_platform_email: 'E-mail',
    contact_platform_none: 'Выберите способ',
    deceased_section_title: 'Об усопшем',
    months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  },
  he: {
    page_title: 'בקשה להוספת שם',
    intro: 'נא למלא פרטי קשר ומידע בסיסי על הנפטר/ת. צוות בית הכנסת ייצור קשר וישלים את הרישום בלוח הזיכרון.',
    invite_page_title: 'הוספת שם ללוח הזיכרון',
    invite_intro: 'הוזמנתם למלא טופס מלא. ניתן לצרף תמונה ופרטים; השם יופיע בלוח הזיכרון לאחר השליחה.',
    invite_invalid_title: 'הקישור לא זמין',
    invite_invalid_message: 'תוקף הקישור פג או שהוא בוטל. פנו להנהלת בית הכנסת.',
    name_label: 'שם מלא של הנפטר/ת',
    name_placeholder: 'הזינו את השם המלא',
    relation_label: 'קירבה לנפטר/ת',
    relation_placeholder: 'למשל: בן, בת, אחיינית',
    deceased_notes_label: 'הערות נוספות (אופציונלי)',
    deceased_notes_placeholder: 'מידע שיעזור לנו להכין את הרישום',
    death_month_label: 'חודש פטירה',
    death_day_label: 'יום פטירה',
    death_year_label: 'שנת פטירה',
    submit: 'שליחת בקשה',
    submit_invite: 'הוספה ללוח הזיכרון',
    submitting: 'שולח… אנא המתינו',
    back_to_board: 'חזרה ללוח',
    required_error: 'נא למלא את כל השדות הנדרשים.',
    invalid_date_error: 'נא להזין תאריך פטירה תקין.',
    disabled_title: 'הוספה אינה זמינה',
    disabled_message: 'הוספת שמות ציבורית אינה פעילה כעת.',
    success_title: 'השם נוסף בהצלחה',
    success_message: 'תודה. השם התקבל בכבוד וכבר מופיע בלוח הזיכרון. נתפלל לעילוי נשמתו.',
    request_success_title: 'הבקשה התקבלה',
    request_success_message: 'תודה. קיבלנו את בקשתכם. נציג מהצוות ייצור קשר להשלמת הרישום.',
    success_continue: 'המשך',
    charity_title: 'צדקה לעילוי נשמת הנפטר',
    charity_message: 'נהוג ליתן צדקה לעילוי נשמת הנפטר. אם תרצו, ניתן לתרום דרך הקישור הבא.',
    charity_button: 'תרומה',
    charity_skip: 'חזרה ללוח',
    charity_unavailable: 'קישור התרומות טרם הוגדר. ניתן לפנות להנהלת בית הכנסת.',
    contact_section_title: 'פרטי הקשר שלכם',
    contact_section_intro: 'כדי שנוכל ליצור קשר להשלמת הרישום ולעדכן ביום השנה, אם תרצו.',
    contact_name_label: 'שמכם',
    contact_name_placeholder: 'איך לפנות אליכם',
    contact_phone_label: 'מספר טלפון',
    contact_phone_placeholder: 'לדוגמה: 0501234567',
    contact_email_label: 'כתובת אימייל',
    contact_email_placeholder: 'לדוגמה: family@example.com',
    contact_platform_label: 'אמצעי קשר מועדף',
    contact_required_error: 'נא למלא שמכם ומספר טלפון.',
    contact_email_toggle: 'הוספת אימייל (אופציונלי)',
    photo_section_title: 'תמונה (אופציונלי)',
    photo_section_intro: 'ניתן להעלות תמונה של הנפטר/ת ולהתאים את המיקום והגודל.',
    photo_upload_label: 'העלאת תמונה',
    photo_crop_zoom: 'זום',
    photo_crop_hint: 'גררו את התמונה למיקום. השתמשו במחוון לזום.',
    upload_error: 'לא ניתן היה להעלות את התמונה. השתמשו ב-JPG, PNG או WebP.',
    contact_platform_whatsapp: 'וואטסאפ',
    contact_platform_telegram: 'טלגרם',
    contact_platform_max: 'מקס',
    contact_platform_sms: 'SMS',
    contact_platform_email: 'אימייל',
    contact_platform_none: 'ללא בחירה',
    deceased_section_title: 'על הנפטר/ת',
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
