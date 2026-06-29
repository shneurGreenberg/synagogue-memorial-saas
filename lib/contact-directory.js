function normalizeDirectoryPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (digits.length >= 10) {
    return digits.slice(-10);
  }

  return digits;
}

function normalizeDirectoryEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeDirectoryEntry(raw) {
  const source = raw || {};
  return {
    name: String(source.name || '').trim().slice(0, 120),
    phone: String(source.phone || '').trim().slice(0, 30),
    email: String(source.email || '').trim().slice(0, 200),
  };
}

function hasDirectoryDetails(entry) {
  const normalized = normalizeDirectoryEntry(entry);
  return !!(normalized.name || normalized.phone || normalized.email);
}

function directoryEntryKey(entry) {
  const normalized = normalizeDirectoryEntry(entry);
  const phoneKey = normalizeDirectoryPhone(normalized.phone);
  if (phoneKey) {
    return `phone:${phoneKey}`;
  }

  const emailKey = normalizeDirectoryEmail(normalized.email);
  if (emailKey) {
    return `email:${emailKey}`;
  }

  const nameKey = normalized.name.toLowerCase();
  return nameKey ? `name:${nameKey}` : '';
}

function mergeDirectoryEntry(existing, incoming) {
  const left = normalizeDirectoryEntry(existing);
  const right = normalizeDirectoryEntry(incoming);

  return {
    name: right.name || left.name,
    phone: right.phone || left.phone,
    email: right.email || left.email,
  };
}

function normalizeContactDirectory(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  const map = new Map();

  raw.forEach((entry) => {
    const normalized = normalizeDirectoryEntry(entry);
    if (!hasDirectoryDetails(normalized)) {
      return;
    }

    const key = directoryEntryKey(normalized) || `row:${map.size}`;
    const existing = map.get(key);
    map.set(key, existing ? mergeDirectoryEntry(existing, normalized) : normalized);
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function mergeContactDirectories(existing, incoming) {
  return normalizeContactDirectory([...(existing || []), ...(incoming || [])]);
}

function scoreDirectoryMatch(entry, query) {
  const normalized = normalizeDirectoryEntry(entry);
  const q = String(query || '').trim().toLowerCase();
  if (!q) {
    return 0;
  }

  const name = normalized.name.toLowerCase();
  const phone = normalized.phone.toLowerCase();
  const email = normalized.email.toLowerCase();

  if (name.startsWith(q)) {
    return 100;
  }

  if (name.includes(q)) {
    return 80;
  }

  if (phone.includes(q.replace(/\s/g, ''))) {
    return 60;
  }

  if (email.includes(q)) {
    return 50;
  }

  return 0;
}

function searchContactDirectory(directory, query, limit = 12) {
  const q = String(query || '').trim();
  if (!q) {
    return [];
  }

  return normalizeContactDirectory(directory)
    .map((entry) => ({ entry, score: scoreDirectoryMatch(entry, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.entry.name.localeCompare(b.entry.name, 'ru');
    })
    .slice(0, limit)
    .map((item) => item.entry);
}

module.exports = {
  normalizeDirectoryEntry,
  normalizeContactDirectory,
  mergeContactDirectories,
  searchContactDirectory,
  normalizeDirectoryPhone,
};
