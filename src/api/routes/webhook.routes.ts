import express, { Router } from 'express';
import type { HandleWebhook } from '../../application/webhooks/handle-webhook';
import { asyncHandler } from '../middleware/async-handler';

interface WebhookRoutesDeps {
  handleWebhook: HandleWebhook;
}

/**
 * Needs the raw (unparsed) body to verify the signature,
 * so these routes must be mounted before `express.json()`.
 *
 * Answers 200 only when the event has been handled. If anything fails, the error reaches the middleware
 * and answers 4xx/5xx: that is how the gateway knows it must retry.
 */
export function webhookRoutes({ handleWebhook }: WebhookRoutesDeps): Router {
  const router = Router();

  router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    asyncHandler(async (req, res) => {
      await handleWebhook.execute(req.body, req.header('stripe-signature'));
      res.sendStatus(200);
    })
  );

  return router;
}
