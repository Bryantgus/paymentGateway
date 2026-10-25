import express, { Router } from 'express';
import type { HandleWebhook } from '../../application/webhooks/handle-webhook';

interface WebhookRoutesDeps {
  handleWebhook: HandleWebhook;
}

/**
 * Necesita el body crudo (sin parsear) para verificar la firma,
 * por eso estas rutas deben montarse antes de `express.json()`.
 */
export function webhookRoutes({ handleWebhook }: WebhookRoutesDeps): Router {
  const router = Router();

  router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    handleWebhook.execute(req.body, req.header('stripe-signature'));
    res.sendStatus(200);
  });

  return router;
}
