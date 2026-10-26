import { Router } from 'express';
import type { GetLabState } from '../../application/lab/get-lab-state';
import type { SimulateWebhookDelivery } from '../../application/lab/simulate-webhook-delivery';
import type { ReconcilePayments } from '../../application/payments/reconcile-payments';
import type { DemoDataResetter } from '../../application/ports/demo-data-resetter';
import type { DemoSettings, DemoSettingsStore } from '../../application/ports/demo-settings';
import { toLabStateDto } from '../dto/lab.dto';
import { asyncHandler } from '../middleware/async-handler';

interface SimulationRoutesDeps {
  settings: DemoSettingsStore;
  resetter: DemoDataResetter;
  getLabState: GetLabState;
  simulateWebhookDelivery: SimulateWebhookDelivery;
  reconcilePayments: ReconcilePayments;
}

/** Endpoints of the idempotency lab: see the state, change settings and trigger the problems at will. */
export function simulationRoutes(deps: SimulationRoutesDeps): Router {
  const router = Router();

  router.get('/simulation/state', (_req, res) => {
    res.json(toLabStateDto(deps.getLabState.execute()));
  });

  router.put('/simulation/settings', (req, res) => {
    const patch: Partial<DemoSettings> = {};
    if (typeof req.body?.idempotency === 'boolean') patch.idempotencyEnabled = req.body.idempotency;
    if (typeof req.body?.faultRatePercent === 'number') {
      patch.faultRatePercent = Math.min(100, Math.max(0, Math.round(req.body.faultRatePercent)));
    }
    deps.settings.update(patch);
    res.json(toLabStateDto(deps.getLabState.execute()).settings);
  });

  router.post(
    '/simulation/orders/:id/webhook',
    asyncHandler(async (req, res) => {
      const orderId = Number(req.params.id);
      const times = Math.min(5, Math.max(1, Math.round(Number(req.body?.times) || 1)));
      const responses = await deps.simulateWebhookDelivery.execute(orderId, times);
      res.json({ responses });
    })
  );

  router.post(
    '/simulation/reconcile',
    asyncHandler(async (_req, res) => {
      const { found, fixed, failed } = await deps.reconcilePayments.execute();
      res.json({ found, fixed, failed });
    })
  );

  router.post('/simulation/reset', (_req, res) => {
    deps.resetter.reset();
    res.sendStatus(204);
  });

  return router;
}
