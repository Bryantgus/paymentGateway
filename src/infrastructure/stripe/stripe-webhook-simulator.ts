import type Stripe from 'stripe';
import { PaymentGatewayError } from '../../application/errors';
import type { SimulatedPaymentSucceeded, WebhookSimulator } from '../../application/ports/webhook-simulator';
import { PRODUCT_METADATA_KEY } from './metadata';

/**
 * Makes a real HTTP request to our own `/webhook`, with a `payment_intent.succeeded` event signed
 * with the webhook secret. It follows the same path as a Stripe notice (signature, handler, HTTP response).
 */
export class StripeWebhookSimulator implements WebhookSimulator {
  constructor(
    private readonly stripe: Stripe,
    private readonly webhookSecret: string | undefined,
    private readonly webhookUrl: string
  ) {}

  async deliver(event: SimulatedPaymentSucceeded, times: number): Promise<number[]> {
    const secret = this.webhookSecret;
    if (!secret) throw new PaymentGatewayError('Set STRIPE_WEBHOOK_SECRET in .env to simulate webhooks');

    const body = JSON.stringify({
      id: event.eventId,
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: event.paymentId,
          object: 'payment_intent',
          amount: event.amount,
          currency: event.currency,
          metadata: { [PRODUCT_METADATA_KEY]: event.productName },
        },
      },
    });

    const deliverOnce = async (): Promise<number> => {
      const signature = this.stripe.webhooks.generateTestHeaderString({ payload: body, secret });
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'stripe-signature': signature },
        body,
      });
      return res.status;
    };

    // All at once: this shows what happens when two deliveries of the same event coincide.
    return Promise.all(Array.from({ length: times }, deliverOnce));
  }
}
