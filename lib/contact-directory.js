const crypto = require('crypto');

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
    id: String(source.id || '').trim(),
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

function ensureDirectoryId(entry, usedIds) {
  const existingId = String(entry.id || '').trim();
  if (existingId && !usedIds.has(existingId)) {
    usedIds.add(existingId);
    return existingId;
  }

  let nextId = '';
  do {
    nextId = crypto.randomUUID();
  } while (usedIds.has(nextId));

  usedIds.add(nextId);
  return nextId;
}

function mergeDirectoryEntry(existing, incoming) {
  const left = normalizeDirectoryEntry(existing);
  const right = normalizeDirectoryEntry(incoming);

  return {
    id: left.id || right.id,
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
  const usedIds = new Set();

  raw.forEach((entry) => {
    const normalized = normalizeDirectoryEntry(entry);
    if (!hasDirectoryDetails(normalized)) {
      return;
    }

    const key = directoryEntryKey(normalized) || `row:${map.size}`;
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...mergeDirectoryEntry(existing, normalized),
        id: existing.id,
      });
      return;
    }

    map.set(key, {
      ...normalized,
      id: ensureDirectoryId(normalized, usedIds),
    });
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function mergeContactDirectories(existing, incoming) {
  return normalizeContactDirectory([...(existing || []), ...(incoming || [])]);
}

function filterContactDirectory(directory, query) {
  const list = normalizeContactDirectory(directory);
  const q = String(query || '').trim().toLowerCase();
  if (!q) {
    return list;
  }

  return list.filter((entry) => scoreDirectoryMatch(entry, q) > 0);
}

function findDirectoryEntry(directory, id) {
  const target = String(id || '').trim();
  if (!target) {
    return null;
  }

  return normalizeContactDirectory(directory).find((entry) => entry.id === target) || null;
}

function addDirectoryEntry(directory, patch) {
  const entry = normalizeDirectoryEntry(patch);
  if (!hasDirectoryDetails(entry)) {
    throw new Error('Contact must have a name, phone, or email');
  }

  return normalizeContactDirectory([...(directory || []), entry]);
}

function updateDirectoryEntry(directory, id, patch) {
  const target = String(id || '').trim();
  if (!target) {
    throw new Error('Contact id is required');
  }

  const list = normalizeContactDirectory(directory);
  const index = list.findIndex((entry) => entry.id === target);
  if (index === -1) {
    throw new Error('Contact not found');
  }

  const updated = normalizeDirectoryEntry({
    ...list[index],
    ...patch,
    id: target,
  });

  if (!hasDirectoryDetails(updated)) {
    throw new Error('Contact must have a name, phone, or email');
  }

  const next = [...list];
  next[index] = updated;
  return normalizeContactDirectory(next);
}

function removeDirectoryEntry(directory, id) {
  const target = String(id || '').trim();
  if (!target) {
    throw new Error('Contact id is required');
  }

  const list = normalizeContactDirectory(directory);
  const next = list.filter((entry) => entry.id !== target);
  if (next.length === list.length) {
    throw new Error('Contact not found');
  }

  return next;
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
  return filterContactDirectory(directory, query).slice(0, limit);
}

module.exports = {
  normalizeDirectoryEntry,
  normalizeContactDirectory,
  mergeContactDirectories,
  filterContactDirectory,
  findDirectoryEntry,
  addDirectoryEntry,
  updateDirectoryEntry,
  removeDirectoryEntry,
  searchContactDirectory,
  normalizeDirectoryPhone,
};
