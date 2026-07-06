import { registerPlugin } from '@capacitor/core';

const WidgetSync = registerPlugin('WidgetSync');

export async function syncWidgetSnapshot(snapshot) {
  if (!WidgetSync || typeof WidgetSync.sync !== 'function') {
    return;
  }

  try {
    await WidgetSync.sync(snapshot);
  } catch {
    // Widget sync is optional on web builds.
  }
}
