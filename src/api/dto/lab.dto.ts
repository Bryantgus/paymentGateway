import type { LabState } from '../../application/lab/get-lab-state';

/** HTTP contract of the lab (kept independent from the domain model, like the other DTOs). */
export function toLabStateDto(state: LabState) {
  return {
    settings: {
      idempotency: state.settings.idempotencyEnabled,
      faultRatePercent: state.settings.faultRatePercent,
    },
    orders: state.orders.map((o) => ({
      id: o.id,
      product: o.productName,
      amount: o.amount,
      status: o.status,
      paymentId: o.paymentId ?? null,
      key: o.idempotencyKey ?? null,
      createdAt: o.createdAt,
    })),
    charges: state.payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      paymentId: p.paymentId,
      amount: p.amount,
      createdAt: p.createdAt,
    })),
    sms: state.sms.map((s) => ({ id: s.id, orderId: s.orderId, message: s.message, sentAt: s.sentAt })),
    events: state.processedEvents,
  };
}
