const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4',
]);

function stripDangerousFragments(html) {
  return String(html)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '')
    .replace(/\s+(href|src)\s*=\s*javascript:[^\s>]*/gi, '');
}

function sanitizeTag(match, rawName, attrs, selfClosing) {
  const name = String(rawName || '').toLowerCase();
  if (!ALLOWED_TAGS.has(name)) {
    return '';
  }

  if (name === 'br') {
    return '<br/>';
  }

  // Drop all attributes — board content never needs them.
  if (selfClosing) {
    return `<${name}/>`;
  }

  return `<${name}>`;
}

export function sanitizeRichText(html) {
  if (!html) {
    return '';
  }

  let value = stripDangerousFragments(html);
  value = value.replace(/<\/?([a-z0-9]+)(\s[^>]*)?(\/?)>/gi, (match, name, attrs, slash) => {
    if (match.startsWith('</')) {
      const closing = String(name || '').toLowerCase();
      return ALLOWED_TAGS.has(closing) ? `</${closing}>` : '';
    }

    return sanitizeTag(match, name, attrs, slash === '/');
  });

  return value;
}
