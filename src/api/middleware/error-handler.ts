import type { ErrorRequestHandler } from 'express';
import {
  IdempotencyConflictError,
  InjectedFaultError,
  InvalidIdempotencyKeyError,
  InvalidWebhookSignatureError,
  OrderNotFoundError,
  PaymentGatewayError,
  ProductNotFoundError,
} from '../../application/errors';
import type { Logger } from '../../application/ports/logger';

/** The only place where application errors are turned into HTTP responses. */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (err instanceof ProductNotFoundError) {
      res.status(400).json({ error: 'Invalid product' });
      return;
    }
    if (err instanceof InvalidIdempotencyKeyError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof IdempotencyConflictError) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err instanceof InvalidWebhookSignatureError) {
      logger.error('Invalid webhook signature:', err);
      res.sendStatus(400);
      return;
    }
    if (err instanceof OrderNotFoundError) {
      // For a webhook, any non-2xx status makes the gateway retry later.
      logger.info(`⏳ ${err.message}; answering 404 so the gateway retries`);
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof InjectedFaultError) {
      logger.info(`💥 ${err.message}; answering 500 so the gateway retries`);
      res.status(500).json({ error: err.message });
      return;
    }
    if (err instanceof PaymentGatewayError) {
      logger.error('Gateway error:', err.cause ?? err);
      res.status(500).json({ error: err.message });
      return;
    }
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  };
}
