import { getSubscriptions, saveSubscriptions } from './storage.js';
import { fmtCurrency, monthlyEquivalent, daysUntil, rollForwardAll, sortByRenewal, totalMonthly } from './format.js';

let subscriptions = [];
let editingId = null;

const els = {
  total: document.getElementById('total-monthly'),
  list: document.getElementById('sub-list'),
  empty: document.getElementById('empty-state'),
  listView: document.getElementById('list-view'),
  formPanel: document.getElementById('form-panel'),
  formTitle: document.getElementById('form-title'),
  form: document.getElementById('sub-form'),
  btnAdd: document.getElementById('btn-add'),
  btnCancel: document.getElementById('btn-cancel'),
  cycleSelect: document.getElementById('f-cycle'),
  customDaysField: document.getElementById('f-custom-days-field'),
  fName: document.getElementById('f-name'),
  fAmount: document.getElementById('f-amount'),
  fCustomDays: document.getElementById('f-custom-days'),
  fRenewal: document.getElementById('f-renewal'),
  fCategory: document.getElementById('f-category'),
  fNotes: document.getElementById('f-notes'),
};

function renewalChip(sub) {
  const days = daysUntil(sub.nextRenewal);
  const soon = days <= 3;
  let text;
  if (days === 0) text = 'renews today';
  else if (days === 1) text = 'renews in 1d';
  else text = `renews in ${days}d`;
  return `<span class="sub-chip${soon ? ' soon' : ''}">${text}</span>`;
}

function render() {
  const sorted = sortByRenewal(subscriptions);
  els.list.innerHTML = '';
  els.empty.hidden = sorted.length > 0;

  for (const sub of sorted) {
    const li = document.createElement('li');
    li.className = 'sub-row';
    li.innerHTML = `
      <div class="sub-main">
        <div class="sub-name">${escapeHtml(sub.name)}</div>
        <div class="sub-category">${escapeHtml(sub.category || '')}</div>
      </div>
      <span class="sub-amount font-tnum">${fmtCurrency(monthlyEquivalent(sub))}/mo</span>
      ${renewalChip(sub)}
      <div class="sub-actions">
        <button type="button" class="icon-btn" data-action="edit" data-id="${sub.id}" aria-label="Edit">✎</button>
        <button type="button" class="icon-btn" data-action="delete" data-id="${sub.id}" aria-label="Delete">✕</button>
      </div>
    `;
    els.list.appendChild(li);
  }

  els.total.textContent = fmtCurrency(Math.round(totalMonthly(subscriptions) * 100) / 100);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showForm(sub = null) {
  editingId = sub?.id ?? null;
  els.formTitle.textContent = sub ? 'Edit subscription' : 'Add subscription';
  els.fName.value = sub?.name ?? '';
  els.fAmount.value = sub?.amount ?? '';
  els.cycleSelect.value = sub?.billingCycle ?? 'monthly';
  els.fCustomDays.value = sub?.customIntervalDays ?? '';
  els.fRenewal.value = sub?.nextRenewal ?? new Date().toISOString().slice(0, 10);
  els.fCategory.value = sub?.category ?? '';
  els.fNotes.value = sub?.notes ?? '';
  els.customDaysField.hidden = els.cycleSelect.value !== 'custom';

  els.listView.hidden = true;
  els.formPanel.hidden = false;
}

function hideForm() {
  els.formPanel.hidden = true;
  els.listView.hidden = false;
  editingId = null;
  els.form.reset();
}

els.btnAdd.addEventListener('click', () => showForm());
els.btnCancel.addEventListener('click', hideForm);

els.cycleSelect.addEventListener('change', () => {
  els.customDaysField.hidden = els.cycleSelect.value !== 'custom';
});

els.list.addEventListener('click', async (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  const sub = subscriptions.find((s) => s.id === id);
  if (!sub) return;

  if (action === 'edit') {
    showForm(sub);
  } else if (action === 'delete') {
    if (confirm(`Delete ${sub.name}?`)) {
      subscriptions = subscriptions.filter((s) => s.id !== id);
      await saveSubscriptions(subscriptions);
      render();
    }
  }
});

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const now = new Date().toISOString();
  const cycle = els.cycleSelect.value;

  const data = {
    name: els.fName.value.trim(),
    amount: Number(els.fAmount.value),
    currency: 'USD',
    billingCycle: cycle,
    customIntervalDays: cycle === 'custom' ? Number(els.fCustomDays.value) : null,
    nextRenewal: els.fRenewal.value,
    category: els.fCategory.value.trim(),
    notes: els.fNotes.value.trim(),
    updatedAt: now,
  };

  if (editingId) {
    subscriptions = subscriptions.map((s) => (s.id === editingId ? { ...s, ...data } : s));
  } else {
    subscriptions.push({
      id: crypto.randomUUID(),
      createdAt: now,
      ...data,
    });
  }

  await saveSubscriptions(subscriptions);
  hideForm();
  render();
});

async function init() {
  const stored = await getSubscriptions();
  const rolled = rollForwardAll(stored);
  subscriptions = rolled.subscriptions;
  if (rolled.changed) {
    await saveSubscriptions(subscriptions);
  }
  render();
}

init();
