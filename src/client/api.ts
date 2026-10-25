import type { AppConfig, CreatePaymentResult } from './types.js';

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch('/config');
  return res.json();
}

export async function createPayment(productId: string): Promise<CreatePaymentResult> {
  try {
    const res = await fetch('/crear-pago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ producto: productId }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? 'No se pudo crear el pago' };
    return { ok: true, clientSecret: data.clientSecret };
  } catch {
    return { ok: false, error: 'Error de conexión. Inténtalo de nuevo.' };
  }
}
