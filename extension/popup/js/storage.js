const SUBSCRIPTIONS_KEY = 'ledgr-subscriptions-v1';
const SETTINGS_KEY = 'ledgr-settings-v1';

export async function getSubscriptions() {
  const stored = await chrome.storage.local.get(SUBSCRIPTIONS_KEY);
  const envelope = stored[SUBSCRIPTIONS_KEY];
  return envelope?.subscriptions ?? [];
}

export async function saveSubscriptions(subscriptions) {
  await chrome.storage.local.set({
    [SUBSCRIPTIONS_KEY]: { version: 1, subscriptions },
  });
}

export async function getSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return stored[SETTINGS_KEY] ?? { notificationsEnabled: true };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}
