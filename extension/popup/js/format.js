const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function fmtCurrency(n) {
  const decimals = Number.isInteger(n) ? 0 : 2;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function monthlyEquivalent(sub) {
  switch (sub.billingCycle) {
    case 'weekly':
      return sub.amount * 52 / 12;
    case 'yearly':
      return sub.amount / 12;
    case 'custom':
      return sub.amount * (30 / sub.customIntervalDays);
    case 'monthly':
    default:
      return sub.amount;
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(dateStr, fromStr = todayStr()) {
  const from = new Date(fromStr + 'T00:00:00Z');
  const to = new Date(dateStr + 'T00:00:00Z');
  return Math.round((to - from) / MS_PER_DAY);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function cycleDays(sub) {
  switch (sub.billingCycle) {
    case 'weekly':
      return 7;
    case 'yearly':
      return 365;
    case 'custom':
      return sub.customIntervalDays;
    case 'monthly':
    default:
      return 30;
  }
}

// Advances a stale nextRenewal forward by its billing cycle until it's today or later.
// Returns { sub, changed } so callers know whether to persist the update.
export function rollForwardIfPast(sub, fromStr = todayStr()) {
  if (sub.nextRenewal >= fromStr) {
    return { sub, changed: false };
  }
  let next = sub.nextRenewal;
  const step = cycleDays(sub);
  while (next < fromStr) {
    next = addDays(next, step);
  }
  return { sub: { ...sub, nextRenewal: next }, changed: true };
}

export function rollForwardAll(subscriptions, fromStr = todayStr()) {
  let changed = false;
  const rolled = subscriptions.map((sub) => {
    const result = rollForwardIfPast(sub, fromStr);
    if (result.changed) changed = true;
    return result.sub;
  });
  return { subscriptions: rolled, changed };
}

export function sortByRenewal(subscriptions) {
  return [...subscriptions].sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal));
}

export function totalMonthly(subscriptions) {
  return subscriptions.reduce((sum, sub) => sum + monthlyEquivalent(sub), 0);
}
