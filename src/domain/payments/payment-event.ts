/**
 * Facts the gateway tells us about a payment, expressed in our own vocabulary.
 * The infrastructure translates Stripe events into these types, so the rest of the code never knows about Stripe.
 *
 * `eventId` identifies the EVENT (not the payment): the gateway may deliver the same event several times,
 * and this id is what lets us recognize it.
 */
export type PaymentEvent =
  | {
      type: 'payment.succeeded';
      eventId: string;
      paymentId: string;
      /** In cents. */
      amount: number;
      currency: string;
      productName?: string;
    }
  | { type: 'payment.failed'; eventId: string; paymentId: string; reason: string }
  // An event we don't handle yet (refunds, disputes...). New ones will be added here.
  | { type: 'unhandled'; eventId: string; gatewayType: string };

export type PaymentSucceededEvent = Extract<PaymentEvent, { type: 'payment.succeeded' }>;
