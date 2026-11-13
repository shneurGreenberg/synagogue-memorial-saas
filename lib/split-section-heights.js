/**
 * 1.37.0 I77: combined board — split the prayers box between the prayers part and the lessons part.
 * A part that fits keeps its natural height; an overflowing part gets the rest of the box (and
 * scrolls by itself); if both overflow they share the box half/half. Shared by board + tests.
 */
function splitSectionHeights(available, naturalA, naturalB) {
  const total = Math.max(0, Number(available) || 0);
  const a = Math.max(0, Number(naturalA) || 0);
  const b = Math.max(0, Number(naturalB) || 0);
  if (!total) return { a: null, b: null };
  if (!b) return { a: total, b: 0 };
  if (!a) return { a: 0, b: total };
  if (a + b <= total) return { a, b };
  const half = total / 2;
  if (a <= half) return { a, b: total - a };
  if (b <= half) return { a: total - b, b };
  return { a: half, b: total - half };
}

module.exports = { splitSectionHeights };
