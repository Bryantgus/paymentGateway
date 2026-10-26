import { Router } from 'express';
import type { CreatePayment } from '../../application/payments/create-payment';
import { asyncHandler } from '../middleware/async-handler';

interface PaymentsRoutesDeps {
  createPayment: CreatePayment;
}

export function paymentsRoutes({ createPayment }: PaymentsRoutesDeps): Router {
  const router = Router();

  router.post(
    '/create-payment',
    asyncHandler(async (req, res) => {
      const productId = typeof req.body?.product === 'string' ? req.body.product : '';
      // The client generates the key, one per purchase attempt, and sends it in a header (Stripe's and other APIs' convention)
      const idempotencyKey = req.header('Idempotency-Key');
      const { clientSecret } = await createPayment.execute(productId, idempotencyKey);
      res.json({ clientSecret });
    })
  );

  return router;
}
