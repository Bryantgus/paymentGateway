import type { Logger } from '../ports/logger';
import type { OrderRepository } from '../ports/order-repository';
import type { PaymentGateway } from '../ports/payment-gateway';
import type { PaymentSucceededProcessor } from './payment-succeeded-processor';

export interface ReconciliationResult {
  /** Orders the gateway charged and we still had as pending. */
  found: number;
  fixed: number;
  failed: number;
}

/**
 * Safety net: compares what the gateway charged with what we recorded and fixes the difference.
 * Webhooks can get lost (server down, failures, exhausted retries); this covers them.
 * It always uses the idempotent processing, so it can be run as many times as needed.
 */
export class ReconcilePayments {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly orders: OrderRepository,
    private readonly processor: PaymentSucceededProcessor,
    private readonly logger: Logger
  ) {}

  async execute(): Promise<ReconciliationResult> {
    const result: ReconciliationResult = { found: 0, fixed: 0, failed: 0 };

    for (const payment of await this.gateway.listSucceededPayments()) {
      const order = this.orders.findByPaymentId(payment.paymentId);
      if (!order || order.status === 'paid') continue;
      result.found++;

      try {
        await this.processor.process({
          type: 'payment.succeeded',
          // Reconciliation's own id: a payment is never fixed twice through this path.
          eventId: `reconciliation_${payment.paymentId}`,
          paymentId: payment.paymentId,
          amount: payment.amount,
          currency: payment.currency,
          productName: payment.productName,
        });
        result.fixed++;
      } catch (err) {
        result.failed++;
        this.logger.error(`Could not reconcile ${payment.paymentId}:`, err);
      }
    }

    this.logger.info(`Reconciliation: ${result.found} pending, ${result.fixed} fixed, ${result.failed} failed`);
    return result;
  }
}
