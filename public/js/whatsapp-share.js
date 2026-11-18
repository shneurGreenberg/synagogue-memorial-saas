/* 1.42.0 I90: thin compatibility shim. Implementation lives in message-share.js. */
(function (root) {
  'use strict';
  var api = root && (root.MessageShare || root.WhatsAppShare);
  if (api && root) {
    root.MessageShare = api;
    root.WhatsAppShare = api;
  }
  if (typeof module !== 'undefined' && module.exports && api) module.exports = api;
}(typeof window !== 'undefined' ? window : {}));
