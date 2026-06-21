const { normalizePersonContact } = require('./person-contact');

function normalizeLang(lang) {
  return ['ru', 'en', 'he'].includes(lang) ? lang : 'ru';
}

function getContactSalutation(contact, lang) {
  const normalized = normalizePersonContact(contact);
  const name = normalized.name;

  if (lang === 'he') {
    return name ? `מר/גב' ${name} היקר/ה` : 'שלום רב';
  }

  if (lang === 'en') {
    return name ? `Dear ${name}` : 'Dear friend';
  }

  return name ? `Уважаемый(ая) ${name}` : 'Здравствуйте';
}

function buildYahrzeitMessage({
  synagogueName,
  deceasedName,
  contact,
  donationUrl,
  lang,
}) {
  const safeLang = normalizeLang(lang);
  const salutation = getContactSalutation(contact, safeLang);
  const community = synagogueName || '';

  if (safeLang === 'he') {
    let message = `${salutation},\n\n`;
    message += `היום ב${community ? `${community} ` : ''}בית הכנסת הזכרנו את ${deceasedName} לתפילה לרגל יום השנה שלו/ה. `;
    message += 'נזכרנו את נשמתו/ה בתפילה ובקדיש, ומבקשים כי זכרו/ה יהיה לברכה.\n\n';
    if (donationUrl) {
      message += `נהוג ביום השנה לתת צדקה לעילוי נשמת הנפטר. ניתן לתרום כאן: ${donationUrl}`;
    } else {
      message += 'נהוג ביום השנה לתת צדקה לעילוי נשמת הנפטר.';
    }
    return message;
  }

  if (safeLang === 'en') {
    let message = `${salutation},\n\n`;
    message += `Today at ${community || 'our synagogue'} we remembered ${deceasedName} in prayer on the occasion of their yahrzeit. `;
    message += 'We prayed for the elevation of their soul and that their memory be for a blessing.\n\n';
    if (donationUrl) {
      message += `It is customary to give charity on a yahrzeit. You may contribute here: ${donationUrl}`;
    } else {
      message += 'It is customary to give charity on a yahrzeit for the elevation of the soul.';
    }
    return message;
  }

  let message = `${salutation},\n\n`;
  message += `Сегодня в ${community || 'нашей общине'} мы помянули ${deceasedName} в молитве в день годовщины кончины. `;
  message += 'Мы молились об упокоении души и о том, чтобы память о нем/ней была благословением.\n\n';
  if (donationUrl) {
    message += `В день годовщины принято давать цдаку. Пожертвование можно сделать по ссылке: ${donationUrl}`;
  } else {
    message += 'В день годовщины принято давать цдаку для вознесения души.';
  }
  return message;
}

function buildAdminReminderSubject(synagogueName, count, lang) {
  const safeLang = normalizeLang(lang);
  const name = synagogueName || '';

  if (safeLang === 'he') {
    return count === 1
      ? `תזכורת יום שנה — ${name}`
      : `תזכורת: ${count} ימי שנה היום — ${name}`;
  }

  if (safeLang === 'en') {
    return count === 1
      ? `Yahrzeit reminder — ${name}`
      : `Yahrzeit reminder: ${count} today — ${name}`;
  }

  return count === 1
    ? `Напоминание о годовщине — ${name}`
    : `Напоминание: ${count} годовщин сегодня — ${name}`;
}

function buildAdminReminderBody({
  synagogueName,
  synagogueSlug,
  entries,
  donationUrl,
  lang,
}) {
  const safeLang = normalizeLang(lang);
  const adminUrl = `/admin/${synagogueSlug}/yahrzeit`;
  const lines = [];

  if (safeLang === 'he') {
    lines.push(`שלום,`);
    lines.push('');
    lines.push(`היום יש ${entries.length} ימי שנה ב${synagogueName || 'בית הכנסת'}:`);
    lines.push('');
  } else if (safeLang === 'en') {
    lines.push('Hello,');
    lines.push('');
    lines.push(`There ${entries.length === 1 ? 'is' : 'are'} ${entries.length} yahrzeit${entries.length === 1 ? '' : 's'} today at ${synagogueName || 'the synagogue'}:`);
    lines.push('');
  } else {
    lines.push('Здравствуйте,');
    lines.push('');
    lines.push(`Сегодня ${entries.length} годовщин${entries.length === 1 ? 'а' : ''} в ${synagogueName || 'общине'}:`);
    lines.push('');
  }

  entries.forEach((entry, index) => {
    const contact = normalizePersonContact(entry.contact);
    const message = buildYahrzeitMessage({
      synagogueName,
      deceasedName: entry.name,
      contact,
      donationUrl,
      lang: safeLang,
    });

    lines.push(`${index + 1}. ${entry.name}`);
    if (entry.gregorianDateLabel) {
      lines.push(`   ${entry.gregorianDateLabel}${entry.hebrewDateLabel ? ` (${entry.hebrewDateLabel})` : ''}`);
    }
    if (contact.name || contact.phone || contact.email) {
      const contactParts = [contact.name, contact.phone, contact.email].filter(Boolean);
      lines.push(`   ${contactParts.join(' · ')} (${contact.platform})`);
    }
    lines.push('');
    lines.push(message);
    lines.push('');
    lines.push(`   ${adminUrl}#person-${entry.id}`);
    lines.push('');
  });

  return lines.join('\n');
}

module.exports = {
  buildYahrzeitMessage,
  buildAdminReminderSubject,
  buildAdminReminderBody,
};
