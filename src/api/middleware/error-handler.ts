import type { ErrorRequestHandler } from 'express';
import { InvalidWebhookSignatureError, PaymentGatewayError, ProductNotFoundError } from '../../application/errors';
import type { Logger } from '../../application/ports/logger';

/** Único lugar donde los errores de la aplicación se convierten en respuestas HTTP. */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (err instanceof ProductNotFoundError) {
      res.status(400).json({ error: 'Producto inválido' });
      return;
    }
    if (err instanceof InvalidWebhookSignatureError) {
      logger.error('Firma de webhook inválida:', err);
      res.sendStatus(400);
      return;
    }
    if (err instanceof PaymentGatewayError) {
      logger.error('Error de la pasarela:', err.cause);
      res.status(500).json({ error: err.message });
      return;
    }
    logger.error('Error no controlado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  };
}
