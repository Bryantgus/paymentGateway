import type { Logger } from '../ports/logger';
import type { WebhookVerifier } from '../ports/webhook-verifier';

/** Caso de uso: recibir un webhook de la pasarela y reaccionar al resultado del pago. */
export class HandleWebhook {
  constructor(
    private readonly verifier: WebhookVerifier,
    private readonly logger: Logger
  ) {}

  execute(rawBody: Buffer, signature: string | undefined): void {
    const event = this.verifier.verify(rawBody, signature);

    switch (event.type) {
      case 'payment.succeeded':
        this.logger.info(
          `✅ Pago aprobado ${event.paymentId} - ${event.amount / 100} ${event.currency.toUpperCase()} (${event.productName ?? 'sin producto'})`
        );
        // Aquí marcarías la orden como pagada en tu base de datos.
        break;
      case 'payment.failed':
        this.logger.info(`❌ Pago fallido ${event.paymentId}: ${event.reason}`);
        break;
      case 'unhandled':
        this.logger.info(`Evento recibido: ${event.gatewayType}`);
        break;
    }
  }
}
