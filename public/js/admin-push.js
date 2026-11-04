/* 1.34.0 I53: phone notifications for the installed admin app.
 *
 * Permission is requested ONLY from a click on the subscribe button — never on page load. The
 * status line always says plainly where the device stands: not supported / blocked / subscribed. */
(function () {
  'use strict';

  var panel = document.getElementById('yahrzeitPushPanel');
  if (!panel) return;

  var slug = panel.getAttribute('data-slug') || '';
  var subscribeBtn = document.getElementById('yahrzeitPushSubscribeBtn');
  var statusEl = document.getElementById('yahrzeitPushStatus');
  var publicKey = panel.getAttribute('data-public-key') || '';
  var labels = window.yahrzeitPushLabels || {};

  function setStatus(key, fallback) {
    if (!statusEl) return;
    statusEl.textContent = labels[key] || fallback || '';
    statusEl.setAttribute('data-state', key);
  }

  function supported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = window.atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function registration() {
    // The admin layout already registers /admin-sw.js; this waits for that registration.
    if (navigator.serviceWorker.controller) {
      return navigator.serviceWorker.ready;
    }
    await navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin/' }).catch(function () {});
    return navigator.serviceWorker.ready;
  }

  async function currentSubscription() {
    try {
      var reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch (err) {
      return null;
    }
  }

  async function refreshState() {
    if (!supported()) {
      setStatus('unsupported');
      if (subscribeBtn) subscribeBtn.hidden = true;
      return;
    }
    if (!publicKey) {
      setStatus('notConfigured');
      if (subscribeBtn) subscribeBtn.hidden = true;
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('blocked');
      if (subscribeBtn) subscribeBtn.hidden = true;
      return;
    }
    var sub = await currentSubscription();
    if (sub) {
      setStatus('subscribed');
      if (subscribeBtn) subscribeBtn.textContent = labels.unsubscribe || 'Unsubscribe';
      return;
    }
    setStatus(Notification.permission === 'granted' ? 'ready' : 'idle');
    if (subscribeBtn) subscribeBtn.textContent = labels.subscribe || 'Enable notifications';
  }

  async function subscribe() {
    if (!publicKey) return;
    try {
      var permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'blocked' : 'declined');
        return;
      }
      var reg = await registration();
      var sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      var payload = sub.toJSON ? sub.toJSON() : { endpoint: sub.endpoint, keys: {} };
      var response = await fetch('/admin/' + slug + '/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('subscribe_failed');
      setStatus('subscribed');
      if (subscribeBtn) subscribeBtn.textContent = labels.unsubscribe || 'Unsubscribe';
    } catch (err) {
      setStatus('error');
    }
  }

  async function unsubscribe() {
    try {
      var sub = await currentSubscription();
      if (!sub) {
        setStatus('idle');
        return;
      }
      var endpoint = sub.endpoint;
      await sub.unsubscribe().catch(function () {});
      await fetch('/admin/' + slug + '/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ endpoint: endpoint }),
      }).catch(function () {});
      setStatus('idle');
      if (subscribeBtn) subscribeBtn.textContent = labels.subscribe || 'Enable notifications';
    } catch (err) {
      setStatus('error');
    }
  }

  if (subscribeBtn) {
    subscribeBtn.hidden = false;
    subscribeBtn.addEventListener('click', function () {
      currentSubscription().then(function (sub) {
        return sub ? unsubscribe() : subscribe();
      });
    });
  }

  var testBtn = document.getElementById('yahrzeitPushTestBtn');
  if (testBtn) {
    testBtn.addEventListener('click', async function () {
      setStatus('sending');
      try {
        var response = await fetch('/admin/' + slug + '/push/test', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        });
        var payload = response.ok ? await response.json() : null;
        if (payload && payload.sent > 0) setStatus('testSent');
        else setStatus('error');
      } catch (err) {
        setStatus('error');
      }
    });
  }

  refreshState();
}());
