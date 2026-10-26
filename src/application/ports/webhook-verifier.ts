import type { PaymentEvent } from '../../domain/payments/payment-event';

/** Checks that a webhook is authentic and translates it into an event of our domain. */
export interface WebhookVerifier {
  /** @throws InvalidWebhookSignatureError if the signature is not valid. */
  verify(rawBody: Buffer, signature: string | undefined): PaymentEvent;
}
