import type { PaymentSucceededProcessor } from '../payments/payment-succeeded-processor';
import type { DemoSettingsStore } from '../ports/demo-settings';
import type { Logger } from '../ports/logger';
import type { WebhookVerifier } from '../ports/webhook-verifier';

/** Use case: receive a webhook from the gateway and react to the payment result. */
export class HandleWebhook {
  constructor(
    private readonly verifier: WebhookVerifier,
    private readonly logger: Logger,
    private readonly settings: DemoSettingsStore,
    private readonly naive: PaymentSucceededProcessor,
    private readonly idempotent: PaymentSucceededProcessor
  ) {}

  async execute(rawBody: Buffer, signature: string | undefined): Promise<void> {
    const event = this.verifier.verify(rawBody, signature);

    switch (event.type) {
      case 'payment.succeeded': {
        this.logger.info(
          `✅ Payment approved ${event.paymentId} - ${event.amount / 100} ${event.currency.toUpperCase()} (${event.productName ?? 'no product'}) [${event.eventId}]`
        );
        const processor = this.settings.get().idempotencyEnabled ? this.idempotent : this.naive;
        await processor.process(event);
        break;
      }
      case 'payment.failed':
        this.logger.info(`❌ Payment failed ${event.paymentId}: ${event.reason}`);
        break;
      case 'unhandled':
        this.logger.info(`Event received: ${event.gatewayType}`);
        break;
    }
  }
}
