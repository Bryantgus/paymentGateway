import Stripe from 'stripe';
import { IdempotencyConflictError, PaymentGatewayError } from '../../application/errors';
import type {
  CreatedPayment,
  CreatePaymentInput,
  CreatePaymentOptions,
  PaymentGateway,
  SucceededPayment,
} from '../../application/ports/payment-gateway';
import { PRODUCT_METADATA_KEY } from './metadata';

const IN_USE_RETRIES = 3;
const IN_USE_WAIT_MS = 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class StripePaymentGateway implements PaymentGateway {
  constructor(private readonly stripe: Stripe) {}

  async createPayment(input: CreatePaymentInput, options: CreatePaymentOptions = {}): Promise<CreatedPayment> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: input.amount,
      currency: input.currency,
      automatic_payment_methods: { enabled: true },
      metadata: { [PRODUCT_METADATA_KEY]: input.productName },
    };
    // With a key, Stripe remembers the response for about 24 h: the same key and the same data return the same PaymentIntent.
    const requestOptions = options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined;

    for (let attempt = 1; ; attempt++) {
      try {
        const paymentIntent = await this.stripe.paymentIntents.create(params, requestOptions);
        return { paymentId: paymentIntent.id, clientSecret: paymentIntent.client_secret as string };
      } catch (err) {
        if (err instanceof Stripe.errors.StripeIdempotencyError) {
          // Two requests with the same key at once: the second waits for the first to finish and gets its response.
          if (err.code === 'idempotency_key_in_use' && attempt <= IN_USE_RETRIES) {
            await sleep(IN_USE_WAIT_MS);
            continue;
          }
          throw new IdempotencyConflictError(
            err.code === 'idempotency_key_in_use'
              ? 'Another request with the same key is still in progress. Try again in a moment'
              : 'That idempotency key was already used with different data'
          );
        }
        throw new PaymentGatewayError('Could not create the payment', err);
      }
    }
  }

  async listSucceededPayments(): Promise<SucceededPayment[]> {
    try {
      const { data } = await this.stripe.paymentIntents.list({ limit: 100 });
      return data
        .filter((pi) => pi.status === 'succeeded')
        .map((pi) => ({
          paymentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          productName: pi.metadata[PRODUCT_METADATA_KEY],
        }));
    } catch (err) {
      throw new PaymentGatewayError('Could not fetch the payments from the gateway', err);
    }
  }
}
