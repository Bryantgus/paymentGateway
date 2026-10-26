import express from 'express';
import path from 'path';
import { configRoutes } from './api/routes/config.routes';
import { paymentsRoutes } from './api/routes/payments.routes';
import { simulationRoutes } from './api/routes/simulation.routes';
import { webhookRoutes } from './api/routes/webhook.routes';
import { createErrorHandler } from './api/middleware/error-handler';
import type { GetLabState } from './application/lab/get-lab-state';
import type { SimulateWebhookDelivery } from './application/lab/simulate-webhook-delivery';
import type { CreatePayment } from './application/payments/create-payment';
import type { ReconcilePayments } from './application/payments/reconcile-payments';
import type { DemoDataResetter } from './application/ports/demo-data-resetter';
import type { DemoSettingsStore } from './application/ports/demo-settings';
import type { Logger } from './application/ports/logger';
import type { ProductCatalog } from './application/ports/product-catalog';
import type { HandleWebhook } from './application/webhooks/handle-webhook';

/** What the HTTP layer needs to work. The composition root builds it (or a test does, with doubles). */
export interface AppDependencies {
  publishableKey: string;
  catalog: ProductCatalog;
  createPayment: CreatePayment;
  handleWebhook: HandleWebhook;
  logger: Logger;
  // Idempotency lab
  settings: DemoSettingsStore;
  resetter: DemoDataResetter;
  getLabState: GetLabState;
  simulateWebhookDelivery: SimulateWebhookDelivery;
  reconcilePayments: ReconcilePayments;
}

/** Builds the Express app without listening, so it can be tested without opening a port. */
export function createApp(deps: AppDependencies): express.Express {
  const app = express();

  // The webhook goes first: it needs the raw body, before express.json()
  app.use(webhookRoutes(deps));

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(configRoutes(deps));
  app.use(paymentsRoutes(deps));
  app.use(simulationRoutes(deps));

  app.use(createErrorHandler(deps.logger));
  return app;
}
