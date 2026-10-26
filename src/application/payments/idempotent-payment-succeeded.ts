import type { PaymentSucceededEvent } from '../../domain/payments/payment-event';
import { OrderNotFoundError } from '../errors';
import type { FaultInjector } from '../ports/fault-injector';
import type { Logger } from '../ports/logger';
import type { OrderRepository } from '../ports/order-repository';
import type { PaymentRepository } from '../ports/payment-repository';
import type { ProcessedEventStore } from '../ports/processed-event-store';
import type { SmsSender } from '../ports/sms-sender';
import type { UnitOfWork } from '../ports/unit-of-work';
import { formatAmount, type PaymentSucceededProcessor } from './payment-succeeded-processor';

type Outcome = 'recorded' | 'duplicate' | 'already-paid';

/**
 * THE FIX. Each flaw of `NaivePaymentSucceeded` is solved like this:
 *  1. Repeated events: the `eventId` is reserved inside the transaction; if it was already there, nothing is done.
 *  2. Halfway failures: marking the order, recording the charge and reserving the event go in ONE transaction.
 *     If anything fails nothing is saved (not even the event reservation), so the retry starts clean.
 *  3. Errors: they propagate (the webhook answers 500) so the gateway retries.
 *  Also, `markPaid` only changes a `pending` order: if another path (reconciliation, for example)
 *  already paid it with a different event, this one doesn't record the charge or send the SMS again.
 */
export class IdempotentPaymentSucceeded implements PaymentSucceededProcessor {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly events: ProcessedEventStore,
    private readonly orders: OrderRepository,
    private readonly payments: PaymentRepository,
    private readonly sms: SmsSender,
    private readonly faults: FaultInjector,
    private readonly logger: Logger
  ) {}

  async process(event: PaymentSucceededEvent): Promise<void> {
    let orderId = 0;

    const outcome = this.unitOfWork.run((): Outcome => {
      if (!this.events.reserve(event.eventId)) return 'duplicate';

      const order = this.orders.findByPaymentId(event.paymentId);
      // The notice may arrive before the order is saved: fail so that it gets retried.
      if (!order) throw new OrderNotFoundError(event.paymentId);
      orderId = order.id;

      if (!this.orders.markPaid(order.id)) return 'already-paid';
      this.faults.maybeFail('after-marking-paid');

      this.payments.insert({
        orderId: order.id,
        paymentId: event.paymentId,
        amount: event.amount,
        currency: event.currency,
      });
      this.faults.maybeFail('after-recording-payment');

      return 'recorded';
    });

    if (outcome === 'duplicate') {
      this.logger.info(`🔁 Event ${event.eventId} is a duplicate: already processed, nothing to do`);
      return;
    }
    if (outcome === 'already-paid') {
      this.logger.info(`🔁 The order for ${event.paymentId} was already paid: the charge and the SMS are not repeated`);
      return;
    }

    // The SMS goes after the transaction commits: it can't be undone, so it is only sent if everything was saved.
    try {
      await this.sms.send(orderId, `We received your payment of ${formatAmount(event.amount, event.currency)}. Thank you!`);
    } catch (err) {
      // The charge is already saved; failing here would make the gateway retry an event that was already recorded.
      this.logger.error(`Could not send the SMS for order ${orderId}:`, err);
    }
  }
}
