import { getSubscriptions, saveSubscriptions, getSettings } from './popup/js/storage.js';
import { rollForwardAll, daysUntil, fmtCurrency, monthlyEquivalent } from './popup/js/format.js';

const ALARM_NAME = 'daily-renewal-check';
const REMINDER_WINDOW_DAYS = 3;

function scheduleAlarm() {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1440 });
}

chrome.runtime.onInstalled.addListener(scheduleAlarm);
chrome.runtime.onStartup.addListener(scheduleAlarm);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) runCheck();
});

export async function runCheck() {
  const [stored, settings] = await Promise.all([getSubscriptions(), getSettings()]);
  const { subscriptions, changed } = rollForwardAll(stored);
  if (changed) {
    await saveSubscriptions(subscriptions);
  }

  const dueToday = [];
  let dueSoonCount = 0;
  for (const sub of subscriptions) {
    const days = daysUntil(sub.nextRenewal);
    if (days === 0) dueToday.push(sub);
    if (days >= 0 && days <= REMINDER_WINDOW_DAYS) dueSoonCount += 1;
  }

  if (settings.notificationsEnabled) {
    for (const sub of dueToday) {
      chrome.notifications.create(`renewal-${sub.id}-${sub.nextRenewal}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `${sub.name} renews today`,
        message: `${fmtCurrency(monthlyEquivalent(sub))}/mo equivalent — ${fmtCurrency(sub.amount)} charge today.`,
      });
    }
  }

  await chrome.action.setBadgeText({ text: dueSoonCount > 0 ? String(dueSoonCount) : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#D4B267' });

  return { dueToday: dueToday.length, dueSoonCount };
}

// Exposed for manual testing from the service worker's DevTools console.
self.runCheck = runCheck;
