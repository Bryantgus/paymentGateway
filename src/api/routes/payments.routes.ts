import { Router } from 'express';
import type { CreatePayment } from '../../application/payments/create-payment';
import { asyncHandler } from '../middleware/async-handler';

interface PaymentsRoutesDeps {
  createPayment: CreatePayment;
}

export function paymentsRoutes({ createPayment }: PaymentsRoutesDeps): Router {
  const router = Router();

  router.post(
    '/crear-pago',
    asyncHandler(async (req, res) => {
      const productId = typeof req.body?.producto === 'string' ? req.body.producto : '';
      const { clientSecret } = await createPayment.execute(productId);
      res.json({ clientSecret });
    })
  );

  return router;
}
