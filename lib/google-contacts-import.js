function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || (char === '\r' && next === '\n')) {
      row.push(cell);
      if (row.some((value) => String(value || '').trim())) {
        rows.push(row);
      }
      row = [];
      cell = '';
      if (char === '\r') {
        i += 1;
      }
    } else if (char !== '\r') {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => String(value || '').trim())) {
      rows.push(row);
    }
  }

  return rows;
}

function headerIndex(headers, patterns) {
  const normalized = headers.map((header) => String(header || '').trim().toLowerCase());
  for (let i = 0; i < normalized.length; i += 1) {
    const header = normalized[i];
    if (patterns.some((pattern) => pattern.test(header))) {
      return i;
    }
  }
  return -1;
}

function firstMatchingValue(row, headers, patterns) {
  const indexes = headers
    .map((header, index) => ({ header: String(header || '').trim().toLowerCase(), index }))
    .filter(({ header }) => patterns.some((pattern) => pattern.test(header)))
    .map(({ index }) => index);

  for (let i = 0; i < indexes.length; i += 1) {
    const value = String(row[indexes[i]] || '').trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function buildNameFromRow(row, headers) {
  const nameIndex = headerIndex(headers, [/^name$/i, /^full name$/i, /^display name$/i]);
  if (nameIndex >= 0) {
    const direct = String(row[nameIndex] || '').trim();
    if (direct) {
      return direct;
    }
  }

  const givenIndex = headerIndex(headers, [/^given name$/i, /^first name$/i, /^имя$/i]);
  const familyIndex = headerIndex(headers, [/^family name$/i, /^last name$/i, /^фамилия$/i]);
  const given = givenIndex >= 0 ? String(row[givenIndex] || '').trim() : '';
  const family = familyIndex >= 0 ? String(row[familyIndex] || '').trim() : '';
  const combined = [given, family].filter(Boolean).join(' ').trim();
  if (combined) {
    return combined;
  }

  const simpleNameIndex = headerIndex(headers, [/^contact name$/i, /^имя контакта$/i]);
  if (simpleNameIndex >= 0) {
    return String(row[simpleNameIndex] || '').trim();
  }

  return '';
}

function parseGoogleContactsCsv(text) {
  const rows = parseCsvRows(String(text || '').replace(/^\uFEFF/, ''));
  if (!rows.length) {
    return [];
  }

  const headers = rows[0];
  const hasSimpleHeaders = headerIndex(headers, [/^phone$/i, /^tel$/i, /^mobile$/i, /^телефон$/i]) >= 0
    || headerIndex(headers, [/^e-mail$/i, /^email$/i, /^почта$/i]) >= 0;

  const dataRows = rows.slice(1);
  const contacts = [];

  dataRows.forEach((row) => {
    const name = buildNameFromRow(row, headers);
    const phone = hasSimpleHeaders
      ? firstMatchingValue(row, headers, [/^phone$/i, /^tel$/i, /^mobile$/i, /^телефон$/i])
      : firstMatchingValue(row, headers, [/^phone \d+ - value$/i, /^phone$/i]);
    const email = hasSimpleHeaders
      ? firstMatchingValue(row, headers, [/^e-mail$/i, /^email$/i, /^почта$/i])
      : firstMatchingValue(row, headers, [/^e-mail \d+ - value$/i, /^email$/i]);

    if (name || phone || email) {
      contacts.push({ name, phone, email });
    }
  });

  return contacts;
}

function unfoldVCardLines(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const unfolded = [];

  lines.forEach((line) => {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length) {
      unfolded[unfolded.length - 1] += line.slice(1);
      return;
    }
    unfolded.push(line);
  });

  return unfolded;
}

function decodeVCardValue(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    return '';
  }

  if (value.includes('=')) {
    return value
      .replace(/\\n/gi, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseVCardProperty(line) {
  const separator = line.indexOf(':');
  if (separator === -1) {
    return null;
  }

  const left = line.slice(0, separator);
  const value = decodeVCardValue(line.slice(separator + 1));
  const key = left.split(';')[0].trim().toUpperCase();
  return { key, value };
}

function parseVCard(text) {
  const lines = unfoldVCardLines(text);
  const contacts = [];
  let current = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.toUpperCase() === 'BEGIN:VCARD') {
      current = { name: '', phone: '', email: '' };
      return;
    }

    if (trimmed.toUpperCase() === 'END:VCARD') {
      if (current && (current.name || current.phone || current.email)) {
        contacts.push(current);
      }
      current = null;
      return;
    }

    if (!current) {
      return;
    }

    const property = parseVCardProperty(trimmed);
    if (!property || !property.value) {
      return;
    }

    if (property.key === 'FN' && !current.name) {
      current.name = property.value;
      return;
    }

    if (property.key === 'N' && !current.name) {
      const parts = property.value.split(';');
      current.name = [parts[1], parts[0]].filter(Boolean).join(' ').trim() || parts.join(' ').trim();
      return;
    }

    if (property.key === 'TEL' && !current.phone) {
      current.phone = property.value;
      return;
    }

    if (property.key === 'EMAIL' && !current.email) {
      current.email = property.value;
    }
  });

  return contacts;
}

function parseContactImportFile(buffer, originalName) {
  const text = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer || '');
  const name = String(originalName || '').toLowerCase();

  if (name.endsWith('.vcf') || text.includes('BEGIN:VCARD')) {
    return parseVCard(text);
  }

  return parseGoogleContactsCsv(text);
}

module.exports = {
  parseCsvRows,
  parseGoogleContactsCsv,
  parseVCard,
  parseContactImportFile,
};
