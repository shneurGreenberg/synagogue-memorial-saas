const DANGEROUS_TAG = /<(?:script|foreignObject|iframe|object|embed|use)[\s>]/i;
const SCRIPT_BLOCK = /<script[\s\S]*?<\/script>/gi;
const FOREIGN_OBJECT_BLOCK = /<foreignObject[\s\S]*?<\/foreignObject>/gi;
const EVENT_HANDLER = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL = /\s(?:href|xlink:href)\s*=\s*(["']?)\s*javascript:[^"'>\s]*/gi;
const EXTERNAL_REF = /\s(?:href|xlink:href)\s*=\s*(["'])\s*(?:https?:|\/\/)[^"']*\1/gi;

function sanitizeSvg(content) {
  if (content == null) {
    return null;
  }

  let svg = String(content).trim();
  if (!svg) {
    return null;
  }

  if (!/<svg[\s>]/i.test(svg)) {
    return null;
  }

  if (/<foreignObject[\s>]/i.test(svg)) {
    return null;
  }

  svg = svg.replace(SCRIPT_BLOCK, '');
  svg = svg.replace(FOREIGN_OBJECT_BLOCK, '');
  svg = svg.replace(EVENT_HANDLER, '');
  svg = svg.replace(JS_URL, '');
  svg = svg.replace(EXTERNAL_REF, '');

  if (DANGEROUS_TAG.test(svg)) {
    return null;
  }

  if (/<!ENTITY/i.test(svg)) {
    return null;
  }

  return svg;
}

module.exports = {
  sanitizeSvg,
};
