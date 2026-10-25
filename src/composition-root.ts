import Stripe from 'stripe';
import type { AppDependencies } from './app';
import { CreatePayment } from './application/payments/create-payment';
import { HandleWebhook } from './application/webhooks/handle-webhook';
import type { Env } from './config/env';
import { InMemoryProductCatalog } from './infrastructure/catalog/in-memory-product-catalog';
import { ConsoleLogger } from './infrastructure/logging/console-logger';
import { StripePaymentGateway } from './infrastructure/stripe/stripe-payment-gateway';
import { StripeWebhookVerifier } from './infrastructure/stripe/stripe-webhook-verifier';

/**
 * Raíz de composición: el único lugar que conoce las implementaciones concretas y las conecta
 * con los casos de uso. Cambiar de pasarela o de catálogo se hace aquí y en ningún otro sitio.
 */
export function buildDependencies(env: Env): AppDependencies {
  const stripe = new Stripe(env.stripeSecretKey);

  const logger = new ConsoleLogger();
  const catalog = new InMemoryProductCatalog();
  const gateway = new StripePaymentGateway(stripe);
  const webhookVerifier = new StripeWebhookVerifier(stripe, env.stripeWebhookSecret);

  return {
    publishableKey: env.stripePublishableKey,
    catalog,
    createPayment: new CreatePayment(catalog, gateway),
    handleWebhook: new HandleWebhook(webhookVerifier, logger),
    logger,
  };
}
