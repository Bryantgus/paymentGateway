import Stripe from 'stripe';
import type { AppDependencies } from './app';
import { GetLabState } from './application/lab/get-lab-state';
import { SimulateWebhookDelivery } from './application/lab/simulate-webhook-delivery';
import { CreatePayment } from './application/payments/create-payment';
import { IdempotentPaymentSucceeded } from './application/payments/idempotent-payment-succeeded';
import { NaivePaymentSucceeded } from './application/payments/naive-payment-succeeded';
import { ReconcilePayments } from './application/payments/reconcile-payments';
import { HandleWebhook } from './application/webhooks/handle-webhook';
import type { Env } from './config/env';
import { InMemoryProductCatalog } from './infrastructure/catalog/in-memory-product-catalog';
import { ConsoleLogger } from './infrastructure/logging/console-logger';
import { openDatabase } from './infrastructure/persistence/sqlite/database';
import { SqliteDemoDataResetter } from './infrastructure/persistence/sqlite/sqlite-demo-data-resetter';
import { SqliteOrderRepository } from './infrastructure/persistence/sqlite/sqlite-order-repository';
import { SqlitePaymentRepository } from './infrastructure/persistence/sqlite/sqlite-payment-repository';
import { SqliteProcessedEventStore } from './infrastructure/persistence/sqlite/sqlite-processed-event-store';
import { SqliteUnitOfWork } from './infrastructure/persistence/sqlite/sqlite-unit-of-work';
import { InMemoryDemoSettings } from './infrastructure/simulation/in-memory-demo-settings';
import { RandomFaultInjector } from './infrastructure/simulation/random-fault-injector';
import { FakeSmsSender } from './infrastructure/sms/fake-sms-sender';
import { StripePaymentGateway } from './infrastructure/stripe/stripe-payment-gateway';
import { StripeWebhookSimulator } from './infrastructure/stripe/stripe-webhook-simulator';
import { StripeWebhookVerifier } from './infrastructure/stripe/stripe-webhook-verifier';

/**
 * Composition root: the only place that knows the concrete implementations and wires them
 * to the use cases. Switching gateway or catalog happens here and nowhere else.
 */
export function buildDependencies(env: Env): AppDependencies {
  const stripe = new Stripe(env.stripeSecretKey);

  const logger = new ConsoleLogger();
  const catalog = new InMemoryProductCatalog();
  const gateway = new StripePaymentGateway(stripe);
  const webhookVerifier = new StripeWebhookVerifier(stripe, env.stripeWebhookSecret);

  // Persistence: a single shared connection, so one transaction covers all the repositories
  const db = openDatabase(env.databasePath);
  const orders = new SqliteOrderRepository(db);
  const payments = new SqlitePaymentRepository(db);
  const processedEvents = new SqliteProcessedEventStore(db);
  const unitOfWork = new SqliteUnitOfWork(db);
  const sms = new FakeSmsSender(db, logger);

  // Lab
  const settings = new InMemoryDemoSettings();
  const faults = new RandomFaultInjector(settings);
  const webhookSimulator = new StripeWebhookSimulator(stripe, env.stripeWebhookSecret, `http://127.0.0.1:${env.port}/webhook`);

  // The two versions of the approved-payment processing; HandleWebhook picks one according to the switch
  const naive = new NaivePaymentSucceeded(orders, payments, sms, faults, logger);
  const idempotent = new IdempotentPaymentSucceeded(unitOfWork, processedEvents, orders, payments, sms, faults, logger);

  return {
    publishableKey: env.stripePublishableKey,
    catalog,
    createPayment: new CreatePayment(catalog, gateway, orders, settings),
    handleWebhook: new HandleWebhook(webhookVerifier, logger, settings, naive, idempotent),
    logger,
    settings,
    resetter: new SqliteDemoDataResetter(db),
    getLabState: new GetLabState(settings, orders, payments, sms, processedEvents),
    simulateWebhookDelivery: new SimulateWebhookDelivery(orders, webhookSimulator),
    // Reconciliation always uses the idempotent version: it is the safety net, it must not duplicate anything
    reconcilePayments: new ReconcilePayments(gateway, orders, idempotent, logger),
  };
}
