import 'dotenv/config';

export interface Env {
  stripeSecretKey: string;
  stripePublishableKey: string;
  /** Opcional: solo hace falta para recibir webhooks (`stripe listen`). */
  stripeWebhookSecret?: string;
  port: number;
}

/** Lee y valida las variables de entorno una sola vez. Si falta algo, falla al arrancar y no en la primera petición. */
export function loadEnv(): Env {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey?.startsWith('sk_test_')) {
    throw new Error('Falta STRIPE_SECRET_KEY de prueba (sk_test_...) en el archivo .env');
  }

  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!stripePublishableKey?.startsWith('pk_test_')) {
    throw new Error('Falta STRIPE_PUBLISHABLE_KEY de prueba (pk_test_...) en el archivo .env');
  }

  return {
    stripeSecretKey,
    stripePublishableKey,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || undefined,
    port: Number(process.env.PORT) || 3000,
  };
}
