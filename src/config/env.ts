import 'dotenv/config';

export interface Env {
  stripeSecretKey: string;
  stripePublishableKey: string;
  /** Optional: only needed to receive webhooks (`stripe listen`). */
  stripeWebhookSecret?: string;
  port: number;
  /** SQLite file with orders, charges and events. `:memory:` for a temporary database. */
  databasePath: string;
}

/** Reads and validates the environment variables once. If something is missing, it fails at startup, not on the first request. */
export function loadEnv(): Env {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey?.startsWith('sk_test_')) {
    throw new Error('Missing test STRIPE_SECRET_KEY (sk_test_...) in the .env file');
  }

  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!stripePublishableKey?.startsWith('pk_test_')) {
    throw new Error('Missing test STRIPE_PUBLISHABLE_KEY (pk_test_...) in the .env file');
  }

  return {
    stripeSecretKey,
    stripePublishableKey,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || undefined,
    port: Number(process.env.PORT) || 3000,
    databasePath: process.env.DATABASE_PATH || 'data/demo.db',
  };
}
