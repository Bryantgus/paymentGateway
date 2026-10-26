import type { AppConfig, CreatePaymentResult } from './types.js';

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch('/config');
  return res.json();
}

export async function createPayment(productId: string, idempotencyKey: string): Promise<CreatePaymentResult> {
  try {
    const res = await fetch('/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ product: productId }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? 'Could not create the payment' };
    return { ok: true, clientSecret: data.clientSecret };
  } catch {
    return { ok: false, error: 'Connection error. Please try again.' };
  }
}
