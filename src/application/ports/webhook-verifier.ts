import type { PaymentEvent } from '../../domain/payments/payment-event';

/** Comprueba que un webhook es auténtico y lo traduce a un evento de nuestro dominio. */
export interface WebhookVerifier {
  /** @throws InvalidWebhookSignatureError si la firma no es válida. */
  verify(rawBody: Buffer, signature: string | undefined): PaymentEvent;
}
