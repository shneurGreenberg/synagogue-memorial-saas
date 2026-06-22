function digitsOnly(phone) {
  return String(phone || '').replace(/[^\d]/g, '');
}

function buildWhatsAppLink(phone, message) {
  const digits = digitsOnly(phone);
  if (!digits) {
    return '';
  }

  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${query}`;
}

function buildTelegramChatLink(phone, message) {
  const digits = digitsOnly(phone);
  if (!digits) {
    return buildTelegramShareLink(message);
  }

  const base = `https://t.me/+${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

function buildTelegramShareLink(message) {
  if (!message) {
    return 'https://t.me/share/url';
  }

  return `https://t.me/share/url?url=&text=${encodeURIComponent(message)}`;
}

function buildMaxShareLink(message) {
  if (!message) {
    return 'https://max.ru/:share';
  }

  return `https://max.ru/:share?text=${encodeURIComponent(message)}`;
}

function buildSmsLink(phone, message) {
  const normalized = String(phone || '').trim();
  if (!normalized) {
    return '';
  }

  const query = message ? `?body=${encodeURIComponent(message)}` : '';
  return `sms:${normalized}${query}`;
}

function buildEmailLink(email, subject, message) {
  const address = String(email || '').trim();
  if (!address) {
    return '';
  }

  const params = new URLSearchParams();
  if (subject) {
    params.set('subject', subject);
  }
  if (message) {
    params.set('body', message);
  }

  const query = params.toString();
  return query ? `mailto:${address}?${query}` : `mailto:${address}`;
}

function buildTelLink(phone) {
  const normalized = String(phone || '').trim();
  return normalized ? `tel:${normalized}` : '';
}

function buildContactActionLink(contact, message, subject) {
  const platform = (contact && contact.platform) || 'whatsapp';
  const phone = contact && contact.phone;
  const email = contact && contact.email;

  switch (platform) {
    case 'whatsapp':
      return buildWhatsAppLink(phone, message);
    case 'telegram':
      return buildTelegramChatLink(phone, message);
    case 'sms':
      return buildSmsLink(phone, message);
    case 'email':
      return buildEmailLink(email, subject, message);
    case 'max':
      return buildMaxShareLink(message);
    default:
      return buildWhatsAppLink(phone, message);
  }
}

module.exports = {
  buildWhatsAppLink,
  buildTelegramChatLink,
  buildTelegramShareLink,
  buildMaxShareLink,
  buildSmsLink,
  buildEmailLink,
  buildTelLink,
  buildContactActionLink,
};
