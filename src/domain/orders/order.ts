export type OrderStatus = 'pending' | 'paid';

/** An order: what the customer is trying to buy. It becomes `paid` once the gateway confirms the charge. */
export interface Order {
  id: number;
  productName: string;
  /** In cents. */
  amount: number;
  currency: string;
  status: OrderStatus;
  /** Payment id in the gateway. Empty until the payment is created. */
  paymentId?: string;
  /** Idempotency key it was created with (only if idempotency was enabled). */
  idempotencyKey?: string;
  createdAt: string;
}
