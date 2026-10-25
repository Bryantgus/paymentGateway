import express from 'express';
import path from 'path';
import { configRoutes } from './api/routes/config.routes';
import { paymentsRoutes } from './api/routes/payments.routes';
import { webhookRoutes } from './api/routes/webhook.routes';
import { createErrorHandler } from './api/middleware/error-handler';
import type { CreatePayment } from './application/payments/create-payment';
import type { Logger } from './application/ports/logger';
import type { ProductCatalog } from './application/ports/product-catalog';
import type { HandleWebhook } from './application/webhooks/handle-webhook';

/** Lo que la capa HTTP necesita para funcionar. Lo arma la raíz de composición (o una prueba, con dobles). */
export interface AppDependencies {
  publishableKey: string;
  catalog: ProductCatalog;
  createPayment: CreatePayment;
  handleWebhook: HandleWebhook;
  logger: Logger;
}

/** Construye la app Express sin ponerla a escuchar, para poder probarla sin abrir un puerto. */
export function createApp(deps: AppDependencies): express.Express {
  const app = express();

  // El webhook va primero: necesita el body crudo, antes de express.json()
  app.use(webhookRoutes(deps));

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(configRoutes(deps));
  app.use(paymentsRoutes(deps));

  app.use(createErrorHandler(deps.logger));
  return app;
}
