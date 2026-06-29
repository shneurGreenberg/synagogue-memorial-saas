function digitsOnly(phone) {
  return String(phone || '').replace(/[^\d]/g, '');
}

function formatPhoneLabel(phone) {
  const digits = digitsOnly(phone);
  if (!digits) {
    return '';
  }

  return `+${digits}`;
}

function messageBodyOnly(message) {
  return String(message || '').trim();
}

function buildWhatsAppLink(phone, message) {
  const digits = digitsOnly(phone);
  if (!digits) {
    return '';
  }

  const text = messageBodyOnly(message);
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${query}`;
}

function buildTelegramChatLink(phone, message) {
  const digits = digitsOnly(phone);
  if (!digits) {
    return buildTelegramShareLink(message, phone);
  }

  const text = messageBodyOnly(message);
  const base = `https://t.me/+${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

function buildTelegramShareLink(message, phone) {
  const text = messageBodyOnly(message);
  if (!text) {
    return 'https://t.me/share/url';
  }

  return `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`;
}

function buildMaxShareLink(message, phone) {
  const text = messageBodyOnly(message);
  if (!text) {
    return 'https://max.ru/:share';
  }

  return `https://max.ru/:share?text=${encodeURIComponent(text)}`;
}

function buildSmsLink(phone, message) {
  const normalized = String(phone || '').trim();
  if (!normalized) {
    return '';
  }

  const body = messageBodyOnly(message);
  const query = body ? `?body=${encodeURIComponent(body)}` : '';
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

const { resolveContactPlatform } = require('./person-contact');

function buildContactActionLink(contact, message, subject) {
  const platform = resolveContactPlatform(contact);
  if (!platform) {
    return '';
  }

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
      return buildMaxShareLink(message, phone);
    default:
      return buildWhatsAppLink(phone, message);
  }
}

module.exports = {
  digitsOnly,
  formatPhoneLabel,
  messageBodyOnly,
  buildWhatsAppLink,
  buildTelegramChatLink,
  buildTelegramShareLink,
  buildMaxShareLink,
  buildSmsLink,
  buildEmailLink,
  buildTelLink,
  buildContactActionLink,
};
