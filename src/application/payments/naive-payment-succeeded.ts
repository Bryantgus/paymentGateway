import type { PaymentSucceededEvent } from '../../domain/payments/payment-event';
import type { FaultInjector } from '../ports/fault-injector';
import type { Logger } from '../ports/logger';
import type { OrderRepository } from '../ports/order-repository';
import type { PaymentRepository } from '../ports/payment-repository';
import type { SmsSender } from '../ports/sms-sender';
import { formatAmount, type PaymentSucceededProcessor } from './payment-succeeded-processor';

/**
 * VERSION WITH THE PROBLEM (the one used when idempotency is switched off).
 * It is the "obvious" handler: find the order, mark it paid, record the charge, send the SMS.
 *
 * Flaws it has, on purpose:
 *  1. It doesn't remember events: if the same event arrives twice, it does everything twice (2 charges, 2 SMS).
 *  2. It isn't atomic: if it fails halfway, you get a paid order without a recorded charge, or a charge without SMS.
 *  3. It swallows errors and answers 200: the gateway thinks everything went fine and does NOT retry,
 *     so a charged payment can stay unmarked as paid forever.
 */
export class NaivePaymentSucceeded implements PaymentSucceededProcessor {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentRepository,
    private readonly sms: SmsSender,
    private readonly faults: FaultInjector,
    private readonly logger: Logger
  ) {}

  async process(event: PaymentSucceededEvent): Promise<void> {
    try {
      const order = this.orders.findByPaymentId(event.paymentId);
      if (!order) {
        this.logger.error(`Order not found for ${event.paymentId}; the event is ignored`);
        return;
      }

      this.orders.markPaid(order.id);
      this.faults.maybeFail('after-marking-paid');

      this.payments.insert({
        orderId: order.id,
        paymentId: event.paymentId,
        amount: event.amount,
        currency: event.currency,
      });
      this.faults.maybeFail('after-recording-payment');

      await this.sms.send(order.id, `We received your payment of ${formatAmount(event.amount, event.currency)}. Thank you!`);
    } catch (err) {
      this.logger.error(`Error processing ${event.eventId} (answering 200 anyway):`, err);
    }
  }
}
