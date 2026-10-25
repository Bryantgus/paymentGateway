import type Stripe from 'stripe';
import { PaymentGatewayError } from '../../application/errors';
import type { CreatedPayment, CreatePaymentInput, PaymentGateway } from '../../application/ports/payment-gateway';
import { PRODUCT_METADATA_KEY } from './metadata';

export class StripePaymentGateway implements PaymentGateway {
  constructor(private readonly stripe: Stripe) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: input.amount,
        currency: input.currency,
        automatic_payment_methods: { enabled: true },
        metadata: { [PRODUCT_METADATA_KEY]: input.productName },
      });
      return { clientSecret: paymentIntent.client_secret as string };
    } catch (err) {
      throw new PaymentGatewayError('No se pudo crear el pago', err);
    }
  }
}
