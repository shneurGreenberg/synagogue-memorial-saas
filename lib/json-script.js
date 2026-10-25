/**
 * JSON safe for embedding inside an inline <script> block (1.28.0, security H1).
 * Escapes characters that could close the script tag or break JS parsing.
 */
function jsonForScript(value) {
  const json = JSON.stringify(value);
  if (json === undefined) {
    return 'null';
  }
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

module.exports = { jsonForScript };
