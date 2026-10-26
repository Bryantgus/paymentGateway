import { OrderNotFoundError, PaymentGatewayError } from '../errors';
import type { OrderRepository } from '../ports/order-repository';
import type { WebhookSimulator } from '../ports/webhook-simulator';

/**
 * Use case: simulate the gateway reporting an order's payment, without paying with a card.
 * With `times` > 1 it imitates duplicate delivery (the gateway guarantees "at least once", not "exactly once").
 */
export class SimulateWebhookDelivery {
  constructor(
    private readonly orders: OrderRepository,
    private readonly simulator: WebhookSimulator
  ) {}

  /** Returns the HTTP status the webhook answered for each delivery. */
  async execute(orderId: number, times: number): Promise<number[]> {
    const order = this.orders.findById(orderId);
    if (!order) throw new OrderNotFoundError(`order ${orderId}`);
    if (!order.paymentId) throw new PaymentGatewayError('The order does not have a payment created yet');

    return this.simulator.deliver(
      {
        // Fixed per order: delivering it again is equivalent to the gateway retrying the same event.
        eventId: `evt_sim_${order.id}`,
        paymentId: order.paymentId,
        amount: order.amount,
        currency: order.currency,
        productName: order.productName,
      },
      times
    );
  }
}
