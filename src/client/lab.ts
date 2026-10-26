import { createPayment } from './api.js';
import { $ } from './dom.js';
import { formatUSD } from './format.js';
import { attemptKeyFor } from './idempotency-key.js';
import { deliverWebhook, fetchLabState, reconcile, resetLab, updateSettings } from './lab-api.js';
import type { LabState } from './types.js';

/** Creates an element with text (always as text, never as HTML). */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString();
const shortId = (id: string | null) => (id ? id.replace(/^(pi_.{6}).*/, '$1…') : '—');

function renderTable(containerId: string, headers: string[], rows: (string | HTMLElement)[][], empty: string): void {
  const container = $(containerId);
  container.replaceChildren();
  if (rows.length === 0) {
    container.append(el('p', empty, 'empty'));
    return;
  }
  const table = el('table');
  const head = table.createTHead().insertRow();
  for (const h of headers) head.append(el('th', h));
  const body = table.createTBody();
  for (const row of rows) {
    const tr = body.insertRow();
    for (const cell of row) {
      const td = tr.insertCell();
      if (typeof cell === 'string') td.textContent = cell;
      else td.append(cell);
    }
  }
  container.append(table);
}

function countBy<T>(items: T[], key: (item: T) => number): Map<number, number> {
  const counts = new Map<number, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

/** Compares what there should be (1 charge and 1 SMS per paid order) with what there is, and explains it. */
function verdict(state: LabState): { ok: boolean; lines: string[] } {
  const charges = countBy(state.charges, (c) => c.orderId);
  const sms = countBy(state.sms, (s) => s.orderId);
  const lines: string[] = [];

  for (const o of state.orders) {
    const c = charges.get(o.id) ?? 0;
    const m = sms.get(o.id) ?? 0;
    if (o.status === 'paid' && c === 0) lines.push(`Order #${o.id}: marked as paid but WITHOUT a recorded charge (the process stopped halfway).`);
    if (c > 1) lines.push(`Order #${o.id}: ${c} charges recorded instead of 1 (finance would see the payment duplicated).`);
    if (m > 1) lines.push(`Order #${o.id}: ${m} SMS sent instead of 1 (the customer gets repeated messages).`);
    if (o.status === 'paid' && c >= 1 && m === 0) lines.push(`Order #${o.id}: charged but no SMS.`);
  }

  if (lines.length > 0) return { ok: false, lines };
  return state.orders.some((o) => o.status === 'paid')
    ? { ok: true, lines: ['All consistent: every paid order has exactly 1 charge and 1 SMS.'] }
    : { ok: true, lines: ['Nothing to check yet. Create an order and simulate the webhook.'] };
}

function render(state: LabState): void {
  const on = state.settings.idempotency;
  const toggle = $<HTMLInputElement>('lab-idempotency');
  if (document.activeElement !== toggle) toggle.checked = on;
  const status = $('lab-mode-status');
  status.textContent = on ? 'ENABLED: protected' : 'DISABLED: unprotected';
  status.className = on ? 'mode-on' : 'mode-off';
  const faults = $<HTMLSelectElement>('lab-faults');
  if (document.activeElement !== faults) faults.value = String(state.settings.faultRatePercent);

  const v = verdict(state);
  const box = $('lab-verdict');
  box.className = v.ok ? 'verdict ok' : 'verdict bad';
  box.replaceChildren(el('strong', v.ok ? '✅ Status' : '⚠️ Inconsistencies'), ...v.lines.map((l) => el('div', l)));

  const chargesByOrder = countBy(state.charges, (c) => c.orderId);
  const smsByOrder = countBy(state.sms, (s) => s.orderId);

  renderTable(
    'lab-orders',
    ['#', 'Product', 'Amount', 'Status', 'Payment (Stripe)', 'Charges', 'SMS', 'Notify payment'],
    state.orders.map((o) => {
      const actions = el('div', '', 'actions');
      for (const times of [1, 2]) {
        const b = el('button', `×${times}`);
        b.type = 'button';
        b.title = times === 1 ? 'The gateway notifies once (or retries an event already sent)' : 'The gateway delivers the same event twice at once';
        b.disabled = !o.paymentId;
        b.addEventListener('click', () => run(async () => `Webhook responses: ${(await deliverWebhook(o.id, times)).responses.join(', ')}`));
        actions.append(b);
      }
      return [
        String(o.id),
        o.product,
        formatUSD(o.amount),
        el('span', o.status === 'paid' ? 'paid' : 'pending', o.status === 'paid' ? 'badge paid' : 'badge pending'),
        shortId(o.paymentId),
        String(chargesByOrder.get(o.id) ?? 0),
        String(smsByOrder.get(o.id) ?? 0),
        actions,
      ];
    }),
    'There are no orders yet. Pick a product above and press "Continue to payment".'
  );
  renderTable(
    'lab-charges',
    ['#', 'Order', 'Amount', 'Time'],
    state.charges.map((c) => [String(c.id), `#${c.orderId}`, formatUSD(c.amount), time(c.createdAt)]),
    'No charges recorded.'
  );
  renderTable(
    'lab-sms',
    ['#', 'Order', 'Message', 'Time'],
    state.sms.map((s) => [String(s.id), `#${s.orderId}`, s.message, time(s.sentAt)]),
    'No SMS sent.'
  );
  renderTable(
    'lab-events',
    ['Already processed event'],
    state.events.map((e) => [e]),
    'None. It only fills up with idempotency enabled.'
  );
}

async function refresh(): Promise<void> {
  try {
    render(await fetchLabState());
  } catch {
    // The server may be restarting; the next cycle retries
  }
}

/** Runs a lab action, shows its result and refreshes the tables. */
async function run(action: () => Promise<string>): Promise<void> {
  const out = $('lab-result');
  out.textContent = '…';
  try {
    out.textContent = await action();
  } catch (err) {
    out.textContent = `Error: ${err instanceof Error ? err.message : err}`;
  }
  await refresh();
}

/** Two identical requests at once: what happens with a double click or an automatic retry. */
async function simulateDoubleClick(): Promise<string> {
  const productId = $<HTMLSelectElement>('product').value;
  const key = attemptKeyFor(productId);
  const [a, b] = await Promise.all([createPayment(productId, key), createPayment(productId, key)]);
  if (!a.ok || !b.ok) return `Error: ${(!a.ok && a.error) || (!b.ok && b.error)}`;
  const idA = a.clientSecret.split('_secret_')[0];
  const idB = b.clientSecret.split('_secret_')[0];
  return idA === idB
    ? `Both requests returned the SAME payment (${idA}). A single purchase.`
    : `TWO different payments were created (${idA} and ${idB}) from a single click. This is a potential double charge.`;
}

export function initLab(): void {
  $<HTMLInputElement>('lab-idempotency').addEventListener('change', (e) =>
    run(async () => {
      const { idempotency } = await updateSettings({ idempotency: (e.target as HTMLInputElement).checked });
      return `Idempotency ${idempotency ? 'enabled' : 'disabled'}.`;
    })
  );
  $<HTMLSelectElement>('lab-faults').addEventListener('change', (e) =>
    run(async () => {
      const { faultRatePercent } = await updateSettings({ faultRatePercent: Number((e.target as HTMLSelectElement).value) });
      return `Failure probability at each step: ${faultRatePercent}%.`;
    })
  );
  $('lab-double-click').addEventListener('click', () => run(simulateDoubleClick));
  $('lab-reconcile').addEventListener('click', () =>
    run(async () => {
      const r = await reconcile();
      return `Reconciliation: ${r.found} payments charged in Stripe but not marked, ${r.fixed} fixed, ${r.failed} failed.`;
    })
  );
  $('lab-reset').addEventListener('click', () =>
    run(async () => {
      await resetLab();
      return 'Data deleted.';
    })
  );

  void refresh();
  setInterval(refresh, 1500);
}
