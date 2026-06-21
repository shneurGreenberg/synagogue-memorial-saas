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

module.exports = {
  getPublicSubmissionTranslator,
  resolvePublicSubmissionLang,
  normalizeLang,
  getMonthOptions,
};
