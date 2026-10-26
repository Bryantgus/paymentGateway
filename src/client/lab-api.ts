import type { LabSettings, LabState } from './types.js';

async function request<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data;
}

export const fetchLabState = () => request<LabState>('/simulation/state', 'GET');

export const updateSettings = (patch: Partial<LabSettings>) =>
  request<LabSettings>('/simulation/settings', 'PUT', patch);

/** Simulates the gateway reporting an order's payment `times` times (at once). Returns the HTTP status of each answer. */
export const deliverWebhook = (orderId: number, times: number) =>
  request<{ responses: number[] }>(`/simulation/orders/${orderId}/webhook`, 'POST', { times });

export const reconcile = () =>
  request<{ found: number; fixed: number; failed: number }>('/simulation/reconcile', 'POST');

export const resetLab = () => request<void>('/simulation/reset', 'POST');
