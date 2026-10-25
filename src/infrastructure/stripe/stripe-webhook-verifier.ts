import type Stripe from 'stripe';
import { InvalidWebhookSignatureError } from '../../application/errors';
import type { WebhookVerifier } from '../../application/ports/webhook-verifier';
import type { PaymentEvent } from '../../domain/payments/payment-event';
import { PRODUCT_METADATA_KEY } from './metadata';

export class StripeWebhookVerifier implements WebhookVerifier {
  constructor(
    private readonly stripe: Stripe,
    private readonly webhookSecret: string | undefined
  ) {}

  verify(rawBody: Buffer, signature: string | undefined): PaymentEvent {
    if (!this.webhookSecret) {
      throw new InvalidWebhookSignatureError('STRIPE_WEBHOOK_SECRET no está configurado');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature ?? '', this.webhookSecret);
    } catch (err) {
      throw new InvalidWebhookSignatureError(err instanceof Error ? err.message : 'Firma inválida');
    }
    return toPaymentEvent(event);
  }
}

/** Traduce un evento de Stripe a nuestro dominio. Los eventos nuevos (reembolsos, disputas) se agregan aquí. */
function toPaymentEvent(event: Stripe.Event): PaymentEvent {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      return {
        type: 'payment.succeeded',
        paymentId: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        productName: pi.metadata[PRODUCT_METADATA_KEY],
      };
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      return {
        type: 'payment.failed',
        paymentId: pi.id,
        reason: pi.last_payment_error?.message ?? 'desconocido',
      };
    }
    default:
      return { type: 'unhandled', gatewayType: event.type };
  }
}
